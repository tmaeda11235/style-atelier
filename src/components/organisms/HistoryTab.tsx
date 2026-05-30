import React from "react"
import { useHistory } from "../../hooks/useHistory"
import type { HistoryItem } from "../../lib/db-schema"
import { HistoryCard } from "../molecules/HistoryCard"

interface HistoryTabProps {
  onStartMinting: (item: HistoryItem) => void
}

export function HistoryTab({ onStartMinting }: HistoryTabProps) {
  const { historyItems } = useHistory()

  return (
    <div className="space-y-3" data-tutorial="history-drop-zone">
      {historyItems?.map((item, idx) => (
        <div key={item.id} data-tutorial={idx === 0 ? "mint-button" : undefined}>
          <HistoryCard
            item={item}
            onMintClick={onStartMinting}
          />
        </div>
      ))}
    </div>
  )
}