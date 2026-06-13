import { useState } from "react"

import type { StyleCard } from "../lib/db-schema"
import { exportCardAsImage } from "../lib/export-utils"

function buildExportCard(
  card: StyleCard,
  name: string,
  tier: string,
  promptSegments: any[],
  parameters: any,
  tags: string[],
  images: string[],
  selectedThumbs: string[],
  category?: string
): StyleCard {
  const primaryThumb = selectedThumbs[0] || images[0] || "assets/icon.png"
  return {
    ...card,
    name,
    tier,
    promptSegments,
    parameters,
    tags,
    images,
    selectedThumbnails: selectedThumbs,
    thumbnailData: primaryThumb,
    category: category || undefined,
    dominantColor: card.dominantColor,
    accentColor: card.accentColor
  }
}

export function useCardExporter(
  card: StyleCard,
  name: string,
  tier: string,
  promptSegments: any[],
  parameters: any,
  tags: string[],
  images: string[],
  selectedThumbs: string[],
  category?: string
) {
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const handleExportCard = async () => {
    setIsExporting(true)
    setErrorMessage(null)
    setShowSuccessModal(false)
    try {
      const tempCard = buildExportCard(
        card,
        name,
        tier,
        promptSegments,
        parameters,
        tags,
        images,
        selectedThumbs,
        category
      )
      await exportCardAsImage(tempCard)
      setShowSuccessModal(true)
    } catch (err: any) {
      console.error("Failed to export card:", err)
      setErrorMessage(`Failed to export card: ${err.message || err}`)
    } finally {
      setIsExporting(false)
    }
  }

  return {
    isExporting,
    errorMessage,
    setErrorMessage,
    showSuccessModal,
    setShowSuccessModal,
    handleExportCard
  }
}
