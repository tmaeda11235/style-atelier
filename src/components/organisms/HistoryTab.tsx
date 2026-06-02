import React, { useEffect, useRef } from "react"
import { useHistory } from "../../hooks/useHistory"
import type { HistoryItem } from "../../lib/db-schema"
import { HistoryCard } from "../molecules/HistoryCard"

interface HistoryTabProps {
  onStartMinting: (item: HistoryItem) => void
}

export function HistoryTab({ onStartMinting }: HistoryTabProps) {
  const { historyItems, loadMore, hasMore } = useHistory()
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hasMore || !historyItems || historyItems.length < 50) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      {
        rootMargin: "100px",
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

  return (
    <div className="space-y-3 pb-4" data-tutorial="history-drop-zone">
      {historyItems?.map((item, idx) => (
        <div key={item.id} data-tutorial={idx === 0 ? "mint-button" : undefined}>
          <HistoryCard
            item={item}
            onMintClick={onStartMinting}
          />
        </div>
      ))}

      {hasMore && historyItems && historyItems.length >= 50 && (
        <div
          ref={sentinelRef}
          className="py-4 text-center text-xs text-zinc-500 font-medium flex items-center justify-center gap-2"
        >
          <span className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></span>
          <span>読み込み中...</span>
        </div>
      )}
    </div>
  )
}