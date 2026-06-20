import { Sparkles } from "lucide-react"
import React, { useEffect, useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useHand } from "../../hooks/useHand"

export function TipsBar() {
  const { showTipsBar } = useSettings()
  const { t: i18n } = useLanguage()
  const { pinnedCards } = useHand()
  const [currentTipIndex, setCurrentTipIndex] = useState(0)

  // Use type casting to handle the custom dictionary properties
  const tips = (i18n as any).tipsList || []

  useEffect(() => {
    if (tips.length === 0) return
    const timer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length)
    }, 8000) // 8 seconds rotation
    return () => clearInterval(timer)
  }, [tips.length])

  if (!showTipsBar || tips.length === 0) return null

  // If hand has cards, position it above HandBar. HandBar has some height, say ~90px.
  const hasPinned = pinnedCards && pinnedCards.length > 0

  return (
    <div
      id="tips-bar"
      className="w-full relative bg-white/95 dark:bg-slate-900/85 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/40 shadow-lg text-slate-700 dark:text-slate-300 transition-all duration-300 ease-in-out pointer-events-auto">
      <div className="max-w-md mx-auto py-1.5 px-3 flex items-center justify-between text-[10px] sm:text-xs">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse shrink-0" />
          <span
            className="whitespace-normal break-words leading-normal select-none font-medium animate-in fade-in slide-in-from-right-4 duration-500"
            key={currentTipIndex}
            id="tips-bar-text">
            {tips[currentTipIndex]}
          </span>
        </div>
      </div>
    </div>
  )
}
