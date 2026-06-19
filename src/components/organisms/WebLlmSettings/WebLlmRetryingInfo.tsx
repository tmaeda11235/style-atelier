import { RefreshCw } from "lucide-react"
import React from "react"

export function WebLlmRetryingInfo({
  retryCount,
  maxRetries,
  error,
  t
}: {
  retryCount: number
  maxRetries: number
  error: string | null
  t: Record<string, string>
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="text-[11px] text-amber-600 dark:text-amber-500 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 space-y-1.5 animate-in shake duration-300">
      <div className="flex items-center gap-1.5 font-bold">
        <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-amber-600 dark:text-amber-500" />
        <span>
          {(t.webLlmRetryingTitle || "Reconnecting... ({{count}}/{{max}})")
            .replace("{{count}}", String(retryCount))
            .replace("{{max}}", String(maxRetries))}
        </span>
      </div>
      {error && (
        <p className="leading-relaxed text-[10px] opacity-90">{error}</p>
      )}
    </div>
  )
}
