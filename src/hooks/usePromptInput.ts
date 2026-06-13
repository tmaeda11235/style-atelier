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

export const usePromptInput = (props: UsePromptInputProps) => {
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const addTokensFromInput = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    const newTokens: PromptSegment[] = trimmed
      .split(PROMPT_DELIMITER_REGEX)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((value) => ({ type: "text", value }))

    if (newTokens.length > 0) {
      props.onAddSegment(newTokens)
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
      props.segments.length > 0
    ) {
      e.preventDefault()
      props.onRemoveLastSegment()
    } else if (PROMPT_DELIMITER_CHARS.includes(e.key)) {
      e.preventDefault()
      addTokensFromInput()
    }
  }

  return {
    inputValue,
    setInputValue,
    inputRef,
    handleKeyDown,
    handleBlur: addTokensFromInput,
    focusInput: () => inputRef.current?.focus()
  }
}
