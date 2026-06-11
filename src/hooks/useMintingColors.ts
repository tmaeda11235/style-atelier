import { useEffect, useState } from "react"

import { analyzeImageColors } from "../lib/color-utils"
import type { HistoryItem } from "../lib/db-schema"
import { RARITY_FALLBACK_COLORS, type RarityTier } from "../lib/rarity-config"
import type { VariationBase } from "./useMinting"

export function getFallbackColors(rarity: RarityTier) {
  const fallback = RARITY_FALLBACK_COLORS[rarity]
  const colorTags: string[] = []
  if (fallback.dominantName) colorTags.push(fallback.dominantName)
  if (fallback.accentName && fallback.accentName !== fallback.dominantName) {
    colorTags.push(fallback.accentName)
  }
  return {
    dominantHex: fallback.dominantHex,
    accentHex: fallback.accentHex,
    colorTags
  }
}

export function useImageColorAnalysis(
  mintingItem: HistoryItem | null,
  variationBase: VariationBase | null,
  selectedRarity: RarityTier,
  setDominant: (c: string) => void,
  setAccent: (c: string) => void,
  setTags: (t: string[]) => void,
  setFallback: (f: boolean) => void
) {
  useEffect(() => {
    const applyFallback = () => {
      const { dominantHex, accentHex, colorTags } =
        getFallbackColors(selectedRarity)
      setDominant(dominantHex)
      setAccent(accentHex)
      setTags(colorTags)
      setFallback(true)
    }

    if (mintingItem && mintingItem.imageUrl) {
      analyzeImageColors(mintingItem.imageUrl, selectedRarity)
        .then((colors) => {
          setDominant(colors.dominantHex)
          setAccent(colors.accentHex)
          setFallback(!!colors.isFallback)
          const tags: string[] = []
          if (colors.dominantName) tags.push(colors.dominantName)
          if (colors.accentName && colors.accentName !== colors.dominantName) {
            tags.push(colors.accentName)
          }
          setTags(tags)
        })
        .catch((err) => {
          console.error("Failed to analyze image colors:", err)
          applyFallback()
        })
    } else {
      applyFallback()
    }
  }, [mintingItem, variationBase, selectedRarity])
}

export function useMintingColors(
  mintingItem: HistoryItem | null,
  variationBase: VariationBase | null,
  selectedRarity: RarityTier
) {
  const [detectedDominantColor, setDetectedDominantColor] =
    useState<string>("#ffffff")
  const [detectedAccentColor, setDetectedAccentColor] =
    useState<string>("#ffffff")
  const [detectedColorTags, setDetectedColorTags] = useState<string[]>([])
  const [isColorFallback, setIsColorFallback] = useState(false)

  // Update colors when selected rarity changes if we are using fallback colors
  useEffect(() => {
    if (isColorFallback) {
      const { dominantHex, accentHex, colorTags } =
        getFallbackColors(selectedRarity)
      setDetectedDominantColor(dominantHex)
      setDetectedAccentColor(accentHex)
      setDetectedColorTags(colorTags)
    }
  }, [selectedRarity, isColorFallback])

  useImageColorAnalysis(
    mintingItem,
    variationBase,
    selectedRarity,
    setDetectedDominantColor,
    setDetectedAccentColor,
    setDetectedColorTags,
    setIsColorFallback
  )

  return {
    detectedDominantColor,
    detectedAccentColor,
    detectedColorTags,
    isColorFallback
  }
}
