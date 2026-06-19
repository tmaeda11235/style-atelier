import { AlertTriangle } from "lucide-react"
import React from "react"

export function WebLlmError({
  error,
  t
}: {
  error: string
  t: Record<string, string>
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="text-[11px] text-rose-500 dark:text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
      <div className="pl-6 text-[10px] text-slate-500 dark:text-slate-400 border-t border-rose-500/10 pt-1.5 mt-0.5">
        {t.webLlmCorruptedMsg ||
          "Model cache corrupted or interrupted. Please click Download Model to try again."}
      </div>
    </div>
  )
}
