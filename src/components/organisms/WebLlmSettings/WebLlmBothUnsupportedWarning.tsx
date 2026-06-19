import { AlertTriangle } from "lucide-react"
import React from "react"

export function WebLlmBothUnsupportedWarning({
  t
}: {
  t: Record<string, string>
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="text-[11px] text-rose-500 dark:text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5 space-y-1">
      <div className="flex items-center gap-1.5 font-bold">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          {t.webLlmBothUnsupportedTitle || "AI Environment Unsupported"}
        </span>
      </div>
      <p className="leading-relaxed">
        {t.webLlmBothUnsupportedDesc ||
          "Both WebGPU and Wasm (CPU) are unavailable on your environment. Please update your browser or check your settings."}
      </p>
    </div>
  )
}
