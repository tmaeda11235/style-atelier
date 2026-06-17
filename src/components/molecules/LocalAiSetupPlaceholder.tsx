import { ArrowRight, Sparkles } from "lucide-react"
import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"

interface LocalAiSetupPlaceholderProps {
  onSetupStart: () => void
  className?: string
}

export function LocalAiSetupPlaceholder({
  onSetupStart,
  className = ""
}: LocalAiSetupPlaceholderProps) {
  const { t: i18n } = useLanguage()
  const t = i18n.libraryTab?.localAiPlaceholder || {
    title: "Use Advanced Features with Local AI",
    desc: "To use natural language search, AI recipe advice, and other smart features, you need to download a local AI model (~2.0 GB). You can start the setup with one click from the Settings tab.",
    startBtn: "Start Setup"
  }

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 text-center bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl backdrop-blur-xs max-w-md mx-auto my-4 space-y-4 animate-in fade-in duration-300 ${className}`}
      id="local-ai-setup-placeholder"
      data-testid="local-ai-setup-placeholder">
      <div className="p-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl text-indigo-500 dark:text-indigo-400">
        <Sparkles className="w-6 h-6 animate-pulse" />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          {t.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
          {t.desc}
        </p>
      </div>

      <button
        onClick={onSetupStart}
        type="button"
        id="local-ai-setup-start-btn"
        className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-sm hover:shadow-md hover:shadow-indigo-500/15 active:scale-95 transition-all duration-200 cursor-pointer text-xs flex items-center justify-center gap-1.5">
        <span>{t.startBtn}</span>
        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>
    </div>
  )
}
