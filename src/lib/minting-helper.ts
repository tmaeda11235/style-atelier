import type { HistoryItem, PromptSegment, StyleCard } from "./db-schema"
import { createThumbnailDataUrl } from "./image-utils"
import { extractKeywords } from "./nlp-utils"
import { parsePrompt } from "./prompt-utils"
import type { RarityTier } from "./rarity-config"

export interface BuildCardParams {
  mintingItem: HistoryItem | null
  variationBase: {
    parameters: StyleCard["parameters"]
    genealogy: StyleCard["genealogy"]
    thumbnailData?: string
    images?: string[]
    selectedThumbnails?: string[]
  } | null
  editedSegments: PromptSegment[]
  customName: string
  selectedKeywords: string[]
  customTags: string[]
  detectedColorTags: string[]
  selectedRarity: RarityTier
  selectedCategory: string
  detectedDominantColor: string
  detectedAccentColor: string
  thumbnailData: string
  isSrefHidden: boolean
  isPHidden: boolean
  mutationNote?: string
}

export function resolveCardName(
  customName: string,
  selectedKeywords: string[],
  editedSegments: PromptSegment[]
): string {
  let finalName = customName.trim()
  if (selectedKeywords.length > 0) {
    const keywordsStr = selectedKeywords.join(" ")
    finalName = finalName ? `${keywordsStr} (${finalName})` : keywordsStr
  }
  if (!finalName) {
    finalName =
      editedSegments.length > 0 && editedSegments[0].type === "text"
        ? editedSegments[0].value.substring(0, 20)
        : "New Card"
  }
  return finalName
}

export function resolveCardTags(
  selectedKeywords: string[],
  customTags: string[],
  detectedColorTags: string[]
): string[] {
  return Array.from(
    new Set([
      ...selectedKeywords.map((t) => t.toLowerCase()),
      ...customTags.map((t) => t.toLowerCase()),
      ...detectedColorTags.map((t) => t.toLowerCase())
    ])
  )
}

export async function getThumbnailData(
  mintingItem: HistoryItem | null,
  variationBase: { thumbnailData?: string } | null
): Promise<string> {
  if (mintingItem) {
    try {
      if (mintingItem.localImageBlob) {
        return await createThumbnailDataUrl(mintingItem.localImageBlob)
      } else {
        return await createThumbnailDataUrl(mintingItem.imageUrl)
      }
    } catch (err) {
      console.error(
        "Failed to generate thumbnail, using original URL as fallback",
        err
      )
      return mintingItem.imageUrl
    }
  }
  return variationBase?.thumbnailData || "assets/icon.png"
}

export function resolveGenealogyAndParams(
  mintingItem: HistoryItem | null,
  variationBase: BuildCardParams["variationBase"],
  mutationNote?: string
) {
  const parameters = mintingItem
    ? parsePrompt(mintingItem.fullCommand).parameters
    : variationBase!.parameters

  const genealogy = mintingItem
    ? {
        generation: 1,
        parentIds: [],
        originCreatorId: "user",
        mutationNote:
          mutationNote || `Minted from history item ${mintingItem.id}`
      }
    : {
        ...variationBase!.genealogy,
        mutationNote: mutationNote || variationBase!.genealogy.mutationNote
      }

  const images = mintingItem
    ? [mintingItem.imageUrl]
    : variationBase?.images || []

  const selectedThumbnails = mintingItem
    ? [mintingItem.imageUrl]
    : variationBase?.selectedThumbnails || []

  return { parameters, genealogy, images, selectedThumbnails }
}

export function createBuildCardParams(
  mintingItem: HistoryItem | null,
  variationBase: any,
  editedSegments: PromptSegment[],
  selectedRarity: RarityTier,
  isSrefHidden: boolean,
  isPHidden: boolean,
  thumbnailData: string,
  meta: {
    customName: string
    selectedKeywords: string[]
    customTags: string[]
    selectedCategory: string
    mutationNote?: string
  },
  colors: {
    detectedColorTags: string[]
    detectedDominantColor: string
    detectedAccentColor: string
  }
): BuildCardParams {
  return {
    mintingItem,
    variationBase,
    editedSegments,
    customName: meta.customName,
    selectedKeywords: meta.selectedKeywords,
    customTags: meta.customTags,
    detectedColorTags: colors.detectedColorTags,
    selectedRarity,
    selectedCategory: meta.selectedCategory,
    detectedDominantColor: colors.detectedDominantColor,
    detectedAccentColor: colors.detectedAccentColor,
    thumbnailData,
    isSrefHidden,
    isPHidden,
    mutationNote: meta.mutationNote
  }
}

export function buildMintedCard(params: BuildCardParams): StyleCard {
  const {
    mintingItem,
    variationBase,
    editedSegments,
    customName,
    selectedKeywords,
    customTags,
    detectedColorTags,
    selectedRarity,
    selectedCategory,
    detectedDominantColor,
    detectedAccentColor,
    thumbnailData,
    isSrefHidden,
    isPHidden,
    mutationNote
  } = params

  const { parameters, genealogy, images, selectedThumbnails } =
    resolveGenealogyAndParams(mintingItem, variationBase, mutationNote)
  const name = resolveCardName(customName, selectedKeywords, editedSegments)
  const tags = resolveCardTags(selectedKeywords, customTags, detectedColorTags)

  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: editedSegments,
    parameters,
    masking: { isSrefHidden, isPHidden },
    tier: selectedRarity,
    isFavorite: false,
    usageCount: 0,
    tags,
    category: selectedCategory || undefined,
    dominantColor: detectedDominantColor,
    accentColor: detectedAccentColor,
    thumbnailData,
    frameId: "default",
    genealogy,
    jobId: mintingItem ? mintingItem.id : undefined,
    associatedJobIds: mintingItem ? [mintingItem.id] : [],
    images,
    selectedThumbnails
  }
}

function calculateParameterScore(parameters: StyleCard["parameters"]): number {
  if (!parameters) return 0
  let score = 0

  const checkKeys: Array<keyof NonNullable<StyleCard["parameters"]>> = [
    "ar",
    "stylize",
    "chaos",
    "weird",
    "tile",
    "raw",
    "niji",
    "version"
  ]

  for (const key of checkKeys) {
    if (parameters[key] !== undefined && parameters[key] !== false) {
      score += 2
    }
  }

  if (parameters.sref && parameters.sref.length > 0) score += 2
  if (parameters.cref && parameters.cref.length > 0) score += 2
  if (parameters.imagePrompts && parameters.imagePrompts.length > 0) score += 2

  return score
}

function calculateHighQualityKeywordScore(prompt: string): number {
  const highQualityKeywords = [
    "photorealistic",
    "ultra-detailed",
    "hyperrealistic",
    "masterpiece",
    "octane render",
    "unreal engine",
    "cinematic",
    "4k",
    "8k",
    "detailed",
    "intricate"
  ]
  const lowerPrompt = prompt.toLowerCase()
  let count = 0
  for (const kw of highQualityKeywords) {
    if (lowerPrompt.includes(kw)) {
      count++
      if (count >= 3) break
    }
  }
  return count * 3
}

export function determineRarity(
  prompt: string,
  parameters: StyleCard["parameters"],
  generation: number = 1
): RarityTier {
  const paramScore = calculateParameterScore(parameters)
  const keywordCountScore = extractKeywords(prompt).length
  const hqKeywordScore = calculateHighQualityKeywordScore(prompt)
  const generationBonus = (generation - 1) * 2

  const totalScore =
    paramScore + keywordCountScore + hqKeywordScore + generationBonus

  if (totalScore < 6) return "Common"
  if (totalScore < 12) return "Rare"
  if (totalScore < 20) return "Epic"
  return "Legendary"
}
