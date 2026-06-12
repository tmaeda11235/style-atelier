import { useMemo, useState } from "react"

import { useStyleCards } from "./useStyleCards"

function extractParameterValues(allCards: any[], key: string): string[] {
  const values = new Set<string>()
  allCards.forEach((card) => {
    card.parameters?.[key]?.forEach((url: string) => values.add(url))
  })
  return Array.from(values)
}

function getValidatedInputValue(
  valStr: string,
  min: number,
  max: number
): number {
  const val = parseInt(valStr, 10)
  return isNaN(val) ? min : Math.max(min, Math.min(max, val))
}

function useParameterValues(allCards: any[]) {
  const allSrefs = useMemo(
    () => extractParameterValues(allCards, "sref"),
    [allCards]
  )
  const allCrefs = useMemo(
    () => extractParameterValues(allCards, "cref"),
    [allCards]
  )
  const allImagePrompts = useMemo(
    () => extractParameterValues(allCards, "imagePrompts"),
    [allCards]
  )
  return { allSrefs, allCrefs, allImagePrompts }
}

export function useParameterEditor({
  parameters,
  onChange,
  defaultOpen
}: {
  parameters: any
  onChange: (params: any) => void
  defaultOpen: boolean
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const updateParam = (key: string, value: any) => {
    onChange({ ...parameters, [key]: value })
  }

  const handleToggleParam = (key: string, defaultVal: any) => {
    if (parameters[key] === undefined) {
      updateParam(key, defaultVal)
    } else {
      updateParam(key, undefined)
    }
  }

  const handleSliderChange = (key: string, val: number) => {
    updateParam(key, val)
  }

  const handleInputChange = (
    key: string,
    valStr: string,
    min: number,
    max: number
  ) => {
    updateParam(key, getValidatedInputValue(valStr, min, max))
  }

  const allCards = useStyleCards()
  const { allSrefs, allCrefs, allImagePrompts } = useParameterValues(allCards)

  return {
    showAdvanced,
    setShowAdvanced,
    isOpen,
    setIsOpen,
    updateParam,
    handleToggleParam,
    handleSliderChange,
    handleInputChange,
    allCards,
    allSrefs,
    allCrefs,
    allImagePrompts
  }
}
