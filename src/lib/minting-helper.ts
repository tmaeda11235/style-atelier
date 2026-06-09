import type { HistoryItem, PromptSegment, StyleCard } from "./db-schema"
import { createThumbnailDataUrl } from "./image-utils"
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
  variationBase: BuildCardParams["variationBase"]
) {
  const parameters = mintingItem
    ? parsePrompt(mintingItem.fullCommand).parameters
    : variationBase!.parameters

  const genealogy = mintingItem
    ? {
        generation: 1,
        parentIds: [],
        originCreatorId: "user",
        mutationNote: `Minted from history item ${mintingItem.id}`
      }
    : variationBase!.genealogy

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
    isPHidden
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
    isPHidden
  } = params

  const { parameters, genealogy, images, selectedThumbnails } =
    resolveGenealogyAndParams(mintingItem, variationBase)
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
