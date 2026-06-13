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

function applyFallbackColors(
  rarity: RarityTier,
  setDominant: (c: string) => void,
  setAccent: (c: string) => void,
  setTags: (t: string[]) => void,
  setFallback: (f: boolean) => void
) {
  const { dominantHex, accentHex, colorTags } = getFallbackColors(rarity)
  setDominant(dominantHex)
  setAccent(accentHex)
  setTags(colorTags)
  setFallback(true)
}

function applyImageColors(
  colors: any,
  setDominant: (c: string) => void,
  setAccent: (c: string) => void,
  setFallback: (f: boolean) => void,
  setTags: (t: string[]) => void
) {
  setDominant(colors.dominantHex)
  setAccent(colors.accentHex)
  setFallback(!!colors.isFallback)
  const tags: string[] = []
  if (colors.dominantName) tags.push(colors.dominantName)
  if (colors.accentName && colors.accentName !== colors.dominantName) {
    tags.push(colors.accentName)
  }
  setTags(tags)
}

interface ImageColorAnalysisProps {
  mintingItem: HistoryItem | null
  variationBase: VariationBase | null
  selectedRarity: RarityTier
  setDominant: (c: string) => void
  setAccent: (c: string) => void
  setTags: (t: string[]) => void
  setFallback: (f: boolean) => void
}

function performImageColorAnalysis(
  active: boolean,
  imageUrl: string | undefined,
  selectedRarity: RarityTier,
  setDominant: (c: string) => void,
  setAccent: (c: string) => void,
  setTags: (t: string[]) => void,
  setFallback: (f: boolean) => void
) {
  const apply = () =>
    applyFallbackColors(
      selectedRarity,
      setDominant,
      setAccent,
      setTags,
      setFallback
    )
  if (imageUrl) {
    analyzeImageColors(imageUrl, selectedRarity)
      .then((colors) => {
        if (active)
          applyImageColors(colors, setDominant, setAccent, setFallback, setTags)
      })
      .catch((err) => {
        console.error("Failed to analyze image colors:", err)
        if (active) apply()
      })
  } else {
    apply()
  }
}

export function useImageColorAnalysis(props: ImageColorAnalysisProps) {
  const {
    mintingItem,
    selectedRarity,
    setDominant,
    setAccent,
    setFallback,
    setTags
  } = props
  useEffect(() => {
    let active = true
    performImageColorAnalysis(
      active,
      mintingItem?.imageUrl,
      selectedRarity,
      setDominant,
      setAccent,
      setTags,
      setFallback
    )
    return () => {
      active = false
    }
  }, [
    mintingItem,
    props.variationBase,
    selectedRarity,
    setDominant,
    setAccent,
    setTags,
    setFallback
  ])
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

  useImageColorAnalysis({
    mintingItem,
    variationBase,
    selectedRarity,
    setDominant: setDetectedDominantColor,
    setAccent: setDetectedAccentColor,
    setTags: setDetectedColorTags,
    setFallback: setIsColorFallback
  })

  return {
    detectedDominantColor,
    detectedAccentColor,
    detectedColorTags,
    isColorFallback
  }
}
