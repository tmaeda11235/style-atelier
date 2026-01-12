import React from "react"

/**
 * ミンティング時の名前生成などに使用する、選択可能なキーワードチップ。
 *
 * @param {Object} props
 * @param {string} props.label - 表示テキスト
 * @param {boolean} props.isSelected - 選択されているかどうか
 * @param {() => void} props.onClick - クリック時のハンドラ
 * @param {string} [props.className=''] - 追加のカスタムクラス
 */
interface KeywordChipProps {
  label: string
  isSelected: boolean
  onClick: () => void
  className?: string
}

export function KeywordChip({
  label,
  isSelected,
  onClick,
  className = "",
}: KeywordChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs transition-colors ${
        isSelected
          ? "bg-blue-500 text-white shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      } ${className}`}
    >
      {label}
    </button>
  )
}