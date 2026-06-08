import type { ValidationResult } from "../backup-validator"
import { validateCardParameters, validateCardTcg } from "./card-details"
import {
  isBoolean,
  isNumber,
  isString,
  isStringArray,
  validatePromptSegment
} from "./utils"

export function validateStyleCard(card: any, index: number): ValidationResult {
  if (!card || typeof card !== "object") {
    return { isValid: false, error: `StyleCards[${index}] is not an object.` }
  }

  const cardId = isString(card.id) ? card.id : `Index ${index}`

  const identityRes = validateCardIdentity(card, cardId, index)
  if (!identityRes.isValid) return identityRes

  const segmentRes = validateCardPromptSegments(card, cardId)
  if (!segmentRes.isValid) return segmentRes

  const paramRes = validateCardParameters(card, cardId)
  if (!paramRes.isValid) return paramRes

  const maskingRes = validateCardMasking(card, cardId)
  if (!maskingRes.isValid) return maskingRes

  const tcgRes = validateCardTcg(card, cardId)
  if (!tcgRes.isValid) return tcgRes

  const visualRes = validateCardVisuals(card, cardId)
  if (!visualRes.isValid) return visualRes

  const geneRes = validateCardGenealogy(card, cardId)
  if (!geneRes.isValid) return geneRes

  const varRes = validateCardVariables(card, cardId)
  if (!varRes.isValid) return varRes

  return validateCardVersionHistory(card, cardId)
}

function validateCardIdentity(
  card: any,
  cardId: string,
  index: number
): ValidationResult {
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
  return { isValid: true }
}

function validateCardPromptSegments(
  card: any,
  cardId: string
): ValidationResult {
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
  return { isValid: true }
}

function validateCardMasking(card: any, cardId: string): ValidationResult {
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
  return { isValid: true }
}

function validateCardVisuals(card: any, cardId: string): ValidationResult {
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
  return { isValid: true }
}

function validateCardGenealogy(card: any, cardId: string): ValidationResult {
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
      error: `Card(${cardId}) 'originCreatorId' must be a string.`
    }
  }
  if (
    card.genealogy.mutationNote !== undefined &&
    !isString(card.genealogy.mutationNote)
  ) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'mutationNote' must be a string.`
    }
  }
  return { isValid: true }
}

function validateCardVariables(card: any, cardId: string): ValidationResult {
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
  return { isValid: true }
}

function validateCardVersionHistory(
  card: any,
  cardId: string
): ValidationResult {
  if (card.versionHistory === undefined) return { isValid: true }
  if (!Array.isArray(card.versionHistory)) {
    return {
      isValid: false,
      error: `Card(${cardId}) 'versionHistory' must be an array.`
    }
  }
  for (let i = 0; i < card.versionHistory.length; i++) {
    const v = card.versionHistory[i]
    const res = validateSingleVersion(v, cardId, i)
    if (!res.isValid) return res
  }
  return { isValid: true }
}

function validateSingleVersion(
  v: any,
  cardId: string,
  index: number
): ValidationResult {
  if (!v || typeof v !== "object") {
    return {
      isValid: false,
      error: `Card(${cardId}) versionHistory[${index}] must be an object.`
    }
  }
  if (!isString(v.id)) {
    return {
      isValid: false,
      error: `Card(${cardId}) versionHistory[${index}].id must be a string.`
    }
  }
  if (!isNumber(v.timestamp)) {
    return {
      isValid: false,
      error: `Card(${cardId}) versionHistory[${index}].timestamp must be a number.`
    }
  }
  if (!isString(v.name)) {
    return {
      isValid: false,
      error: `Card(${cardId}) versionHistory[${index}].name must be a string.`
    }
  }

  const label = `${cardId}-version[${index}]`
  const segRes = validateCardPromptSegments(v, label)
  if (!segRes.isValid) return segRes

  return validateCardParameters(v, label)
}
