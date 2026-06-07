import { ExternalLink, History } from "lucide-react"
import React, { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"

import { useHistory } from "../../hooks/useHistory"
import type { HistoryItem } from "../../lib/db-schema"
import { HistoryCard } from "../molecules/HistoryCard"

interface HistoryTabProps {
  onStartMinting: (item: HistoryItem) => void
}

export function HistoryTab({ onStartMinting }: HistoryTabProps) {
  const { historyItems, loadMore, hasMore } = useHistory()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    if (!hasMore || !historyItems || historyItems.length < 50) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      {
        rootMargin: "100px"
      }
    )

    const currentSentinel = sentinelRef.current
    if (currentSentinel) {
      observer.observe(currentSentinel)
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel)
      }
      observer.disconnect()
    }
  }, [hasMore, loadMore, historyItems])

  if (historyItems !== undefined && historyItems.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-xl border border-slate-200 border-dashed backdrop-blur-sm animate-in fade-in duration-300"
        data-tutorial="history-drop-zone">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
          <History className="w-6 h-6 text-slate-500" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 mb-1">
          {t("historyTab.emptyTitle")}
        </h3>
        <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed mb-4">
          {t("historyTab.emptyDesc")}
        </p>
        <a
          href="https://www.midjourney.com/explore"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm">
          <span>{t("historyTab.openMidjourney")}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-4" data-tutorial="history-drop-zone">
      {historyItems?.map((item, idx) => (
        <div
          key={item.id}
          data-tutorial={idx === 0 ? "mint-button" : undefined}>
          <HistoryCard item={item} onMintClick={onStartMinting} />
        </div>
      ))}

      {hasMore && historyItems && historyItems.length >= 50 && (
        <div
          ref={sentinelRef}
          className="py-4 text-center text-xs text-zinc-500 font-medium flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></span>
          <span>{t("historyTab.loading")}</span>
        </div>
      )}
    </div>
  )
}
