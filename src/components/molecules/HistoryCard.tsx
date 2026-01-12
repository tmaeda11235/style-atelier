import React from "react"
import { HistoryItem } from "../../lib/db-schema"
import { Button } from "../atoms/Button"

/**
 * プロンプトの実行履歴を表示するカードコンポーネント。
 *
 * @param {Object} props
 * @param {HistoryItem} props.item - 履歴データ
 * @param {(item: HistoryItem) => void} props.onMintClick - ミンティング開始ボタンクリック時のハンドラ
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
interface HistoryCardProps {
  item: HistoryItem
  onMintClick: (item: HistoryItem) => void
  className?: string
}

export function HistoryCard({
  item,
  onMintClick,
  className = "",
}: HistoryCardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg shadow-sm flex gap-3 p-2 ${className}`}
    >
      <img
        src={item.imageUrl}
        alt={item.id}
        className="w-24 h-24 rounded object-cover"
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-xs text-slate-600 line-clamp-3 my-1"
          title={item.fullCommand}
        >
          {item.fullCommand}
        </p>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onMintClick(item)}
          className="mt-2 text-blue-600 font-medium hover:bg-blue-50"
        >
          Mint Card
        </Button>
      </div>
    </div>
  )
}