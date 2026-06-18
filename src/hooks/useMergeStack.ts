import { useEffect, useState } from "react"

import type { StyleCard } from "../shared/lib/db-schema"

export interface UseMergeStackProps {
  isOpen: boolean
  workbenchCards: StyleCard[]
  onExecuteMerge: (
    baseCardId: string,
    consumeStates: Record<string, boolean>
  ) => Promise<void>
}

export const getInitialStates = (workbenchCards: StyleCard[]) => {
  if (workbenchCards.length < 2) return { defaultBase: "", initialConsume: {} }
  const defaultBase = workbenchCards[0].id
  const initialConsume: Record<string, boolean> = {}
  workbenchCards.forEach((c) => {
    if (c.id !== defaultBase) {
      initialConsume[c.id] = true
    }
  })
  return { defaultBase, initialConsume }
}

export const calculateNewConsumeStates = (
  workbenchCards: StyleCard[],
  currentConsumeStates: Record<string, boolean>,
  newBaseId: string
) => {
  const next = { ...currentConsumeStates }
  delete next[newBaseId]
  workbenchCards.forEach((c) => {
    if (c.id !== newBaseId && next[c.id] === undefined) {
      next[c.id] = true
    }
  })
  return next
}

export const calculateUsagePreview = (
  workbenchCards: StyleCard[],
  baseCardId: string,
  consumeStates: Record<string, boolean>
) => {
  const baseCard = workbenchCards.find((c) => c.id === baseCardId)
  const additionalUses = workbenchCards
    .filter((c) => c.id !== baseCardId && consumeStates[c.id])
    .reduce((sum, c) => sum + (c.usageCount || 0), 0)
  const previewUsageCount = (baseCard?.usageCount || 0) + additionalUses
  return { baseCard, additionalUses, previewUsageCount }
}

export const useMergeStack = ({
  isOpen,
  workbenchCards,
  onExecuteMerge
}: UseMergeStackProps) => {
  const [baseCardId, setBaseCardId] = useState<string>("")
  const [consumeStates, setConsumeStates] = useState<Record<string, boolean>>(
    {}
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const { defaultBase, initialConsume } = isOpen
      ? getInitialStates(workbenchCards)
      : { defaultBase: "", initialConsume: {} }
    setBaseCardId(defaultBase)
    setConsumeStates(initialConsume)
  }, [workbenchCards, isOpen])

  const handleSelectBaseCard = (cardId: string) => {
    setBaseCardId(cardId)
    setConsumeStates((prev) =>
      calculateNewConsumeStates(workbenchCards, prev, cardId)
    )
  }

  const handleToggleConsume = (cardId: string) => {
    setConsumeStates((p) => ({ ...p, [cardId]: !(p[cardId] ?? true) }))
  }

  const handleMergeClick = async () => {
    if (!baseCardId) return
    setIsSubmitting(true)
    try {
      await onExecuteMerge(baseCardId, consumeStates)
    } finally {
      setIsSubmitting(false)
    }
  }

  const preview = calculateUsagePreview(
    workbenchCards,
    baseCardId,
    consumeStates
  )

  return {
    baseCardId,
    consumeStates,
    isSubmitting,
    handleSelectBaseCard,
    handleToggleConsume,
    handleMergeClick,
    ...preview
  }
}
