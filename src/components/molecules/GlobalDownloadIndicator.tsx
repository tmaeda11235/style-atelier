import { AlertTriangle, Loader2 } from "lucide-react"
import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useHand } from "../../hooks/useHand"
import type { Tab } from "../../hooks/useTabs"
import { useWebLlm } from "../../hooks/useWebLlm"

interface GlobalDownloadIndicatorProps {
  onTabChange: (tab: Tab) => void
}

function calculateBottomOffset(
  pinnedCards: any[] | undefined,
  showTipsBar: boolean,
  isEasyMode: boolean,
  tips: any[]
): number {
  const hasPinned = pinnedCards && pinnedCards.length > 0
  const hasTips = showTipsBar && tips.length > 0

  let bottomOffset = 0
  if (hasPinned && !isEasyMode) {
    bottomOffset += 92
  }
  if (hasTips) {
    bottomOffset += 36
  }
  return bottomOffset
}

interface DownloadingContentProps {
  progress: number
  t: any
}

function DownloadingContent({ progress, t }: DownloadingContentProps) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex items-center gap-1.5 shrink-0 font-bold text-indigo-600 dark:text-indigo-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>📥 {progress}%</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate font-medium">
          {t.webLlmGlobalAnxietyMicrocopy ||
            "Downloading safely in the background. You can navigate away."}
        </p>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
          <div
            className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

interface QuotaWarningContentProps {
  t: any
  onCleanup: () => void
}

function QuotaWarningContent({ t, onCleanup }: QuotaWarningContentProps) {
  return (
    <div className="flex items-center justify-between w-full gap-2">
      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">
          {t.webLlmGlobalQuotaWarning ||
            "Insufficient space (Minimum 2GB required)"}
        </span>
      </div>
      <button
        type="button"
        onClick={onCleanup}
        className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-[10px] font-bold rounded-lg shadow-sm transition-all shrink-0 cursor-pointer">
        {t.webLlmGlobalCleanupBtn || "Clean up storage"}
      </button>
    </div>
  )
}

function handleTabRedirect(section: string, onTabChange: (tab: Tab) => void) {
  if (typeof window !== "undefined") {
    ;(window as any).__focusSettingsSection = section
  }
  onTabChange("settings")
}

export function GlobalDownloadIndicator({
  onTabChange
}: GlobalDownloadIndicatorProps) {
  const { status, progress } = useWebLlm()
  const { showTipsBar, isEasyMode } = useSettings()
  const { pinnedCards } = useHand()
  const { t: i18n } = useLanguage()
  const t = i18n.settings || {}

  const isDownloading = status === "downloading" || status === "verifying"
  const isQuotaWarning = status === "insufficient-quota"

  if (!isDownloading && !isQuotaWarning) {
    return null
  }

  const tips = (i18n as any).tipsList || []
  const bottomOffset = calculateBottomOffset(
    pinnedCards,
    showTipsBar,
    isEasyMode,
    tips
  )

  const handleBarClick = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest("button")) {
      handleTabRedirect("webllm", onTabChange)
    }
  }

  const handleCleanupClick = () => handleTabRedirect("maintenance", onTabChange)

  return (
    <div
      id="global-download-indicator"
      style={{ bottom: `${bottomOffset}px` }}
      onClick={isDownloading ? handleBarClick : undefined}
      className={`absolute left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/60 shadow-lg text-slate-700 dark:text-slate-300 transition-all duration-300 ease-in-out ${
        isDownloading
          ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
          : ""
      }`}>
      <div className="max-w-md mx-auto py-2 px-4 flex items-center justify-between text-xs">
        {isDownloading ? (
          <DownloadingContent progress={progress} t={t} />
        ) : (
          <QuotaWarningContent t={t} onCleanup={handleCleanupClick} />
        )}
      </div>
    </div>
  )
}
