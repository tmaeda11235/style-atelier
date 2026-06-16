import React from "react"

import { useLanguage } from "../../../contexts/LanguageContext"

interface WelcomeDialogProps {
  onStart: () => void
  onSkip: () => void
}

export function WelcomeDialog({ onStart, onSkip }: WelcomeDialogProps) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 dark:bg-slate-950/80 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-200 animate-in zoom-in-95 duration-200">
        <div className="p-5 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center">
            <span className="text-3xl">🎴</span>
          </div>
          <h2 className="text-base font-black text-white text-center">
            {t.welcome.title}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed text-center whitespace-pre-line">
            {t.welcome.description}
          </p>
        </div>
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={onStart}
            id="welcome-start-btn"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow transition-all">
            {t.welcome.start}
          </button>
          <button
            onClick={onSkip}
            id="welcome-skip-btn"
            className="w-full py-2 text-slate-500 hover:text-slate-300 text-xs font-semibold transition-all">
            {t.welcome.skip}
          </button>
        </div>
      </div>
    </div>
  )
}
