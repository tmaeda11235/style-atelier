import { AlertTriangle, ExternalLink } from "lucide-react"
import React from "react"

import { useWebGpu } from "../../hooks/useWebGpu"

interface WebGpuWarningProps {
  t: any
}

export function WebGpuWarning({ t }: WebGpuWarningProps) {
  const { openChromeSettings } = useWebGpu()

  return (
    <div
      role="alert"
      className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/10 dark:border-rose-900/30 text-xs space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h5 className="font-bold text-rose-600 dark:text-rose-400">
            {t.webLlmWebGpuDisabledTitle || "WebGPU is disabled"}
          </h5>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
            {t.webLlmWebGpuDisabledDesc ||
              "WebGPU is not available. Local AI (WebLLM) will run on Wasm, which might be extremely slow or fail."}
          </p>
        </div>
      </div>

      <div className="border-t border-rose-200/50 dark:border-rose-900/20 pt-3 space-y-2">
        <p className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
          {t.webLlmWebGpuTroubleshootingTitle || "WebGPU Troubleshooting Guide"}
        </p>
        <ul className="space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-none pl-0">
          <li>{t.webLlmWebGpuStep1}</li>
          <li>{t.webLlmWebGpuStep2}</li>
          <li>{t.webLlmWebGpuStep3}</li>
        </ul>
        <button
          type="button"
          onClick={openChromeSettings}
          className="mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-[10px] transition-all duration-200 active:scale-95 cursor-pointer">
          <ExternalLink className="w-3 h-3" />
          {t.webLlmWebGpuOpenSettingsBtn || "Open Chrome Settings"}
        </button>
      </div>
    </div>
  )
}
