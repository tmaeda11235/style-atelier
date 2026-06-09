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
