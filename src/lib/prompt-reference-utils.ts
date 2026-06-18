import type { PromptSegment, StyleCard } from "../shared/lib/db-schema"
import { buildParamParts, buildSegmentString } from "../shared/lib/prompt-utils"

export interface ReferenceItem {
  url: string
  weight: number
}

/**
 * Parses a single reference item (e.g. "http://url.com::1.5" or "http://url.com")
 * into its URL and weight.
 */
export function parseReferenceItem(item: string): ReferenceItem {
  const parts = item.split("::")
  const url = parts[0]
  let weight = 1.0
  if (parts.length > 1) {
    const parsed = parseFloat(parts[1])
    if (!isNaN(parsed)) {
      weight = parsed
    }
  }
  return { url, weight }
}

/**
 * Merges multiple lists of references (sref or cref) by resolving weights.
 * For each image URL, the final weight is the sum of (original_weight * card_weight).
 * If any reference has a custom weight (not 1.0), all items in the resulting list
 * will specify their weight.
 */
export function mergeReferences(
  referencesList: { items: string[]; cardWeight?: number }[]
): string[] {
  const mergedMap = new Map<string, number>()
  let hasCustomWeight = false

  referencesList.forEach(({ items, cardWeight }) => {
    const cWeight = cardWeight !== undefined ? cardWeight : 1.0
    items.forEach((item) => {
      const { url, weight } = parseReferenceItem(item)
      const finalWeight = weight * cWeight
      mergedMap.set(url, (mergedMap.get(url) || 0) + finalWeight)
      if (finalWeight !== 1.0) {
        hasCustomWeight = true
      }
    })
  })

  const results: string[] = []
  mergedMap.forEach((weight, url) => {
    const formattedWeight = parseFloat(weight.toFixed(2))
    if (formattedWeight === 1.0 && !hasCustomWeight) {
      results.push(url)
    } else {
      results.push(`${url}::${formattedWeight}`)
    }
  })

  return results
}

/**
 * Helper to merge parameters of multiple cards.
 */
function mergeCardParameters(
  cards: {
    parameters: StyleCard["parameters"]
    masking?: StyleCard["masking"]
    weight?: number
  }[],
  firstCard: { parameters: StyleCard["parameters"] }
): StyleCard["parameters"] {
  const mergedParams: StyleCard["parameters"] = {}

  if (firstCard.parameters.ar) {
    mergedParams.ar = firstCard.parameters.ar
  }

  // Merge imagePrompts
  const allImagePrompts = cards.flatMap((c) => c.parameters.imagePrompts || [])
  if (allImagePrompts.length > 0) {
    mergedParams.imagePrompts = Array.from(new Set(allImagePrompts)).slice(0, 5)
  }

  // Merge sref/cref with weights
  const srefList: { items: string[]; cardWeight?: number }[] = []
  const crefList: { items: string[]; cardWeight?: number }[] = []
  cards.forEach((card) => {
    if (card.parameters.sref && !card.masking?.isSrefHidden) {
      srefList.push({ items: card.parameters.sref, cardWeight: card.weight })
    }
    if (card.parameters.cref) {
      crefList.push({ items: card.parameters.cref, cardWeight: card.weight })
    }
  })
  mergedParams.sref = mergeReferences(srefList)
  mergedParams.cref = mergeReferences(crefList)

  // Merge p (personalization)
  const allP = cards.flatMap(
    (c) => (!c.masking?.isPHidden && c.parameters.p) || []
  )
  if (allP.length > 0) {
    mergedParams.p = Array.from(new Set(allP))
  }

  // Inherit numeric and other params
  const inheritKeys: (keyof StyleCard["parameters"])[] = [
    "stylize",
    "chaos",
    "weird",
    "tile",
    "raw",
    "version",
    "niji"
  ]
  inheritKeys.forEach((key) => {
    if (firstCard.parameters[key] !== undefined) {
      ;(mergedParams as any)[key] = firstCard.parameters[key]
    }
  })

  return mergedParams
}

/**
 * Merges multiple style cards into a single unified prompt string,
 * combining their prompt texts with a comma, and merging --sref and --cref
 * parameters by multiplying their weights with the card weights.
 */
export const buildMergedPromptString = (
  cards: {
    promptSegments: PromptSegment[]
    parameters: StyleCard["parameters"]
    masking?: StyleCard["masking"]
    weight?: number
  }[]
): string => {
  if (cards.length === 0) return ""

  const segmentParts = cards
    .map((card) => buildSegmentString(card.promptSegments, card.weight))
    .filter((s) => s.length > 0)
  const mergedSegmentsStr = segmentParts.join(", ")

  const mergedParams = mergeCardParameters(cards, cards[0])
  const paramParts = buildParamParts(mergedParams, [])
  const prefix = mergedParams.imagePrompts?.length
    ? mergedParams.imagePrompts.join(" ")
    : ""

  return `${prefix} ${mergedSegmentsStr} ${paramParts.join(" ")}`
    .replace(/\s+/g, " ")
    .trim()
}
