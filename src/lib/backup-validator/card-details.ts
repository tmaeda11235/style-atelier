import type { ValidationResult } from "../backup-validator"
import { isBoolean, isNumber, isString, isStringArray } from "./utils"

export function validateCardParameters(
  card: any,
  cardId: string
): ValidationResult {
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
  return validateCardNumberParameters(params, cardId)
}

function validateCardNumberParameters(
  params: any,
  cardId: string
): ValidationResult {
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
  return { isValid: true }
}

export function validateCardTcg(card: any, cardId: string): ValidationResult {
  const allowedTiers = ["Common", "Rare", "Epic", "Legendary"]
  if (!allowedTiers.includes(card.tier)) {
    return {
      isValid: false,
      error: `Card(${cardId}) has invalid tier: '${
        card.tier
      }'. Allowed: ${allowedTiers.join(", ")}`
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
  return validateCardTcgColors(card, cardId)
}

function validateCardTcgColors(card: any, cardId: string): ValidationResult {
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
  return { isValid: true }
}
