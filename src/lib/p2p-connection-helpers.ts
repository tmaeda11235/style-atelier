import React from "react"

import { P2PConnection } from "./p2p-connection"

export type SyncStatus =
  | "setup"
  | "connecting"
  | "connected"
  | "syncing"
  | "success"
  | "error"
  | "relay-connecting"
  | "relay-syncing"
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

export interface GuestConnectionParams {
  key: string
  wsUrl: string
  t: any
  updateState: SyncStateUpdater
  handleError: (err: Error) => void
  connectionRef: React.MutableRefObject<P2PConnection | null>
}

export { initHostConnection } from "./p2p-host-connection-helper"
export { initGuestConnection } from "./p2p-guest-connection-helper"
