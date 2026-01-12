import React from "react"
import { Deck } from "../../lib/db-schema"

/**
 * デッキ（スタイルカードのセット）を表示するカードコンポーネント。
 *
 * @param {Object} props
 * @param {Deck} props.deck - デッキデータ
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
interface DeckCardProps {
  deck: Deck
  className?: string
}

export function DeckCard({ deck, className = "" }: DeckCardProps) {
  return (
    <div className={`bg-white p-3 border rounded-lg shadow-sm ${className}`}>
      <h3 className="font-bold text-slate-800">{deck.name}</h3>
      <p className="text-xs text-slate-500 mt-1">{deck.cardIds.length} cards</p>
    </div>
  )
}