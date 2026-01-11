import React from "react"
import { useHistory } from "../../hooks/useHistory"
import type { HistoryItem } from "../../lib/db-schema"

interface HistoryTabProps {
  onStartMinting: (item: HistoryItem) => void
}

export function HistoryTab({ onStartMinting }: HistoryTabProps) {
  const { historyItems } = useHistory()

  return (
    <div className="space-y-3">
      {historyItems?.map((item) => (
        <div
          key={item.id}
          className="bg-white border border-slate-200 rounded-lg shadow-sm flex gap-3 p-2"
        >
          <img src={item.imageUrl} alt={item.id} className="w-24 h-24 rounded object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-600 line-clamp-3 my-1" title={item.fullCommand}>
              {item.fullCommand}
            </p>
            <button
              onClick={() => onStartMinting(item)}
              className="mt-2 text-xs text-blue-600 font-medium"
            >
              Mint Card
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}