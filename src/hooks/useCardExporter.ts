import { useState } from "react"

import type { StyleCard } from "../lib/db-schema"
import { exportCardAsImage } from "../lib/export-utils"

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

  const handleExportCard = async () => {
    setIsExporting(true)
    setErrorMessage(null)
    try {
      const primaryThumb = selectedThumbs[0] || images[0] || "assets/icon.png"
      const tempCard: StyleCard = {
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
      await exportCardAsImage(tempCard)
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
    handleExportCard
  }
}
