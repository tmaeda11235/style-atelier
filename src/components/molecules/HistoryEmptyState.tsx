import { ExternalLink, History } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"

export function HistoryEmptyState() {
  const { t } = useTranslation() as any

  return (
    <div
      className="flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed backdrop-blur-sm animate-in fade-in duration-300"
      data-tutorial="history-drop-zone">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">
        <History className="w-6 h-6 text-slate-500 dark:text-slate-400" />
      </div>
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
        {t("historyTab.emptyTitle")}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed mb-4">
        {t("historyTab.emptyDesc")}
      </p>
      <a
        href="https://www.midjourney.com/explore"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-sm">
        <span>{t("historyTab.openMidjourney")}</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  )
}
