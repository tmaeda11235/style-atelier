import React from "react"

import { P2PConnection } from "./p2p-connection"
import type {
  HostConnectionParams,
  SyncStateUpdater
} from "./p2p-connection-helpers"
import { WebSocketSignalingChannel } from "./p2p-signaling"
import { decryptSyncData, mergeIncomingSyncData } from "./p2p-sync-manager"

async function handleReceivedDataAndMerge(
  encryptedPayload: string,
  key: string,
  t: any,
  updateState: SyncStateUpdater,
  handleError: (err: Error) => void
) {
  updateState({
    status: "syncing",
    statusMessage: t?.receiving || "Receiving and decrypting data..."
  })
  try {
    const decrypted = await decryptSyncData(encryptedPayload, key)
    const mergeResult = await mergeIncomingSyncData(decrypted)
    if (mergeResult.success) {
      updateState({
        status: "success",
        statusMessage: t?.syncSuccess || "Sync completed successfully!",
        processedCount: {
          cards: mergeResult.cardsCount,
          categories: mergeResult.categoriesCount
        }
      })
    } else {
      throw new Error("Merge failed")
    }
  } catch (err: any) {
    handleError(err)
  }
}

async function runHostRelayPolling(
  getUrl: string,
  key: string,
  t: any,
  updateState: SyncStateUpdater,
  handleError: (err: Error) => void,
  onSuccess: () => void
) {
  try {
    const res = await fetch(getUrl)
    if (res.ok) {
      const result = await res.json()
      if (result.data) {
        onSuccess()
        updateState({
          status: "relay-syncing",
          statusMessage: t?.receiving || "Receiving and decrypting data..."
        })

        const decrypted = await decryptSyncData(result.data, key)
        const mergeResult = await mergeIncomingSyncData(decrypted)
        if (mergeResult.success) {
          updateState({
            status: "success",
            statusMessage: t?.syncSuccess || "Sync completed successfully!",
            processedCount: {
              cards: mergeResult.cardsCount,
              categories: mergeResult.categoriesCount
            }
          })
        } else {
          throw new Error("Merge failed")
        }
      }
    }
  } catch (err: any) {
    onSuccess()
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
        statusMessage: this.t?.connected || "Device connected. Ready to sync."
      })
    } else if (s.startsWith("connection-state-failed")) {
      if (!this.isWebRTCOpen) {
        this.triggerRelayFallback()
      }
    }
  }

  private async handleMessage(payload: string) {
    this.isWebRTCOpen = true
    clearTimeout(this.timeoutId)
    if (this.pollInterval) clearInterval(this.pollInterval)
    await handleReceivedDataAndMerge(
      payload,
      this.key,
      this.t,
      this.updateState,
      this.handleError
    )
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
        "WebRTC connection timeout. Waiting for relay data..."
    })

    try {
      const urlObj = new URL(this.wsUrl.replace(/^ws/, "http"))
      const roomId = urlObj.searchParams.get("roomId") || ""
      const getUrl = `${urlObj.origin}/api/sync/${roomId}`

      this.pollInterval = setInterval(() => {
        runHostRelayPolling(
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
      }, 2000)
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
