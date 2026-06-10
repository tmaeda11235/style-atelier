import type { PromptSegment, StyleCard } from "./db-schema"

export const PROMPT_DELIMITER_REGEX = /[,、。:;]+/
export const PROMPT_DELIMITER_CHARS = [",", "、", "。", ":", ";"]

const PARAM_REGEX = /--([a-z0-9-]+)\s*([^--]*)/g

function extractImagePrompts(promptText: string): {
  imagePrompts: string[]
  cleanPromptText: string
} {
  const imagePrompts: string[] = []
  let cleanPromptText = promptText.trim()
  while (true) {
    const match = cleanPromptText.match(/^(https?:\/\/[^\s]+)/)
    if (!match) break
    imagePrompts.push(match[1])
    cleanPromptText = cleanPromptText.substring(match[1].length).trim()
  }
  return { imagePrompts, cleanPromptText }
}

function applyParameter(
  key: string,
  value: string,
  parameters: StyleCard["parameters"]
): void {
  switch (key) {
    case "ar":
      parameters.ar = value
      break
    case "sref":
      parameters.sref = value.split(/\s+/).filter((v) => v.length > 0)
      break
    case "cref":
      parameters.cref = value.split(/\s+/).filter((v) => v.length > 0)
      break
    case "p":
    case "profile":
      parameters.p = value
        .trim()
        .split(/\s+/)
        .filter((v) => v.length > 0)
      break
    case "stylize":
    case "s":
      parameters.stylize = parseInt(value, 10)
      break
    case "chaos":
    case "c":
      parameters.chaos = parseInt(value, 10)
      break
    case "weird":
    case "w":
      parameters.weird = parseInt(value, 10)
      break
    case "tile":
      parameters.tile = true
      break
    case "style":
      if (value === "raw") {
        parameters.raw = true
      }
      break
    case "v":
    case "version":
      parameters.version = value
      break
    case "niji":
      parameters.niji = value
      break
  }
}

function parseParameters(
  promptText: string,
  parameters: StyleCard["parameters"]
): string {
  let cleanPromptText = promptText
  const matches = [...cleanPromptText.matchAll(PARAM_REGEX)]
  matches.forEach((match) => {
    const key = match[1].trim()
    const value = match[2] ? match[2].trim() : ""
    cleanPromptText = cleanPromptText.replace(match[0], "")
    applyParameter(key, value, parameters)
  })
  return cleanPromptText
}

export const parsePrompt = (
  fullCommand: string
): { promptSegments: PromptSegment[]; parameters: StyleCard["parameters"] } => {
  const parameters: StyleCard["parameters"] = {}
  const { imagePrompts, cleanPromptText: afterImage } =
    extractImagePrompts(fullCommand)

  if (imagePrompts.length > 0) {
    parameters.imagePrompts = imagePrompts
  }

  const promptText = parseParameters(afterImage, parameters)

  const promptSegments: PromptSegment[] = promptText
    .split(PROMPT_DELIMITER_REGEX)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((value) => ({ type: "text", value }))

  return { promptSegments, parameters }
}

function buildSegmentString(
  segments: PromptSegment[],
  cardWeight?: number
): string {
  return segments
    .map((seg) => {
      const w = seg.weight !== undefined ? seg.weight : cardWeight
      switch (seg.type) {
        case "text":
          return w !== undefined && w !== 1.0 ? `${seg.value}::${w}` : seg.value
        case "slot":
          return w !== undefined && w !== 1.0
            ? `{{${seg.label}}}::${w}`
            : `{{${seg.label}}}`
        case "chip":
          return ``
      }
    })
    .filter((val) => !!val && val.trim() !== "")
    .join(", ")
}

function buildParamParts(
  params: StyleCard["parameters"],
  maskedKeys: (keyof StyleCard["parameters"])[]
): string[] {
  const paramParts: string[] = []
  if (params.ar && !maskedKeys.includes("ar"))
    paramParts.push(`--ar ${params.ar}`)
  if (params.sref?.length && !maskedKeys.includes("sref")) {
    const srefArray = Array.isArray(params.sref) ? params.sref : [params.sref]
    paramParts.push(`--sref ${srefArray.join(" ")}`)
  }
  if (params.cref?.length && !maskedKeys.includes("cref")) {
    const crefArray = Array.isArray(params.cref) ? params.cref : [params.cref]
    paramParts.push(`--cref ${crefArray.join(" ")}`)
  }

  // Backward compatibility for p
  const pValues = Array.isArray(params.p)
    ? params.p
    : params.p
      ? [params.p]
      : []
  if (pValues.length && !maskedKeys.includes("p"))
    paramParts.push(`--p ${pValues.join(" ")}`)

  if (params.stylize !== undefined && !maskedKeys.includes("stylize"))
    paramParts.push(`--s ${params.stylize}`)
  if (params.chaos !== undefined && !maskedKeys.includes("chaos"))
    paramParts.push(`--c ${params.chaos}`)
  if (params.weird !== undefined && !maskedKeys.includes("weird"))
    paramParts.push(`--w ${params.weird}`)
  if (params.tile && !maskedKeys.includes("tile")) paramParts.push("--tile")
  if (params.raw && !maskedKeys.includes("raw")) paramParts.push("--style raw")
  if (params.version && !maskedKeys.includes("version"))
    paramParts.push(`--v ${params.version}`)
  if (params.niji && !maskedKeys.includes("niji"))
    paramParts.push(`--niji ${params.niji}`)

  return paramParts
}

export const buildPromptString = (
  segments: PromptSegment[],
  params: StyleCard["parameters"],
  maskedKeys: (keyof StyleCard["parameters"])[] = [],
  cardWeight?: number
): string => {
  const segmentString = buildSegmentString(segments, cardWeight)
  const paramParts = buildParamParts(params, maskedKeys)

  const prefix =
    params.imagePrompts?.length && !maskedKeys.includes("imagePrompts")
      ? params.imagePrompts.join(" ")
      : ""

  return `${prefix} ${segmentString} ${paramParts.join(" ")}`
    .replace(/\s+/g, " ")
    .trim()
}

export const mergePromptSegments = (
  allSegments: PromptSegment[]
): PromptSegment[] => {
  const seen = new Set<string>()
  const merged: PromptSegment[] = []

  allSegments.forEach((seg) => {
    if (seg.type === "text") {
      const normalized = seg.value.toLowerCase().trim()
      if (!seen.has(normalized) && normalized.length > 0) {
        seen.add(normalized)
        merged.push(seg)
      }
    } else {
      // For slots/chips, we might want different logic later, but for now just include them
      merged.push(seg)
    }
  })

  return merged
}

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

  // 1. Text segments blend
  const segmentParts = cards
    .map((card) => buildSegmentString(card.promptSegments, card.weight))
    .filter((s) => s.length > 0)

  const mergedSegmentsStr = segmentParts.join(", ")

  // 2. Parameters blend
  const mergedParams: StyleCard["parameters"] = {}
  const firstCard = cards[0]

  if (firstCard.parameters.ar) {
    mergedParams.ar = firstCard.parameters.ar
  }

  // Merge imagePrompts
  const allImagePrompts: string[] = []
  cards.forEach((card) => {
    if (card.parameters.imagePrompts) {
      allImagePrompts.push(...card.parameters.imagePrompts)
    }
  })
  if (allImagePrompts.length > 0) {
    mergedParams.imagePrompts = Array.from(new Set(allImagePrompts)).slice(0, 5)
  }

  // Merge sref/cref with weights
  const srefList: { items: string[]; cardWeight?: number }[] = []
  const crefList: { items: string[]; cardWeight?: number }[] = []

  cards.forEach((card) => {
    const isSrefHidden = card.masking?.isSrefHidden || false
    if (card.parameters.sref && !isSrefHidden) {
      srefList.push({ items: card.parameters.sref, cardWeight: card.weight })
    }
    if (card.parameters.cref) {
      crefList.push({ items: card.parameters.cref, cardWeight: card.weight })
    }
  })

  mergedParams.sref = mergeReferences(srefList)
  mergedParams.cref = mergeReferences(crefList)

  // Merge p (personalization)
  const allP: string[] = []
  cards.forEach((card) => {
    const isPHidden = card.masking?.isPHidden || false
    if (card.parameters.p && !isPHidden) {
      allP.push(...card.parameters.p)
    }
  })
  if (allP.length > 0) {
    mergedParams.p = Array.from(new Set(allP))
  }

  // Inherit numeric and other params from the first card (same as createVariation)
  if (firstCard.parameters.stylize !== undefined)
    mergedParams.stylize = firstCard.parameters.stylize
  if (firstCard.parameters.chaos !== undefined)
    mergedParams.chaos = firstCard.parameters.chaos
  if (firstCard.parameters.weird !== undefined)
    mergedParams.weird = firstCard.parameters.weird
  if (firstCard.parameters.tile !== undefined)
    mergedParams.tile = firstCard.parameters.tile
  if (firstCard.parameters.raw !== undefined)
    mergedParams.raw = firstCard.parameters.raw
  if (firstCard.parameters.version !== undefined)
    mergedParams.version = firstCard.parameters.version
  if (firstCard.parameters.niji !== undefined)
    mergedParams.niji = firstCard.parameters.niji

  const paramParts = buildParamParts(mergedParams, [])
  const prefix = mergedParams.imagePrompts?.length
    ? mergedParams.imagePrompts.join(" ")
    : ""

  return `${prefix} ${mergedSegmentsStr} ${paramParts.join(" ")}`
    .replace(/\s+/g, " ")
    .trim()
}
