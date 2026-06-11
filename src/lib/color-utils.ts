import iconUrl from "url:../../assets/icon.png"

import { getQuantizedColorName, rgbToHex, rgbToHsl } from "./color-converter"
import { RARITY_FALLBACK_COLORS, type RarityTier } from "./rarity-config"

export interface ExtractedColors {
  dominantHex: string
  dominantName: string
  accentHex: string
  accentName: string
  isFallback?: boolean
}

export {
  filterByHue,
  getColorNameFromHex,
  getQuantizedColorName,
  hexToHsl,
  hexToRgb,
  rgbToHex,
  rgbToHsl
} from "./color-converter"

function shouldUseFallback(imageUrl: string): boolean {
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

function getFallbackColors(fallbackRarity: RarityTier): ExtractedColors {
  const fallback = RARITY_FALLBACK_COLORS[fallbackRarity]
  return {
    ...fallback,
    isFallback: true
  }
}

function samplePixels(
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

    // Ignore transparent/highly semi-transparent pixels
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

interface WeightedColor {
  name: string
  count: number
  weightedCount: number
  hex: string
}

function getWeightedSortedColors(
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

function findAccentColor(
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
    if (chromaticAccent) {
      return chromaticAccent
    }
  }

  return sortedColors.find((c) => c.name !== dominant.name) || sortedColors[0]
}

function determineDominantAndAccent(
  nameCounts: Record<
    string,
    { count: number; rSum: number; gSum: number; bSum: number }
  >,
  fallbackRarity: RarityTier
): ExtractedColors {
  const sortedColors = getWeightedSortedColors(nameCounts)
  if (sortedColors.length === 0) {
    return getFallbackColors(fallbackRarity)
  }

  const dominant = sortedColors[0]
  const totalPixels = Object.values(nameCounts).reduce(
    (acc, curr) => acc + curr.count,
    0
  )
  const accent = findAccentColor(sortedColors, dominant, totalPixels)

  return {
    dominantHex: dominant.hex,
    dominantName: dominant.name,
    accentHex: accent.hex,
    accentName: accent.name,
    isFallback: false
  }
}

function analyzeCanvasColors(
  img: HTMLImageElement,
  fallbackRarity: RarityTier
): ExtractedColors {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Canvas context not available")
  }

  // Downscale image to 50x50 for rapid color sampling
  canvas.width = 50
  canvas.height = 50
  ctx.drawImage(img, 0, 0, 50, 50)

  const imageData = ctx.getImageData(0, 0, 50, 50)
  const nameCounts = samplePixels(imageData.data)
  return determineDominantAndAccent(nameCounts, fallbackRarity)
}

function fetchImageBlobAsObjectUrl(imageUrl: string): Promise<string> {
  return fetch(imageUrl)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      return res.blob()
    })
    .then((blob) => URL.createObjectURL(blob))
}

function loadImageAndProcess(
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
        const result = analyzeCanvasColors(img, fallbackRarity)
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

    if (imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) {
      img.src = imageUrl
    } else {
      fetchImageBlobAsObjectUrl(imageUrl)
        .then((url) => {
          objectUrlToRevoke = url
          img.src = url
        })
        .catch((err) => {
          console.warn(
            "Failed to fetch image with CORS bypass, setting direct URL",
            err
          )
          img.src = imageUrl
        })
    }
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
