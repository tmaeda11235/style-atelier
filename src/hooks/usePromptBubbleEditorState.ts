import { useEffect, useRef, useState } from "react"

import { useSettings } from "../contexts/SettingsContext"
import type { PromptSegment } from "../lib/db-schema"
import {
  PROMPT_DELIMITER_CHARS,
  PROMPT_DELIMITER_REGEX
} from "../lib/prompt-utils"

interface UseStateParams {
  initialSegments: PromptSegment[]
  onChange?: (segments: PromptSegment[]) => void
}

function parseTokenInput(text: string, slotEnabled: boolean): PromptSegment[] {
  return text
    .split(PROMPT_DELIMITER_REGEX)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((value) => {
      const slotMatch = value.match(/^(?:\{\{|\[|<)(.+?)(?:\}\}|\]|>)$/)
      if (slotMatch && slotEnabled) {
        const label = slotMatch[1].trim()
        return { type: "slot" as const, label, default: label }
      }
      return { type: "text" as const, value }
    })
}

function toggleSegment(
  segment: PromptSegment,
  slotEnabled: boolean
): PromptSegment {
  if (segment.type === "text" && slotEnabled) {
    return { type: "slot", label: segment.value, default: segment.value }
  }
  if (segment.type === "slot") {
    return { type: "text", value: segment.label }
  }
  return segment
}

export function usePromptSegmentsState(
  initialSegments: PromptSegment[],
  onChange?: (segments: PromptSegment[]) => void
) {
  const [segments, setSegments] = useState<PromptSegment[]>(() =>
    initialSegments.length > 0 ? [...initialSegments] : initialSegments
  )

  useEffect(() => {
    if (JSON.stringify(initialSegments) !== JSON.stringify(segments)) {
      setSegments(initialSegments)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSegments])

  const removeSegment = (index: number) => {
    const nextSegments = segments.filter((_, i) => i !== index)
    setSegments(nextSegments)
    if (onChange) onChange(nextSegments)
  }

  return { segments, setSegments, removeSegment }
}

function handleKeyDownHelper(
  e: React.KeyboardEvent<HTMLInputElement>,
  inputValue: string,
  segmentsCount: number,
  addToken: (text: string) => void,
  removeSegment: (index: number) => void
) {
  if (e.key === "Enter") {
    e.preventDefault()
    addToken(inputValue)
  } else if (e.key === "Backspace" && inputValue === "" && segmentsCount > 0) {
    removeSegment(segmentsCount - 1)
  } else if (PROMPT_DELIMITER_CHARS.includes(e.key)) {
    e.preventDefault()
    addToken(inputValue)
  }
}

export function usePromptBubbleEditorState({
  initialSegments = [],
  onChange
}: UseStateParams) {
  const { expertFeatures } = useSettings()
  const { segments, setSegments, removeSegment } = usePromptSegmentsState(
    initialSegments,
    onChange
  )
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const addToken = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const newTokens = parseTokenInput(trimmed, expertFeatures.slot)
    const nextSegments = [...segments, ...newTokens]
    setSegments(nextSegments)
    if (onChange) onChange(nextSegments)
    setInputValue("")
  }

  const toggleSegmentType = (index: number) => {
    const newSegments = [...segments]
    newSegments[index] = toggleSegment(newSegments[index], expertFeatures.slot)
    setSegments(newSegments)
    if (onChange) onChange(newSegments)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleKeyDownHelper(e, inputValue, segments.length, addToken, removeSegment)
  }

  return {
    segments,
    setSegments,
    inputValue,
    setInputValue,
    inputRef,
    addToken,
    removeSegment,
    toggleSegmentType,
    handleKeyDown,
    expertFeatures
  }
}
