import iconUrl from "url:../../assets/icon.png"

import { RARITY_FALLBACK_COLORS, type RarityTier } from "./rarity-config"

export interface ExtractedColors {
  dominantHex: string
  dominantName: string
  accentHex: string
  accentName: string
  isFallback?: boolean
}

export interface WeightedColor {
  name: string
  count: number
  weightedCount: number
  hex: string
}

export function hexToRgb(hex: string): [number, number, number] {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  const fullHex = hex.replace(
    shorthandRegex,
    (_, r, g, b) => r + r + g + g + b + b
  )
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex)
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : [0, 0, 0]
}

export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHsl(r, g, b)
}

export function getColorNameFromHex(hex: string): string {
  const [h, s, l] = hexToHsl(hex)
  return getQuantizedColorName(h, s, l)
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = c.toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function getQuantizedColorName(h: number, s: number, l: number): string {
  if (l > 85) return "White"
  if (l < 15) return "Black"
  if (s < 15) return "Gray"

  // Brown check: Hue in red/orange range, low-mid saturation, dark-mid lightness
  if (h >= 15 && h < 45 && s < 50 && l < 50) return "Brown"

  if (h >= 345 || h < 15) return "Red"
  if (h >= 15 && h < 45) return "Orange"
  if (h >= 45 && h < 70) return "Yellow"
  if (h >= 70 && h < 160) return "Green"
  if (h >= 160 && h < 195) return "Cyan"
  if (h >= 195 && h < 250) return "Blue"
  if (h >= 250 && h < 290) return "Purple"
  if (h >= 290 && h < 345) return "Pink"

  return "Gray"
}

export function shouldUseFallback(imageUrl: string): boolean {
  const isTest =
    typeof process !== "undefined" &&
    process.env.VITEST &&
    process.env.BYPASS_VITEST !== "true"
  return (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    isTest ||
    imageUrl.includes("assets/icon.png") ||
    imageUrl.includes(iconUrl) ||
    imageUrl === ""
  )
}

export function getFallbackColors(
  fallbackRarity: RarityTier = "Common"
): ExtractedColors {
  const fallback =
    RARITY_FALLBACK_COLORS[fallbackRarity] || RARITY_FALLBACK_COLORS.Common
  return {
    ...fallback,
    isFallback: true
  }
}

export function samplePixels(
  data: Uint8ClampedArray
): Record<string, { count: number; rSum: number; gSum: number; bSum: number }> {
  const nameCounts: Record<
    string,
    { count: number; rSum: number; gSum: number; bSum: number }
  > = {}

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]

    if (a < 128) continue

    const [h, s, l] = rgbToHsl(r, g, b)
    const name = getQuantizedColorName(h, s, l)

    if (!nameCounts[name]) {
      nameCounts[name] = { count: 0, rSum: 0, gSum: 0, bSum: 0 }
    }
    nameCounts[name].count++
    nameCounts[name].rSum += r
    nameCounts[name].gSum += g
    nameCounts[name].bSum += b
  }

  return nameCounts
}

export function getSortedWeightedColors(
  nameCounts: Record<
    string,
    { count: number; rSum: number; gSum: number; bSum: number }
  >
): WeightedColor[] {
  return Object.entries(nameCounts)
    .map(([name, stats]) => {
      const isNeutral = name === "White" || name === "Black" || name === "Gray"
      const weightedCount = stats.count * (isNeutral ? 1.0 : 2.5)
      return {
        name,
        count: stats.count,
        weightedCount,
        hex: rgbToHex(
          Math.round(stats.rSum / stats.count),
          Math.round(stats.gSum / stats.count),
          Math.round(stats.bSum / stats.count)
        )
      }
    })
    .sort((a, b) => b.weightedCount - a.weightedCount)
}

export function selectAccentColor(
  sortedColors: WeightedColor[],
  dominant: WeightedColor,
  totalPixels: number
): WeightedColor {
  const isDomNeutral =
    dominant.name === "White" ||
    dominant.name === "Black" ||
    dominant.name === "Gray"

  if (isDomNeutral) {
    const chromaticAccent = sortedColors.find((c) => {
      const isNeut =
        c.name === "White" || c.name === "Black" || c.name === "Gray"
      return !isNeut && c.count >= totalPixels * 0.05
    })
    if (chromaticAccent) return chromaticAccent
  }

  return sortedColors.find((c) => c.name !== dominant.name) || sortedColors[0]
}

export function determineDominantAndAccent(
  nameCounts: Record<
    string,
    { count: number; rSum: number; gSum: number; bSum: number }
  >,
  fallbackRarity: RarityTier
): ExtractedColors {
  const sortedColors = getSortedWeightedColors(nameCounts)
  if (sortedColors.length === 0) {
    return getFallbackColors(fallbackRarity)
  }

  const totalPixels = Object.values(nameCounts).reduce(
    (acc, curr) => acc + curr.count,
    0
  )
  const dominant = sortedColors[0]
  const accent = selectAccentColor(sortedColors, dominant, totalPixels)

  return {
    dominantHex: dominant.hex,
    dominantName: dominant.name,
    accentHex: accent.hex,
    accentName: accent.name,
    isFallback: false
  }
}

export function extractColorsFromImage(
  img: HTMLImageElement,
  fallbackRarity: RarityTier
): ExtractedColors {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Canvas context not available")
  }

  canvas.width = 50
  canvas.height = 50
  ctx.drawImage(img, 0, 0, 50, 50)

  const imageData = ctx.getImageData(0, 0, 50, 50)
  const nameCounts = samplePixels(imageData.data)
  return determineDominantAndAccent(nameCounts, fallbackRarity)
}

export async function setupImageSrc(
  imageUrl: string,
  img: HTMLImageElement
): Promise<string | null> {
  if (imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) {
    img.src = imageUrl
    return null
  }
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    img.src = url
    return url
  } catch (err) {
    console.warn(
      "Failed to fetch image with CORS bypass, setting direct URL",
      err
    )
    img.src = imageUrl
    return null
  }
}

export function loadImageAndProcess(
  imageUrl: string,
  fallbackRarity: RarityTier
): Promise<ExtractedColors> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "Anonymous"
    let objectUrlToRevoke: string | null = null

    const cleanup = () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke)
        objectUrlToRevoke = null
      }
    }

    img.onload = () => {
      try {
        const result = extractColorsFromImage(img, fallbackRarity)
        resolve(result)
      } catch (err) {
        console.error("Color analysis failed, using fallback:", err)
        resolve(getFallbackColors(fallbackRarity))
      } finally {
        cleanup()
      }
    }

    img.onerror = () => {
      console.warn("Failed to load image for color analysis, using fallback")
      cleanup()
      resolve(getFallbackColors(fallbackRarity))
    }

    setupImageSrc(imageUrl, img).then((url) => {
      objectUrlToRevoke = url
    })
  })
}

export async function analyzeImageColors(
  imageUrl: string,
  fallbackRarity: RarityTier = "Common"
): Promise<ExtractedColors> {
  if (shouldUseFallback(imageUrl)) {
    return getFallbackColors(fallbackRarity)
  }
  return loadImageAndProcess(imageUrl, fallbackRarity)
}

export function filterByHue(
  cardColor: string | undefined,
  targetHue: number
): boolean {
  if (!cardColor) return false
  const [h, s, l] = hexToHsl(cardColor)
  if (s < 15 || l > 90 || l < 10) return false
  const diff = Math.min(Math.abs(h - targetHue), 360 - Math.abs(h - targetHue))
  return diff <= 25
}
