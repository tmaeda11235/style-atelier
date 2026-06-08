import type { ValidationResult } from "../backup-validator"

export function isString(val: any): boolean {
  return typeof val === "string"
}

export function isNumber(val: any): boolean {
  return typeof val === "number" && !isNaN(val)
}

export function isBoolean(val: any): boolean {
  return typeof val === "boolean"
}

export function isStringArray(val: any): boolean {
  return Array.isArray(val) && val.every((item) => typeof item === "string")
}

export function validatePromptSegment(
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

  return validateTypedSegment(segment, cardId, index)
}

function validateTypedSegment(
  segment: any,
  cardId: string,
  index: number
): ValidationResult {
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
