import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react"
import React from "react"

export function WebLlmStatusRow({
  status,
  statusColorClass,
  statusText,
  label
}: {
  status: string
  statusColorClass: string
  statusText: string
  label: string
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-600 dark:text-slate-400 font-medium">
        {label}
      </span>
      <span className={`flex items-center gap-1.5 ${statusColorClass}`}>
        {status === "checking" && (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        )}
        {status === "retrying" && (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
        )}
        {status === "ready" && <CheckCircle className="w-3.5 h-3.5" />}
        {status === "insufficient-quota" && (
          <AlertTriangle className="w-3.5 h-3.5" />
        )}
        {status === "unsupported" && <AlertTriangle className="w-3.5 h-3.5" />}
        {statusText}
      </span>
    </div>
  )
}
