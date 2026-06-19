import { useState } from "react"

import { useCardDetailsForm } from "../../../hooks/useCardDetailsForm"
import { useCardExporter } from "../../../hooks/useCardExporter"
import type { StyleCard } from "../../../shared/lib/db-schema"
import { buildPromptString } from "../../../shared/lib/prompt-utils"

interface UseCardDetailViewProps {
  card: StyleCard
  onSave: (updatedCard: StyleCard) => Promise<void>
  onInject: (prompt: string) => Promise<void>
}

export function useCardDetailView({
  card,
  onSave,
  onInject
}: UseCardDetailViewProps) {
  const form = useCardDetailsForm(card, onSave)
  const [showRollbackNotice, setShowRollbackNotice] = useState(false)

  const triggerRollback = (version: any) => {
    form.handleRollback(version)
    setShowRollbackNotice(true)
  }

  const onSaveClick = async () => {
    await form.handleSaveChanges()
    setShowRollbackNotice(false)
  }

  const exporter = useCardExporter(
    card,
    form.name,
    form.tier,
    form.promptSegments,
    form.parameters,
    form.tags,
    form.images,
    form.selectedThumbs,
    form.category || undefined
  )

  const handleTryOnMidjourney = async () => {
    const masked: (keyof StyleCard["parameters"])[] = []
    if (form.isSrefHidden) masked.push("sref")
    if (form.isPHidden) masked.push("p")
    const full = buildPromptString(form.promptSegments, form.parameters, masked)
    await onInject(full)
  }

  return {
    form,
    showRollbackNotice,
    setShowRollbackNotice,
    triggerRollback,
    onSaveClick,
    exporter,
    handleTryOnMidjourney
  }
}
