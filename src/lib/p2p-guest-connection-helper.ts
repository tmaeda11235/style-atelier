import React from "react"

import { computeHash } from "./db/migration-helpers"
import { P2PConnection } from "./p2p-connection"
import type {
  GuestConnectionParams,
  SyncStateUpdater
} from "./p2p-connection-helpers"
import { runGuestRelaySync } from "./p2p-guest-relay-helper"
import { WebSocketSignalingChannel } from "./p2p-signaling"
import {
  encryptSyncData,
  getLocalImagesMetadata,
  prepareOutgoingSyncData,
  readOpfsFileAsBlob,
  scanLocalImages
} from "./p2p-sync-manager"

async function sendSingleImageInChunks(
  connection: P2PConnection,
  filePath: string,
  t: any,
  index: number,
  totalFiles: number,
  updateState: SyncStateUpdater
): Promise<void> {
  updateState({
    status: "syncing",
    statusMessage: `${t?.sendingImages || "Sending images"} (${index + 1}/${totalFiles}): ${filePath}`
  })

  const blob = await readOpfsFileAsBlob(filePath)
  const buffer = await blob.arrayBuffer()
  const hash = await computeHash(buffer)

  connection.send(
    JSON.stringify({
      type: "FILE_START",
      filePath,
      size: buffer.byteLength,
      hash
    })
  )

  const chunkSize = 16384 // 16KB chunk size
  let offset = 0

  while (offset < buffer.byteLength) {
    if (connection.getBufferedAmount() > 65536) {
      await new Promise<void>((resolve) => {
        connection.setOnBufferedAmountLow(() => {
          connection.setOnBufferedAmountLow(null)
          resolve()
        })
      })
    }

    const chunk = buffer.slice(offset, offset + chunkSize)
    connection.send(chunk)
    offset += chunk.byteLength
  }

  connection.send(
    JSON.stringify({
      type: "FILE_END",
      filePath
    })
  )
}

async function sendImagesInChunks(
  connection: P2PConnection,
  missingFiles: string[],
  updateState: SyncStateUpdater,
  handleError: (err: Error) => void,
  t: any
): Promise<void> {
  try {
    const totalFiles = missingFiles.length
    for (let i = 0; i < totalFiles; i++) {
      await sendSingleImageInChunks(
        connection,
        missingFiles[i],
        t,
        i,
        totalFiles,
        updateState
      )
    }

    connection.send(JSON.stringify({ type: "SYNC_COMPLETE" }))

    updateState({
      status: "success",
      statusMessage: t?.syncSuccess || "Sync completed successfully!"
    })
  } catch (err: any) {
    handleError(err)
  }
}

// WebRTCでの画像同期フェーズ開始
async function startP2PImageSync(
  connection: P2PConnection,
  updateState: SyncStateUpdater,
  handleError: (err: Error) => void,
  t: any
) {
  try {
    updateState({
      status: "syncing",
      statusMessage: t?.scanningImages || "Scanning local images..."
    })

    await scanLocalImages()
    const localImages = await getLocalImagesMetadata()

    if (localImages.length === 0) {
      connection.send(JSON.stringify({ type: "SYNC_COMPLETE" }))
      updateState({
        status: "success",
        statusMessage: t?.syncSuccess || "Data synced successfully!"
      })
      return
    }

    updateState({
      status: "syncing",
      statusMessage: t?.checkingDiffs || "Comparing image list with host..."
    })

    connection.send(
      JSON.stringify({
        type: "DIFF_CHECK",
        files: localImages
      })
    )
  } catch (err: any) {
    handleError(err)
  }
}

async function sendGuestDataDirectly(
  connection: P2PConnection,
  key: string,
  t: any,
  updateState: SyncStateUpdater,
  handleError: (err: Error) => void
) {
  try {
    const syncData = await prepareOutgoingSyncData()
    const encrypted = await encryptSyncData(syncData, key)
    connection.send(encrypted)

    // DB送信完了後、画像同期を開始
    await startP2PImageSync(connection, updateState, handleError, t)
  } catch (err: any) {
    handleError(err)
  }
}

class GuestConnectionInitiator {
  private key: string
  private wsUrl: string
  private t: any
  private updateState: SyncStateUpdater
  private handleError: (err: Error) => void
  private connectionRef: React.MutableRefObject<P2PConnection | null>

  private sigChannel: WebSocketSignalingChannel
  private isWebRTCOpen = false
  private isRelayTriggered = false
  private timeoutId: any = null
  private relayPollInterval: NodeJS.Timeout | null = null

  constructor(params: GuestConnectionParams) {
    this.key = params.key
    this.wsUrl = params.wsUrl
    this.t = params.t
    this.updateState = params.updateState
    this.handleError = params.handleError
    this.connectionRef = params.connectionRef

    this.sigChannel = new WebSocketSignalingChannel(this.wsUrl)
  }

  public start() {
    this.timeoutId = setTimeout(() => {
      if (!this.isWebRTCOpen) {
        this.triggerRelayFallback()
      }
    }, 10000)

    this.connectionRef.current = new P2PConnection({
      signalingChannel: this.sigChannel,
      isHost: false,
      onStatusChange: (s) => this.handleStatusChange(s),
      onMessageReceived: (payload) => this.handleMessage(payload),
      onError: (err) => this.handleErrorEvent(err)
    })

    const originalClose = this.connectionRef.current.close.bind(
      this.connectionRef.current
    )
    this.connectionRef.current.close = () => {
      clearTimeout(this.timeoutId)
      if (this.relayPollInterval) {
        clearInterval(this.relayPollInterval)
      }
      originalClose()
    }
  }

  private async handleStatusChange(s: string) {
    if (s === "datachannel-open") {
      this.isWebRTCOpen = true
      clearTimeout(this.timeoutId)
      this.updateState({
        status: "syncing",
        statusMessage: this.t?.sending || "Encrypting and sending local data..."
      })
      if (this.connectionRef.current) {
        await sendGuestDataDirectly(
          this.connectionRef.current,
          this.key,
          this.t,
          this.updateState,
          this.handleError
        )
      }
    } else if (s.startsWith("connection-state-failed")) {
      if (!this.isWebRTCOpen) {
        await this.triggerRelayFallback()
      }
    }
  }

  private async handleMessage(payload: string | ArrayBuffer) {
    if (typeof payload === "string") {
      try {
        const msg = JSON.parse(payload)
        if (msg.type === "DIFF_CHECK_RESPONSE") {
          await sendImagesInChunks(
            this.connectionRef.current!,
            msg.missingFiles || [],
            this.updateState,
            this.handleError,
            this.t
          )
        }
      } catch {
        // Ignore JSON parse errors for non-JSON payloads
      }
    }
  }

  private handleErrorEvent(err: Error) {
    if (!this.isWebRTCOpen) {
      this.triggerRelayFallback()
    } else {
      this.handleError(err)
    }
  }

  private async triggerRelayFallback() {
    if (this.isRelayTriggered) return
    this.isRelayTriggered = true

    console.log(
      "[P2PSync] WebRTC connection failed. Falling back to relay sync..."
    )

    clearTimeout(this.timeoutId)
    if (this.connectionRef.current) {
      this.connectionRef.current.close()
      this.connectionRef.current = null
    }

    this.relayPollInterval = await runGuestRelaySync(
      this.wsUrl,
      this.key,
      this.t,
      this.updateState,
      this.handleError
    )
  }
}

export function initGuestConnection(params: GuestConnectionParams) {
  const initiator = new GuestConnectionInitiator(params)
  initiator.start()
}
