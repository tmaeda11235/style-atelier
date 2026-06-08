import type { ValidationResult } from "../backup-validator"
import { isString, isStringArray } from "./utils"

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
