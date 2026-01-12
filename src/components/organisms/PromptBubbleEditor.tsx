import React, { useState, useEffect } from "react"
import { PromptBubble } from "../molecules/PromptBubble"
import type { PromptSegment } from "../../lib/db-schema"
import { RarityTier } from "../../lib/rarity-config"

/**
 * プロンプトのセグメントを一覧表示し、クリックで編集（Text <-> Slotの切り替え）ができるエディタコンポーネント。
 *
 * @param {Object} props
 * @param {PromptSegment[]} props.initialSegments - 初期セグメントデータ
 * @param {(segments: PromptSegment[]) => void} [props.onChange] - データ変更時の通知ハンドラ
 * @param {RarityTier} [props.tier] - 適用するレアリティスタイル
 */
interface PromptBubbleEditorProps {
  initialSegments: PromptSegment[]
  onChange?: (segments: PromptSegment[]) => void
  tier?: RarityTier
}

export const PromptBubbleEditor: React.FC<PromptBubbleEditorProps> = ({
  initialSegments,
  onChange,
  tier,
}) => {
  const [segments, setSegments] = useState<PromptSegment[]>(initialSegments)

  useEffect(() => {
    setSegments(initialSegments)
  }, [initialSegments])

  useEffect(() => {
    if (onChange) {
      onChange(segments)
    }
  }, [segments, onChange])

  const handleBubbleClick = (index: number) => {
    setSegments(
      segments.map((seg, i) => {
        if (i === index) {
          if (seg.type === "text") {
            return { type: "slot", label: seg.value, default: seg.value }
          }
          if (seg.type === "slot") {
            return { type: "text", value: seg.label }
          }
        }
        return seg
      })
    )
  }

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-slate-100 rounded-lg">
      {segments.map((segment, index) => (
        <PromptBubble
          key={index}
          segment={segment}
          onClick={() => handleBubbleClick(index)}
          tier={tier}
        />
      ))}
    </div>
  )
}