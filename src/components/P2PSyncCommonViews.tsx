import {
  AlertCircle,
  Laptop,
  QrCode,
  RefreshCw,
  Smartphone
} from "lucide-react"
import React from "react"

interface P2PSyncIdleViewProps {
  t: any
  onStartHost: () => void
  onStartGuestScan: () => void
}

export function P2PSyncIdleView({
  t,
  onStartHost,
  onStartGuestScan
}: P2PSyncIdleViewProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6 text-center animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <QrCode className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
        <h3 className="text-lg font-bold text-text-primary">
          {t?.title || "Local P2P Sync"}
        </h3>
      </div>
      <p className="max-w-md text-sm text-text-secondary leading-relaxed">
        {t?.description ||
          "Securely synchronize cards and custom categories directly between your devices (e.g. PC and Mobile) without uploading data to the cloud."}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
        <button
          onClick={onStartHost}
          className="flex flex-col items-center justify-center p-5 border border-dashed border-border rounded-xl hover:border-blue-500 hover:bg-blue-50/10 dark:hover:bg-blue-950/20 transition-all group">
          <Laptop className="w-10 h-10 text-text-secondary group-hover:text-blue-500 mb-3" />
          <span className="font-semibold text-sm text-text-primary">
            {t?.receiveBtn || "Receive on PC"}
          </span>
          <span className="text-xs text-text-muted mt-1">
            {t?.receiveDesc || "Show QR to receive cards"}
          </span>
        </button>

        <button
          onClick={onStartGuestScan}
          className="flex flex-col items-center justify-center p-5 border border-dashed border-border rounded-xl hover:border-blue-500 hover:bg-blue-50/10 dark:hover:bg-blue-950/20 transition-all group">
          <Smartphone className="w-10 h-10 text-text-secondary group-hover:text-blue-500 mb-3" />
          <span className="font-semibold text-sm text-text-primary">
            {t?.sendBtn || "Send from Mobile"}
          </span>
          <span className="text-xs text-text-muted mt-1">
            {t?.sendDesc || "Scan QR to transmit data"}
          </span>
        </button>
      </div>
    </div>
  )
}

interface P2PSyncErrorViewProps {
  t: any
  errorMessage: string
  onReset: () => void
  onRetry: () => void
}

export function P2PSyncErrorView({
  t,
  errorMessage,
  onReset,
  onRetry
}: P2PSyncErrorViewProps) {
  return (
    <div className="flex flex-col items-center space-y-4 py-6 w-full max-w-sm">
      <AlertCircle className="w-14 h-14 text-red-500" />
      <h4 className="text-base font-bold text-text-primary">
        {t?.errorTitle || "Connection Error"}
      </h4>
      <p className="text-xs text-red-500 leading-relaxed font-medium bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30 rounded-xl p-3 w-full">
        {errorMessage}
      </p>
      <div className="flex gap-3 w-full">
        <button
          onClick={onReset}
          className="flex-1 py-2 border border-border hover:bg-slate-50 dark:hover:bg-slate-900 text-text-primary rounded-lg text-xs font-semibold transition-colors">
          {t?.cancelBtn || "Cancel"}
        </button>
        <button
          onClick={onRetry}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          {t?.retryBtn || "Retry"}
        </button>
      </div>
    </div>
  )
}
