import React, { useState, useEffect, useRef } from "react"
import { PromptBubble } from "../molecules/PromptBubble"
import type { PromptSegment } from "../../lib/db-schema"
import { RarityTier } from "../../lib/rarity-config"
import { cn } from "../../lib/utils"
import { PROMPT_DELIMITER_REGEX, PROMPT_DELIMITER_CHARS } from "../../lib/prompt-utils"

/**
 * プロンプトのセグメントをチップ形式で表示し、自由なテキスト入力でトークンを追加できるエディタ。
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
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // 外部（Workbench等）からの変更を反映
    // ただし、自身での変更ループを避けるため、内容が異なる場合のみ更新
    if (JSON.stringify(initialSegments) !== JSON.stringify(segments)) {
      setSegments(initialSegments)
    }
  }, [initialSegments])

  useEffect(() => {
    if (onChange) {
      onChange(segments)
    }
  }, [segments, onChange])

  const addToken = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const newTokens: PromptSegment[] = trimmed
      .split(PROMPT_DELIMITER_REGEX)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((value) => ({ type: "text", value }))

    setSegments([...segments, ...newTokens])
    setInputValue("")
  }

  const removeSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index))
  }

  const toggleSegmentType = (index: number) => {
    const newSegments = [...segments]
    const segment = newSegments[index]

    if (segment.type === "text") {
      newSegments[index] = {
        type: "slot",
        label: segment.value,
        default: segment.value,
      }
    } else if (segment.type === "slot") {
      newSegments[index] = {
        type: "text",
        value: segment.label,
      }
    }

    setSegments(newSegments)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addToken(inputValue)
    } else if (e.key === "Backspace" && inputValue === "" && segments.length > 0) {
      removeSegment(segments.length - 1)
    } else if (PROMPT_DELIMITER_CHARS.includes(e.key)) {
      e.preventDefault()
      addToken(inputValue)
    }
  }

  const handleBlur = () => {
    addToken(inputValue)
  }

  const focusInput = () => {
    inputRef.current?.focus()
  }

  return (
    <div
      className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg min-h-[100px] cursor-text items-start content-start transition-colors focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400"
      onClick={focusInput}
    >
      {segments.map((segment, index) => (
        <PromptBubble
          key={`${index}-${segment.type === "text" ? segment.value : segment.type === "slot" ? segment.label : segment.kind}`}
          segment={segment}
          onRemove={() => removeSegment(index)}
          onClick={segment.type !== "chip" ? () => toggleSegmentType(index) : undefined}
          tier={segment.type === "text" ? undefined : tier} // テキスト以外はカード由来として色を付ける
        />
      ))}
      <input
        ref={inputRef}
        type="text"
        className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm py-1 text-slate-800 placeholder:text-slate-400"
        placeholder={segments.length === 0 ? "Type something or select cards..." : ""}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    </div>
  )
}