import { useState } from "react"

import { exportCardAsImage } from "../lib/export-utils"
import type { StyleCard } from "../shared/lib/db-schema"

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

function createExportFile(blob: Blob, cardName: string): File {
  const safeName = cardName.replace(/[\s/\\?%*:|"<>]/g, "_") || "style_card"
  return new File([blob], `${safeName}.png`, { type: "image/png" })
}

/* eslint-disable-next-line max-lines-per-function */
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
  const [exportedFile, setExportedFile] = useState<File | null>(null)

  const handleExportCard = async () => {
    setIsExporting(true)
    setErrorMessage(null)
    setShowSuccessModal(false)
    setExportedFile(null)
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
      const blob = await exportCardAsImage(tempCard)
      setExportedFile(createExportFile(blob, tempCard.name))
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
    handleExportCard,
    exportedFile
  }
}
