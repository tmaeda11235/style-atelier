import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react"
import React from "react"

interface SyncStatusMessageProps {
  statusMessage: {
    text: string
    type: "success" | "error" | "info" | null
    actionType?: "quota" | "rateLimit" | null
  }
  isSyncing: boolean
  isRestoring: boolean
  handleCancelSync: () => void
  handleLocalExport?: () => void
  handleSync?: () => void
  t: any
}

interface QuotaErrorMessageProps {
  t: any
  handleLocalExport?: () => void
}

function QuotaErrorMessage({ t, handleLocalExport }: QuotaErrorMessageProps) {
  return (
    <div className="flex flex-col gap-2 pt-2 border-t border-red-200/60">
      <p className="text-[11px] leading-relaxed opacity-90">
        {t.syncQuotaError}
      </p>
      <div className="flex items-center gap-2 mt-1">
        {handleLocalExport && (
          <button
            type="button"
            id="gdrive-quota-export-btn"
            onClick={handleLocalExport}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition-colors shadow-sm">
            {t.quotaExportLocalBtn}
          </button>
        )}
        <a
          href="https://one.google.com/storage"
          target="_blank"
          rel="noopener noreferrer"
          id="gdrive-quota-check-btn"
          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-red-700 border border-red-200 text-[10px] font-bold rounded-lg transition-colors shadow-sm text-center">
          {t.quotaCheckDriveBtn}
        </a>
      </div>
    </div>
  )
}

interface RateLimitErrorMessageProps {
  t: any
  handleSync?: () => void
}

function RateLimitErrorMessage({ t, handleSync }: RateLimitErrorMessageProps) {
  return (
    <div className="flex flex-col gap-2 pt-2 border-t border-red-200/60">
      <p className="text-[11px] leading-relaxed opacity-90">
        {t.syncRateLimitError}
      </p>
      <div className="flex items-center gap-2 mt-1">
        {handleSync && (
          <button
            type="button"
            id="gdrive-rate-limit-retry-btn"
            onClick={handleSync}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition-colors shadow-sm">
            {t.rateLimitRetryBtn}
          </button>
        )}
      </div>
    </div>
  )
}

export function SyncStatusMessage({
  statusMessage,
  isSyncing,
  isRestoring,
  handleCancelSync,
  handleLocalExport,
  handleSync,
  t
}: SyncStatusMessageProps) {
  if (!statusMessage.text) return null
  return (
    <div
      className={`mt-3 mb-4 px-4 py-3 rounded-xl text-xs flex flex-col gap-3 border animate-in fade-in duration-200 ${
        statusMessage.type === "success"
          ? "bg-green-50 text-green-800 border-green-200"
          : statusMessage.type === "error"
            ? "bg-red-50 text-red-800 border-red-200"
            : "bg-blue-50 text-blue-800 border-blue-200"
      }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusMessage.type === "success" && (
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          )}
          {statusMessage.type === "error" && (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          {statusMessage.type === "info" && (
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
        {statusMessage.type === "info" && (isSyncing || isRestoring) && (
          <button
            type="button"
            onClick={handleCancelSync}
            className="ml-2 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-bold rounded-lg transition-colors border border-red-200/50">
            {t.cancelBtnText}
          </button>
        )}
      </div>

      {statusMessage.actionType === "quota" && (
        <QuotaErrorMessage t={t} handleLocalExport={handleLocalExport} />
      )}

      {statusMessage.actionType === "rateLimit" && (
        <RateLimitErrorMessage t={t} handleSync={handleSync} />
      )}
    </div>
  )
}
