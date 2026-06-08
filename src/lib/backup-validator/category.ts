import type { ValidationResult } from "../backup-validator"
import { isNumber, isString } from "./utils"

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
