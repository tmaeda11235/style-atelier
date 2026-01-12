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
    <div className="space-y-3">
      {historyItems?.map((item) => (
        <HistoryCard
          key={item.id}
          item={item}
          onMintClick={onStartMinting}
        />
      ))}
    </div>
  )
}