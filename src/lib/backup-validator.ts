import type {
  CustomCategory,
  HistoryItem,
  PromptSegment,
  StyleCard,
  UserSettings
} from "./db-schema"
import type { BackupPayload } from "./google-drive"

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validate that a value is a valid string
 */
function isString(val: any): boolean {
  return typeof val === "string"
}

/**
 * Validate that a value is a valid number
 */
function isNumber(val: any): boolean {
  return typeof val === "number" && !isNaN(val)
}

/**
 * Validate that a value is a boolean
 */
function isBoolean(val: any): boolean {
  return typeof val === "boolean"
}

/**
 * Validate that a value is an array of strings
 */
function isStringArray(val: any): boolean {
  return Array.isArray(val) && val.every((item) => typeof item === "string")
}

/**
 * Validate CustomCategory schema
 */
export function validateCustomCategory(
  category: any,
  index: number
): ValidationResult {
  if (!category || typeof category !== "object") {
    return { isValid: false, error: `Categories[${index}] is not an object.` }
  }
  if (!isString(category.id)) {
    return {
      isValid: false,
      error: `Categories[${index}].id must be a string. Got: ${typeof category.id}`
    }
  }
  if (!isString(category.name)) {
    return {
      isValid: false,
      error: `Categories[${index}] (${category.id}) must have a string 'name'.`
    }
  }
  if (category.iconEmoji !== undefined && !isString(category.iconEmoji)) {
    return {
      isValid: false,
      error: `Categories[${index}] (${category.id}) has invalid 'iconEmoji'.`
    }
  }
  if (category.iconUrl !== undefined && !isString(category.iconUrl)) {
    return {
      isValid: false,
      error: `Categories[${index}] (${category.id}) has invalid 'iconUrl'.`
    }
  }
  if (category.iconCardId !== undefined && !isString(category.iconCardId)) {
    return {
      isValid: false,
      error: `Categories[${index}] (${category.id}) has invalid 'iconCardId'.`
    }
  }
  if (!isNumber(category.createdAt)) {
    return {
      isValid: false,
      error: `Categories[${index}] (${category.id}) must have a numeric 'createdAt'.`
    }
  }
  return { isValid: true }
}

/**
 * Validate PromptSegment schema
 */
function validatePromptSegment(
  segment: any,
  cardId: string,
  index: number
): ValidationResult {
  if (!segment || typeof segment !== "object") {
    return {
      isValid: false,
      error: `Card(${cardId}) has invalid prompt segment at index ${index}: Not an object.`
    }
  }
  if (!isString(segment.type)) {
    return {
      isValid: false,
      error: `Card(${cardId}) prompt segment[${index}] must have a string 'type'.`
    }
  }

  if (segment.type === "text") {
    if (!isString(segment.value)) {
      return {
        isValid: false,
        error: `Card(${cardId}) prompt segment[${index}] (text) must have a string 'value'.`
      }
    }
  } else if (segment.type === "slot") {
    if (!isString(segment.label)) {
      return {
        isValid: false,
        error: `Card(${cardId}) prompt segment[${index}] (slot) must have a string 'label'.`
      }
    }
    if (!isString(segment.default)) {
      return {
        isValid: false,
        error: `Card(${cardId}) prompt segment[${index}] (slot) must have a string 'default'.`
      }
    }
  } else if (segment.type === "chip") {
    if (segment.kind !== "sref" && segment.kind !== "cref") {
      return {
        isValid: false,
        error: `Card(${cardId}) prompt segment[${index}] (chip) must have 'kind' as 'sref' or 'cref'.`
      }
    }
    if (!isString(segment.value)) {
      return {
        isValid: false,
        error: `Card(${cardId}) prompt segment[${index}] (chip) must have a string 'value'.`
      }
    }
  } else {
    return {
      isValid: false,
      error: `Card(${cardId}) prompt segment[${index}] has unknown type: '${segment.type}'.`
    }
  }

  return { isValid: true }
}

/**
 * Validate StyleCard schema
 */
export function validateStyleCard(card: any, index: number): ValidationResult {
  if (!card || typeof card !== "object") {
    return { isValid: false, error: `StyleCards[${index}] is not an object.` }
  }

  const cardId = isString(card.id) ? card.id : `Index ${index}`

  // Basic Identity
  if (!isString(card.id)) {
    return {
      isValid: false,
      error: `StyleCards[${index}] must have a string 'id'.`
    }
  }
  if (!isString(card.name)) {
    return {
      isValid: false,
      error: `Card(${cardId}) must have a string 'name'.`
    }
  }
  if (!isNumber(card.createdAt)) {
    return {
      isValid: false,
      error: `Card(${cardId}) must have a numeric 'createdAt'.`
    }
  }
  if (!isNumber(card.updatedAt)) {
    return {
      isValid: false,
      error: `Card(${cardId}) must have a numeric 'updatedAt'.`
    }
  }

  // Prompt Segments
  if (!Array.isArray(card.promptSegments)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'promptSegments' must be an array.`
    }
  }
  for (let i = 0; i < card.promptSegments.length; i++) {
    const segmentResult = validatePromptSegment(
      card.promptSegments[i],
      cardId,
      i
    )
    if (!segmentResult.isValid) return segmentResult
  }

  // Parameters
  if (!card.parameters || typeof card.parameters !== "object") {
    return {
      isValid: false,
      error: `Card(${cardId}) must have a 'parameters' object.`
    }
  }
  const params = card.parameters
  if (params.ar !== undefined && !isString(params.ar)) {
    return {
      isValid: false,
      error: `Card(${cardId}) parameter 'ar' must be a string.`
    }
  }
  if (params.sref !== undefined && !isStringArray(params.sref)) {
    return {
      isValid: false,
      error: `Card(${cardId}) parameter 'sref' must be an array of strings.`
    }
  }
  if (params.cref !== undefined && !isStringArray(params.cref)) {
    return {
      isValid: false,
      error: `Card(${cardId}) parameter 'cref' must be an array of strings.`
    }
  }
  if (params.p !== undefined && !isStringArray(params.p)) {
    return {
      isValid: false,
      error: `Card(${cardId}) parameter 'p' must be an array of strings.`
    }
  }
  if (
    params.imagePrompts !== undefined &&
    !isStringArray(params.imagePrompts)
  ) {
    return {
      isValid: false,
      error: `Card(${cardId}) parameter 'imagePrompts' must be an array of strings.`
    }
  }
  if (params.stylize !== undefined && !isNumber(params.stylize)) {
    return {
      isValid: false,
      error: `Card(${cardId}) parameter 'stylize' must be a number.`
    }
  }
  if (params.chaos !== undefined && !isNumber(params.chaos)) {
    return {
      isValid: false,
      error: `Card(${cardId}) parameter 'chaos' must be a number.`
    }
  }
  if (params.weird !== undefined && !isNumber(params.weird)) {
    return {
      isValid: false,
      error: `Card(${cardId}) parameter 'weird' must be a number.`
    }
  }
  if (params.tile !== undefined && !isBoolean(params.tile)) {
    return {
      isValid: false,
      error: `Card(${cardId}) parameter 'tile' must be a boolean.`
    }
  }
  if (params.raw !== undefined && !isBoolean(params.raw)) {
    return {
      isValid: false,
      error: `Card(${cardId}) parameter 'raw' must be a boolean.`
    }
  }

  // Masking
  if (!card.masking || typeof card.masking !== "object") {
    return {
      isValid: false,
      error: `Card(${cardId}) must have a 'masking' object.`
    }
  }
  if (!isBoolean(card.masking.isSrefHidden)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'masking.isSrefHidden' must be a boolean.`
    }
  }
  if (!isBoolean(card.masking.isPHidden)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'masking.isPHidden' must be a boolean.`
    }
  }

  // TCG Attributes
  const allowedTiers = ["Common", "Rare", "Epic", "Legendary"]
  if (!allowedTiers.includes(card.tier)) {
    return {
      isValid: false,
      error: `Card(${cardId}) has invalid tier: '${card.tier}'. Allowed: ${allowedTiers.join(", ")}`
    }
  }
  if (!isBoolean(card.isFavorite)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'isFavorite' must be a boolean.`
    }
  }
  if (card.isPinned !== undefined && !isBoolean(card.isPinned)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'isPinned' must be a boolean.`
    }
  }
  if (!isNumber(card.usageCount)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'usageCount' must be a number.`
    }
  }
  if (!isStringArray(card.tags)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'tags' must be an array of strings.`
    }
  }
  if (card.category !== undefined && !isString(card.category)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'category' must be a string.`
    }
  }
  if (!isString(card.dominantColor)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'dominantColor' must be a string.`
    }
  }
  if (card.accentColor !== undefined && !isString(card.accentColor)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'accentColor' must be a string.`
    }
  }

  // Visuals
  if (!isString(card.thumbnailData)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'thumbnailData' must be a string.`
    }
  }
  if (!isString(card.frameId)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'frameId' must be a string.`
    }
  }

  // Genealogy
  if (!card.genealogy || typeof card.genealogy !== "object") {
    return {
      isValid: false,
      error: `Card(${cardId}) must have a 'genealogy' object.`
    }
  }
  if (!isNumber(card.genealogy.generation)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'genealogy.generation' must be a number.`
    }
  }
  if (!isStringArray(card.genealogy.parentIds)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'genealogy.parentIds' must be an array of strings.`
    }
  }
  if (
    card.genealogy.originCreatorId !== undefined &&
    !isString(card.genealogy.originCreatorId)
  ) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'genealogy.originCreatorId' must be a string.`
    }
  }
  if (
    card.genealogy.mutationNote !== undefined &&
    !isString(card.genealogy.mutationNote)
  ) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'genealogy.mutationNote' must be a string.`
    }
  }

  // Variables, Job ID, etc.
  if (card.isVariable !== undefined && !isBoolean(card.isVariable)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'isVariable' must be a boolean.`
    }
  }
  if (card.jobId !== undefined && !isString(card.jobId)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'jobId' must be a string.`
    }
  }
  if (
    card.associatedJobIds !== undefined &&
    !isStringArray(card.associatedJobIds)
  ) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'associatedJobIds' must be an array of strings.`
    }
  }
  if (card.images !== undefined && !isStringArray(card.images)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'images' must be an array of strings.`
    }
  }
  if (
    card.selectedThumbnails !== undefined &&
    !isStringArray(card.selectedThumbnails)
  ) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'selectedThumbnails' must be an array of strings.`
    }
  }

  if (card.versionHistory !== undefined) {
    if (!Array.isArray(card.versionHistory)) {
      return {
        isValid: false,
        error: `Card(${cardId}) 'versionHistory' must be an array.`
      }
    }
    for (let i = 0; i < card.versionHistory.length; i++) {
      const v = card.versionHistory[i]
      if (!v || typeof v !== "object") {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}] must be an object.`
        }
      }
      if (!isString(v.id)) {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].id must be a string.`
        }
      }
      if (!isNumber(v.timestamp)) {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].timestamp must be a number.`
        }
      }
      if (!isString(v.name)) {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].name must be a string.`
        }
      }
      if (!Array.isArray(v.promptSegments)) {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].promptSegments must be an array.`
        }
      }
      for (let j = 0; j < v.promptSegments.length; j++) {
        const segRes = validatePromptSegment(
          v.promptSegments[j],
          `${cardId}-version[${i}]`,
          j
        )
        if (!segRes.isValid) return segRes
      }
      if (!v.parameters || typeof v.parameters !== "object") {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].parameters must be an object.`
        }
      }
      const vp = v.parameters
      if (vp.ar !== undefined && !isString(vp.ar)) {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].parameters.ar must be a string.`
        }
      }
      if (vp.sref !== undefined && !isStringArray(vp.sref)) {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].parameters.sref must be an array of strings.`
        }
      }
      if (vp.cref !== undefined && !isStringArray(vp.cref)) {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].parameters.cref must be an array of strings.`
        }
      }
      if (vp.p !== undefined && !isStringArray(vp.p)) {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].parameters.p must be an array of strings.`
        }
      }
      if (vp.imagePrompts !== undefined && !isStringArray(vp.imagePrompts)) {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].parameters.imagePrompts must be an array of strings.`
        }
      }
      if (vp.stylize !== undefined && !isNumber(vp.stylize)) {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].parameters.stylize must be a number.`
        }
      }
      if (vp.chaos !== undefined && !isNumber(vp.chaos)) {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].parameters.chaos must be a number.`
        }
      }
      if (vp.weird !== undefined && !isNumber(vp.weird)) {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].parameters.weird must be a number.`
        }
      }
      if (vp.tile !== undefined && !isBoolean(vp.tile)) {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].parameters.tile must be a boolean.`
        }
      }
      if (vp.raw !== undefined && !isBoolean(vp.raw)) {
        return {
          isValid: false,
          error: `Card(${cardId}) versionHistory[${i}].parameters.raw must be a boolean.`
        }
      }
    }
  }

  return { isValid: true }
}

/**
 * Validate HistoryItem schema
 */
export function validateHistoryItem(
  item: any,
  index: number
): ValidationResult {
  if (!item || typeof item !== "object") {
    return { isValid: false, error: `HistoryItems[${index}] is not an object.` }
  }

  const itemId = isString(item.id) ? item.id : `Index ${index}`

  if (!isString(item.id)) {
    return {
      isValid: false,
      error: `HistoryItems[${index}] must have a string 'id'.`
    }
  }
  if (!isString(item.fullCommand)) {
    return {
      isValid: false,
      error: `HistoryItem(${itemId}) must have a string 'fullCommand'.`
    }
  }
  if (!isString(item.imageUrl)) {
    return {
      isValid: false,
      error: `HistoryItem(${itemId}) must have a string 'imageUrl'.`
    }
  }
  if (!isNumber(item.timestamp)) {
    return {
      isValid: false,
      error: `HistoryItem(${itemId}) must have a numeric 'timestamp'.`
    }
  }
  if (item.relatedCardId !== undefined && !isString(item.relatedCardId)) {
    return {
      isValid: false,
      error: `HistoryItem(${itemId}) 'relatedCardId' must be a string.`
    }
  }

  return { isValid: true }
}

/**
 * Validate UserSettings schema
 */
export function validateUserSettings(
  setting: any,
  index: number
): ValidationResult {
  if (!setting || typeof setting !== "object") {
    return { isValid: false, error: `UserSettings[${index}] is not an object.` }
  }

  const userId = isString(setting.userId) ? setting.userId : `Index ${index}`

  if (!isString(setting.userId)) {
    return {
      isValid: false,
      error: `UserSettings[${index}] must have a string 'userId'.`
    }
  }
  if (!isBoolean(setting.isPro)) {
    return {
      isValid: false,
      error: `UserSettings(${userId}) 'isPro' must be a boolean.`
    }
  }
  if (!isStringArray(setting.unlockedSkins)) {
    return {
      isValid: false,
      error: `UserSettings(${userId}) 'unlockedSkins' must be an array of strings.`
    }
  }

  if (!setting.branding || typeof setting.branding !== "object") {
    return {
      isValid: false,
      error: `UserSettings(${userId}) must have a 'branding' object.`
    }
  }
  if (!isBoolean(setting.branding.enabled)) {
    return {
      isValid: false,
      error: `UserSettings(${userId}) 'branding.enabled' must be a boolean.`
    }
  }
  if (
    setting.branding.customLogo !== undefined &&
    !isString(setting.branding.customLogo)
  ) {
    return {
      isValid: false,
      error: `UserSettings(${userId}) 'branding.customLogo' must be a string.`
    }
  }
  if (
    setting.branding.signatureName !== undefined &&
    !isString(setting.branding.signatureName)
  ) {
    return {
      isValid: false,
      error: `UserSettings(${userId}) 'branding.signatureName' must be a string.`
    }
  }

  return { isValid: true }
}

/**
 * Validate slotHistory
 */
export function validateSlotHistory(slotHistory: any): ValidationResult {
  if (!slotHistory || typeof slotHistory !== "object") {
    return { isValid: false, error: "slotHistory is not an object." }
  }

  for (const [key, val] of Object.entries(slotHistory)) {
    if (!isString(key)) {
      return {
        isValid: false,
        error: `slotHistory key must be a string. Got key type: ${typeof key}`
      }
    }
    if (!isStringArray(val)) {
      return {
        isValid: false,
        error: `slotHistory[${key}] must be an array of strings.`
      }
    }
  }

  return { isValid: true }
}

/**
 * Validate the entire BackupPayload schema and version compatibility
 */
export function validateBackupPayload(payload: any): ValidationResult {
  if (!payload || typeof payload !== "object") {
    return { isValid: false, error: "Backup data is not a valid JSON object." }
  }

  // Version Validation
  if (payload.version === undefined) {
    return { isValid: false, error: "Missing backup version metadata." }
  }
  if (!isNumber(payload.version)) {
    return {
      isValid: false,
      error: `Backup version must be a number. Got: ${typeof payload.version}`
    }
  }

  // Supplying a boundary for supported versions.
  // Version 1 is the currently exported/supported format.
  // If version is higher than 1, we consider it from a newer version of the extension and block it.
  const SUPPORTED_VERSION = 1
  if (payload.version > SUPPORTED_VERSION) {
    return {
      isValid: false,
      error: `Backup version (${payload.version}) is not supported. Max supported version is ${SUPPORTED_VERSION}. Please upgrade your extension.`
    }
  }
  if (payload.version < 1) {
    return {
      isValid: false,
      error: `Invalid backup version: ${payload.version}.`
    }
  }

  // ExportedAt
  if (!isNumber(payload.exportedAt)) {
    return {
      isValid: false,
      error: "Missing or invalid 'exportedAt' timestamp."
    }
  }

  // Data Wrapper
  if (!payload.data || typeof payload.data !== "object") {
    return {
      isValid: false,
      error: "Missing or invalid 'data' property in backup payload."
    }
  }

  const { styleCards, categories, userSettings, historyItems, slotHistory } =
    payload.data

  // Validate StyleCards
  if (!Array.isArray(styleCards)) {
    return {
      isValid: false,
      error: "Missing or invalid 'data.styleCards' array."
    }
  }
  for (let i = 0; i < styleCards.length; i++) {
    const res = validateStyleCard(styleCards[i], i)
    if (!res.isValid) return res
  }

  // Validate Categories
  if (categories !== undefined) {
    if (!Array.isArray(categories)) {
      return {
        isValid: false,
        error: "Invalid 'data.categories': must be an array."
      }
    }
    for (let i = 0; i < categories.length; i++) {
      const res = validateCustomCategory(categories[i], i)
      if (!res.isValid) return res
    }
  }

  // Validate UserSettings
  if (userSettings !== undefined) {
    if (!Array.isArray(userSettings)) {
      return {
        isValid: false,
        error: "Invalid 'data.userSettings': must be an array."
      }
    }
    for (let i = 0; i < userSettings.length; i++) {
      const res = validateUserSettings(userSettings[i], i)
      if (!res.isValid) return res
    }
  }

  // Validate HistoryItems
  if (historyItems !== undefined) {
    if (!Array.isArray(historyItems)) {
      return {
        isValid: false,
        error: "Invalid 'data.historyItems': must be an array."
      }
    }
    for (let i = 0; i < historyItems.length; i++) {
      const res = validateHistoryItem(historyItems[i], i)
      if (!res.isValid) return res
    }
  }

  // Validate SlotHistory
  if (slotHistory !== undefined) {
    const res = validateSlotHistory(slotHistory)
    if (!res.isValid) return res
  }

  return { isValid: true }
}
