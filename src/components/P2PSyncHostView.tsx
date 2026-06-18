import { CheckCircle, Loader2 } from "lucide-react"
import React from "react"

import { P2PSyncErrorView } from "./P2PSyncCommonViews"

interface P2PSyncHostViewProps {
  status: string
  statusMessage: string
  qrCodeDataUrl: string | null
  processedCount: { cards: number; categories: number }
  errorMessage: string
  t: any
  onReset: () => void
  onRetry: () => void
}

function P2PHostConnectingView({
  qrCodeDataUrl,
  statusMessage,
  t
}: {
  qrCodeDataUrl: string | null
  statusMessage: string
  t: any
}) {
  return (
    <div className="flex flex-col items-center space-y-4">
      {qrCodeDataUrl ? (
        <div className="p-3 bg-white rounded-lg shadow-sm border border-border">
          <img
            src={qrCodeDataUrl}
            alt="Sync QR Code"
            className="w-[220px] h-[220px]"
          />
        </div>
      ) : (
        <div className="w-[220px] h-[220px] bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}
      <p className="text-sm text-text-secondary font-medium">{statusMessage}</p>
      <p className="text-xs text-text-muted max-w-sm">
        {t?.scanInstruction ||
          "Scan this QR code with the Mobile device to establish a direct connection."}
      </p>
    </div>
  )
}

function P2PHostSuccessView({
  processedCount,
  t,
  onReset
}: {
  processedCount: { cards: number; categories: number }
  t: any
  onReset: () => void
}) {
  return (
    <div className="flex flex-col items-center space-y-4 py-6">
      <CheckCircle className="w-14 h-14 text-green-500" />
      <h4 className="text-base font-bold text-text-primary">
        {t?.successTitle || "Sync Complete!"}
      </h4>
      <div className="bg-green-50/50 dark:bg-green-950/10 border border-green-200/50 dark:border-green-900/30 rounded-xl p-4 w-full max-w-sm text-left text-xs space-y-1.5 text-text-secondary">
        <div className="flex justify-between">
          <span>Synced Cards:</span>
          <span className="font-bold text-text-primary">
            {processedCount.cards}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Synced Categories:</span>
          <span className="font-bold text-text-primary">
            {processedCount.categories}
          </span>
        </div>
      </div>
      <button
        onClick={onReset}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
        {t?.doneBtn || "Done"}
      </button>
    </div>
  )
}

export function P2PSyncHostView({
  status,
  statusMessage,
  qrCodeDataUrl,
  processedCount,
  errorMessage,
  t,
  onReset,
  onRetry
}: P2PSyncHostViewProps) {
  return (
    <div className="flex flex-col items-center p-6 space-y-6 text-center animate-in fade-in duration-300">
      <h3 className="text-base font-bold text-text-primary">
        {t?.receiveTitle || "P2P Sync Receiver Mode"}
      </h3>
      {status === "connecting" && (
        <P2PHostConnectingView
          qrCodeDataUrl={qrCodeDataUrl}
          statusMessage={statusMessage}
          t={t}
        />
      )}
      {(status === "connected" || status === "syncing") && (
        <div className="flex flex-col items-center space-y-4 py-8">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-sm font-semibold text-text-primary">
            {statusMessage}
          </p>
        </div>
      )}
      {status === "success" && (
        <P2PHostSuccessView
          processedCount={processedCount}
          t={t}
          onReset={onReset}
        />
      )}
      {status === "error" && (
        <P2PSyncErrorView
          t={t}
          errorMessage={errorMessage}
          onReset={onReset}
          onRetry={onRetry}
        />
      )}
    </div>
  )
}
