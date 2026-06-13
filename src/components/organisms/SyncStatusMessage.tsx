import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react"
import React from "react"

interface SyncStatusMessageProps {
  statusMessage: {
    text: string
    type: "success" | "error" | "info" | null
  }
  isSyncing: boolean
  isRestoring: boolean
  handleCancelSync: () => void
  t: any
}

export function SyncStatusMessage({
  statusMessage,
  isSyncing,
  isRestoring,
  handleCancelSync,
  t
}: SyncStatusMessageProps) {
  if (!statusMessage.text) return null
  return (
    <div
      className={`mt-3 mb-4 px-3 py-2.5 rounded-xl text-xs flex items-center justify-between border animate-in fade-in duration-200 ${
        statusMessage.type === "success"
          ? "bg-green-50 text-green-800 border-green-200"
          : statusMessage.type === "error"
            ? "bg-red-50 text-red-800 border-red-200"
            : "bg-blue-50 text-blue-800 border-blue-200"
      }`}>
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
  )
}
