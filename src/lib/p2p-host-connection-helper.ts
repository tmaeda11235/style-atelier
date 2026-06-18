import React from "react"

import { P2PConnection } from "./p2p-connection"
import type {
  HostConnectionParams,
  SyncStateUpdater
} from "./p2p-connection-helpers"
import { runHostRelayPolling } from "./p2p-host-relay-helper"
import { WebSocketSignalingChannel } from "./p2p-signaling"
import {
  decryptSyncData,
  getLocalImagesMetadata,
  mergeIncomingSyncData,
  saveIncomingImage,
  scanLocalImages
} from "./p2p-sync-manager"

interface ReceiveFileState {
  filePath: string
  size: number
  hash: string
  receivedSize: number
  chunks: ArrayBuffer[]
}

async function handleReceivedDataAndMerge(
  encryptedPayload: string,
  key: string,
  t: any,
  updateState: SyncStateUpdater,
  handleError: (err: Error) => void
) {
  updateState({
    status: "syncing",
    statusMessage: t?.receiving || "Receiving and decrypting data...",
    syncProgress: { phase: 1 }
  })
  try {
    const decrypted = await decryptSyncData(encryptedPayload, key)
    const mergeResult = await mergeIncomingSyncData(decrypted)
    if (mergeResult.success) {
      updateState({
        status: "syncing",
        statusMessage: "DB synced. Waiting for image sync...",
        processedCount: {
          cards: mergeResult.cardsCount,
          categories: mergeResult.categoriesCount
        },
        syncProgress: { phase: 2 }
      })
    } else {
      throw new Error("Merge failed")
    }
  } catch (err: any) {
    handleError(err)
  }
}

class HostConnectionInitiator {
  private wsUrl: string
  private key: string
  private t: any
  private updateState: SyncStateUpdater
  private handleError: (err: Error) => void
  private connectionRef: React.MutableRefObject<P2PConnection | null>

  private sigChannel: WebSocketSignalingChannel
  private isWebRTCOpen = false
  private pollInterval: any = null
  private isRelayTriggered = false
  private timeoutId: any = null

  private currentFile: ReceiveFileState | null = null

  constructor(params: HostConnectionParams) {
    this.wsUrl = params.wsUrl
    this.key = params.key
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
      isHost: true,
      onStatusChange: (s) => this.handleStatusChange(s),
      onMessageReceived: (payload) => this.handleMessage(payload),
      onError: (err) => this.handleErrorEvent(err)
    })

    const originalClose = this.connectionRef.current.close.bind(
      this.connectionRef.current
    )
    this.connectionRef.current.close = () => {
      this.cleanup()
      originalClose()
    }
  }

  private handleStatusChange(s: string) {
    if (s === "datachannel-open") {
      this.isWebRTCOpen = true
      clearTimeout(this.timeoutId)
      this.updateState({
        status: "connected",
        statusMessage: this.t?.connected || "Device connected. Ready to sync.",
        syncProgress: { phase: 1 }
      })
    } else if (s.startsWith("connection-state-failed")) {
      if (!this.isWebRTCOpen) {
        this.triggerRelayFallback()
      }
    }
  }

  /* eslint-disable-next-line max-lines-per-function */
  private async handleStringMessage(payload: string) {
    try {
      const msg = JSON.parse(payload)
      if (msg.type === "DIFF_CHECK") {
        await this.handleWebRtcDiffCheck(msg.files || [])
        return
      }
      if (msg.type === "FILE_START") {
        this.currentFile = {
          filePath: msg.filePath,
          size: msg.size,
          hash: msg.hash,
          receivedSize: 0,
          chunks: []
        }
        this.updateState({
          status: "syncing",
          statusMessage: `Receiving image: ${msg.filePath}`,
          syncProgress: {
            phase: 3,
            currentImageIndex: msg.index,
            totalImages: msg.total
          }
        })
        return
      }
      if (msg.type === "FILE_END") {
        if (this.currentFile) {
          const combined = this.combineChunks(this.currentFile.chunks)
          await saveIncomingImage(
            this.currentFile.filePath,
            combined,
            this.currentFile.hash
          )
          this.currentFile = null
        }
        return
      }
      if (msg.type === "SYNC_COMPLETE") {
        this.updateState({
          status: "success",
          statusMessage: this.t?.syncSuccess || "Sync completed successfully!",
          syncProgress: undefined
        })
        return
      }
    } catch {
      // Ignore JSON parse errors for non-JSON payloads
    }
    await handleReceivedDataAndMerge(
      payload,
      this.key,
      this.t,
      this.updateState,
      this.handleError
    )
  }

  private async handleMessage(payload: string | ArrayBuffer) {
    this.isWebRTCOpen = true
    clearTimeout(this.timeoutId)
    if (this.pollInterval) clearInterval(this.pollInterval)

    if (typeof payload === "string") {
      await this.handleStringMessage(payload)
    } else {
      // バイナリチャンク (ArrayBuffer)
      if (this.currentFile) {
        this.currentFile.chunks.push(payload)
        this.currentFile.receivedSize += payload.byteLength
      }
    }
  }

  private async handleWebRtcDiffCheck(
    files: Array<{ filePath: string; hash: string }>
  ) {
    try {
      this.updateState({
        status: "syncing",
        statusMessage: "Comparing image differences...",
        syncProgress: { phase: 2 }
      })
      await scanLocalImages()
      const localMetadata = await getLocalImagesMetadata()
      const localMap = new Map(localMetadata.map((m) => [m.filePath, m.hash]))

      const missingFiles: string[] = []
      for (const f of files) {
        if (!localMap.has(f.filePath) || localMap.get(f.filePath) !== f.hash) {
          missingFiles.push(f.filePath)
        }
      }

      if (this.connectionRef.current) {
        this.connectionRef.current.send(
          JSON.stringify({
            type: "DIFF_CHECK_RESPONSE",
            missingFiles
          })
        )
      }
    } catch (err: any) {
      this.handleError(err)
    }
  }

  private combineChunks(chunks: ArrayBuffer[]): ArrayBuffer {
    const totalLength = chunks.reduce((acc, c) => acc + c.byteLength, 0)
    const combined = new Uint8Array(totalLength)
    let offset = 0
    for (const c of chunks) {
      combined.set(new Uint8Array(c), offset)
      offset += c.byteLength
    }
    return combined.buffer
  }

  private handleErrorEvent(err: Error) {
    if (!this.isWebRTCOpen) {
      this.triggerRelayFallback()
    } else {
      this.handleError(err)
    }
  }

  private triggerRelayFallback() {
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

    this.updateState({
      status: "relay-connecting",
      statusMessage:
        this.t?.relayConnecting ||
        "WebRTC connection timeout. Waiting for relay data...",
      syncProgress: { phase: 1 }
    })

    try {
      const urlObj = new URL(this.wsUrl.replace(/^ws/, "http"))
      const roomId = urlObj.searchParams.get("roomId") || ""
      const getUrl = `${urlObj.origin}/api/sync/${roomId}`

      this.pollInterval = runHostRelayPolling(
        getUrl,
        this.key,
        this.t,
        this.updateState,
        this.handleError,
        () => {
          if (this.pollInterval) {
            clearInterval(this.pollInterval)
            this.pollInterval = null
          }
        }
      )
    } catch (urlErr: any) {
      this.handleError(urlErr)
    }
  }

  private cleanup() {
    clearTimeout(this.timeoutId)
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
    }
  }
}

export function initHostConnection(params: HostConnectionParams) {
  const initiator = new HostConnectionInitiator(params)
  initiator.start()
}
