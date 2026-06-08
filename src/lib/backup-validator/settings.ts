import type { ValidationResult } from "../backup-validator"
import { isBoolean, isString, isStringArray } from "./utils"

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
  return validateBranding(setting.branding, userId)
}

function validateBranding(branding: any, userId: string): ValidationResult {
  if (!isBoolean(branding.enabled)) {
    return {
      isValid: false,
      error: `UserSettings(${userId}) 'branding.enabled' must be a boolean.`
    }
  }
  if (branding.customLogo !== undefined && !isString(branding.customLogo)) {
    return {
      isValid: false,
      error: `UserSettings(${userId}) 'branding.customLogo' must be a string.`
    }
  }
  if (
    branding.signatureName !== undefined &&
    !isString(branding.signatureName)
  ) {
    return {
      isValid: false,
      error: `UserSettings(${userId}) 'branding.signatureName' must be a string.`
    }
  }

  return { isValid: true }
}
