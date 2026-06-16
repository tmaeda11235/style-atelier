import React, { useCallback } from "react"
import { useTranslation } from "react-i18next"

import { useHistory } from "../../hooks/useHistory"
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll"
import type { HistoryItem } from "../../lib/db-schema"
import { HistoryCard } from "../molecules/HistoryCard"
import { HistoryEmptyState } from "../molecules/HistoryEmptyState"

interface HistoryTabProps {
  onStartMinting: (item: HistoryItem) => void
}

export function HistoryTab({ onStartMinting }: HistoryTabProps) {
  const { historyItems, loadMore, hasMore, updateHistoryItem } = useHistory()
  const { t } = useTranslation()

  const handleImageCached = useCallback(
    async (id: string, blob: Blob) => {
      await updateHistoryItem(id, { localImageBlob: blob })
    },
    [updateHistoryItem]
  )

  const isLoading = !historyItems || historyItems.length < 50
  const sentinelRef = useInfiniteScroll({
    hasMore,
    isLoading,
    loadMore
  })

  if (historyItems !== undefined && historyItems.length === 0) {
    return <HistoryEmptyState />
  }

  return (
    <div className="space-y-3 pb-4" data-tutorial="history-drop-zone">
      {historyItems?.map((item, idx) => (
        <div
          key={item.id}
          data-tutorial={idx === 0 ? "mint-button" : undefined}>
          <HistoryCard
            item={item}
            onMintClick={onStartMinting}
            onImageCached={handleImageCached}
          />
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
