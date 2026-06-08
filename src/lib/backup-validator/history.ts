import type { ValidationResult } from "../backup-validator"
import { isNumber, isString } from "./utils"

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
