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

export interface HostConnectionParams {
  wsUrl: string
  key: string
  t: any
  setStatus: (s: SyncStatus) => void
  setStatusMessage: (m: string) => void
  setProcessedCount: (c: { cards: number; categories: number }) => void
  handleError: (err: Error) => void
  connectionRef: React.MutableRefObject<P2PConnection | null>
}

export function initHostConnection({
  wsUrl,
  key,
  t,
  setStatus,
  setStatusMessage,
  setProcessedCount,
  handleError,
  connectionRef
}: HostConnectionParams) {
  const sigChannel = new WebSocketSignalingChannel(wsUrl)
  connectionRef.current = new P2PConnection({
    signalingChannel: sigChannel,
    isHost: true,
    onStatusChange: (s) => {
      if (s === "datachannel-open") {
        setStatus("connected")
        setStatusMessage(t?.connected || "Device connected. Ready to sync.")
      } else if (s.startsWith("connection-state-failed")) {
        handleError(new Error("P2P Connection failed"))
      }
    },
    onMessageReceived: async (encryptedPayload) => {
      setStatus("syncing")
      setStatusMessage(t?.receiving || "Receiving and decrypting data...")
      try {
        const decrypted = await decryptSyncData(encryptedPayload, key)
        const mergeResult = await mergeIncomingSyncData(decrypted)
        if (mergeResult.success) {
          setProcessedCount({
            cards: mergeResult.cardsCount,
            categories: mergeResult.categoriesCount
          })
          setStatus("success")
          setStatusMessage(t?.syncSuccess || "Sync completed successfully!")
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
  setStatus: (s: SyncStatus) => void
  setStatusMessage: (m: string) => void
  handleError: (err: Error) => void
  connectionRef: React.MutableRefObject<P2PConnection | null>
}

export function initGuestConnection({
  key,
  wsUrl,
  t,
  setStatus,
  setStatusMessage,
  handleError,
  connectionRef
}: GuestConnectionParams) {
  const sigChannel = new WebSocketSignalingChannel(wsUrl)
  connectionRef.current = new P2PConnection({
    signalingChannel: sigChannel,
    isHost: false,
    onStatusChange: async (s) => {
      if (s === "datachannel-open") {
        setStatus("syncing")
        setStatusMessage(t?.sending || "Encrypting and sending local data...")
        try {
          const syncData = await prepareOutgoingSyncData()
          const encrypted = await encryptSyncData(syncData, key)
          connectionRef.current?.send(encrypted)
          setStatus("success")
          setStatusMessage(t?.syncSuccess || "Data synced successfully!")
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
