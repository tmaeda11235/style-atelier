import { useRef, useState } from "react"

import type { PromptSegment } from "../lib/db-schema"
import {
  PROMPT_DELIMITER_CHARS,
  PROMPT_DELIMITER_REGEX
} from "../lib/prompt-utils"

interface UsePromptInputProps {
  segments: PromptSegment[]
  onAddSegment: (newSegments: PromptSegment[]) => void
  onRemoveLastSegment: () => void
}

function parseInputToTokens(inputValue: string): PromptSegment[] {
  const trimmed = inputValue.trim()
  if (!trimmed) return []

  return trimmed
    .split(PROMPT_DELIMITER_REGEX)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((value) => ({ type: "text", value }))
}

export const usePromptInput = ({
  segments,
  onAddSegment,
  onRemoveLastSegment
}: UsePromptInputProps) => {
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const addTokensFromInput = () => {
    const newTokens = parseInputToTokens(inputValue)
    if (newTokens.length > 0) {
      onAddSegment(newTokens)
    }
    setInputValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTokensFromInput()
    } else if (
      e.key === "Backspace" &&
      inputValue === "" &&
      segments.length > 0
    ) {
      e.preventDefault() // Prevents default browser back navigation
      onRemoveLastSegment()
    } else if (PROMPT_DELIMITER_CHARS.includes(e.key)) {
      e.preventDefault()
      addTokensFromInput()
    }
  }

  const handleBlur = () => {
    addTokensFromInput()
  }

  const focusInput = () => {
    inputRef.current?.focus()
  }

  return {
    inputValue,
    setInputValue,
    inputRef,
    handleKeyDown,
    handleBlur,
    focusInput
  }
}
