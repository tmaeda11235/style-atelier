import { Sparkles } from "lucide-react"
import React from "react"

interface AiWarningModalProps {
  onClose: () => void
  t: any
  i18nSettings: any
}

export function AiWarningModal({
  onClose,
  t,
  i18nSettings
}: AiWarningModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-amber-500 mb-3">
          <Sparkles className="w-6 h-6 animate-pulse" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            {t.aiSearchToggle || "AI Semantic Search"}
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
          {t.aiSearchModelNotLoaded ||
            "Local AI Model not loaded. Please download it from the Settings tab first."}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
            {i18nSettings?.cancelBtn || "Cancel"}
          </button>
        </div>
      </div>
    </div>
  )
}
