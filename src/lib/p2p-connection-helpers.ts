import React from "react"

import { P2PConnection } from "./p2p-connection"
import { WebSocketSignalingChannel } from "./p2p-signaling"
import {
  decryptSyncData,
  encryptSyncData,
  mergeIncomingSyncData,
  prepareOutgoingSyncData
} from "./p2p-sync-manager"

export type SyncStatus =
  | "setup"
  | "connecting"
  | "connected"
  | "syncing"
  | "success"
  | "error"
export type SyncRole = "idle" | "host" | "guest"

export interface SyncState {
  role: SyncRole
  status: SyncStatus
  statusMessage: string
  qrCodeDataUrl: string | null
  processedCount: { cards: number; categories: number }
  errorMessage: string
  isScanning: boolean
  scanInputUrl: string
}

export type SyncStateUpdater = (fields: Partial<SyncState>) => void

export interface HostConnectionParams {
  wsUrl: string
  key: string
  t: any
  updateState: SyncStateUpdater
  handleError: (err: Error) => void
  connectionRef: React.MutableRefObject<P2PConnection | null>
}

export function initHostConnection({
  wsUrl,
  key,
  t,
  updateState,
  handleError,
  connectionRef
}: HostConnectionParams) {
  const sigChannel = new WebSocketSignalingChannel(wsUrl)
  connectionRef.current = new P2PConnection({
    signalingChannel: sigChannel,
    isHost: true,
    onStatusChange: (s) => {
      if (s === "datachannel-open") {
        updateState({
          status: "connected",
          statusMessage: t?.connected || "Device connected. Ready to sync."
        })
      } else if (s.startsWith("connection-state-failed")) {
        handleError(new Error("P2P Connection failed"))
      }
    },
    onMessageReceived: async (encryptedPayload) => {
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
    },
    onError: handleError
  })
}

export interface GuestConnectionParams {
  key: string
  wsUrl: string
  t: any
  updateState: SyncStateUpdater
  handleError: (err: Error) => void
  connectionRef: React.MutableRefObject<P2PConnection | null>
}

export function initGuestConnection({
  key,
  wsUrl,
  t,
  updateState,
  handleError,
  connectionRef
}: GuestConnectionParams) {
  const sigChannel = new WebSocketSignalingChannel(wsUrl)
  connectionRef.current = new P2PConnection({
    signalingChannel: sigChannel,
    isHost: false,
    onStatusChange: async (s) => {
      if (s === "datachannel-open") {
        updateState({
          status: "syncing",
          statusMessage: t?.sending || "Encrypting and sending local data..."
        })
        try {
          const syncData = await prepareOutgoingSyncData()
          const encrypted = await encryptSyncData(syncData, key)
          connectionRef.current?.send(encrypted)
          updateState({
            status: "success",
            statusMessage: t?.syncSuccess || "Data synced successfully!"
          })
        } catch (err: any) {
          handleError(err)
        }
      } else if (s.startsWith("connection-state-failed")) {
        handleError(new Error("P2P connection failed to establish"))
      }
    },
    onError: handleError
  })
}
