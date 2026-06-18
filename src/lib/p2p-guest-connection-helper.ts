import React from "react"

import { P2PConnection } from "./p2p-connection"
import type {
  GuestConnectionParams,
  SyncStateUpdater
} from "./p2p-connection-helpers"
import { WebSocketSignalingChannel } from "./p2p-signaling"
import { encryptSyncData, prepareOutgoingSyncData } from "./p2p-sync-manager"

async function executeGuestRelayFallback(
  wsUrl: string,
  key: string,
  t: any,
  updateState: SyncStateUpdater,
  handleError: (err: Error) => void
) {
  updateState({
    status: "relay-syncing",
    statusMessage:
      t?.relaySending || "WebRTC connection failed. Sending via relay server..."
  })

  try {
    const syncData = await prepareOutgoingSyncData()
    const encrypted = await encryptSyncData(syncData, key)

    const urlObj = new URL(wsUrl.replace(/^ws/, "http"))
    const roomId = urlObj.searchParams.get("roomId") || ""
    const postUrl = `${urlObj.origin}/api/sync/${roomId}`

    const res = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: encrypted })
    })

    if (res.ok) {
      updateState({
        status: "success",
        statusMessage: t?.syncSuccess || "Data synced successfully!"
      })
    } else {
      throw new Error("Relay server rejected sync payload")
    }
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
    updateState({
      status: "success",
      statusMessage: t?.syncSuccess || "Data synced successfully!"
    })
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
      onError: (err) => this.handleErrorEvent(err)
    })

    const originalClose = this.connectionRef.current.close.bind(
      this.connectionRef.current
    )
    this.connectionRef.current.close = () => {
      clearTimeout(this.timeoutId)
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

    await executeGuestRelayFallback(
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
