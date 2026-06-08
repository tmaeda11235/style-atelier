import { validateStyleCard } from "./backup-validator/card"
import { validateCustomCategory } from "./backup-validator/category"
import { validateHistoryItem } from "./backup-validator/history"
import { validateUserSettings } from "./backup-validator/settings"
import { validateSlotHistory } from "./backup-validator/slot-history"
import { isNumber } from "./backup-validator/utils"

export interface ValidationResult {
  isValid: boolean
  error?: string
}

export { validateCustomCategory } from "./backup-validator/category"
export { validateStyleCard } from "./backup-validator/card"
export { validateHistoryItem } from "./backup-validator/history"
export { validateUserSettings } from "./backup-validator/settings"
export { validateSlotHistory } from "./backup-validator/slot-history"

/**
 * Validate the entire BackupPayload schema and version compatibility
 */
export function validateBackupPayload(payload: any): ValidationResult {
  if (!payload || typeof payload !== "object") {
    return { isValid: false, error: "Backup data is not a valid JSON object." }
  }

  const versionRes = validateVersion(payload.version)
  if (!versionRes.isValid) return versionRes

  if (!isNumber(payload.exportedAt)) {
    return {
      isValid: false,
      error: "Missing or invalid 'exportedAt' timestamp."
    }
  }

  if (!payload.data || typeof payload.data !== "object") {
    return {
      isValid: false,
      error: "Missing or invalid 'data' property in backup payload."
    }
  }

  return validatePayloadData(payload.data)
}

function validateVersion(version: any): ValidationResult {
  if (version === undefined) {
    return { isValid: false, error: "Missing backup version metadata." }
  }
  if (!isNumber(version)) {
    return {
      isValid: false,
      error: `Backup version must be a number. Got: ${typeof version}`
    }
  }

  const SUPPORTED_VERSION = 1
  if (version > SUPPORTED_VERSION) {
    return {
      isValid: false,
      error: `Backup version (${version}) is not supported. Max supported version is ${SUPPORTED_VERSION}. Please upgrade your extension.`
    }
  }
  if (version < 1) {
    return { isValid: false, error: `Invalid backup version: ${version}.` }
  }

  return { isValid: true }
}

function validatePayloadData(data: any): ValidationResult {
  const { styleCards, categories, userSettings, historyItems, slotHistory } =
    data

  const cardsRes = validateCardsPayload(styleCards)
  if (!cardsRes.isValid) return cardsRes

  const catsRes = validateCategoriesPayload(categories)
  if (!catsRes.isValid) return catsRes

  const settingsRes = validateSettingsPayload(userSettings)
  if (!settingsRes.isValid) return settingsRes

  const historyRes = validateHistoryPayload(historyItems)
  if (!historyRes.isValid) return historyRes

  if (slotHistory !== undefined) {
    const res = validateSlotHistory(slotHistory)
    if (!res.isValid) return res
  }

  return { isValid: true }
}

function validateCardsPayload(styleCards: any): ValidationResult {
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
  return { isValid: true }
}

function validateCategoriesPayload(categories: any): ValidationResult {
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
  return { isValid: true }
}

function validateSettingsPayload(userSettings: any): ValidationResult {
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
  return { isValid: true }
}

function validateHistoryPayload(historyItems: any): ValidationResult {
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
  return { isValid: true }
}
