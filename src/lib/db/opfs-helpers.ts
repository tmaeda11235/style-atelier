import type { CustomCategory, StyleCard } from "../db-schema"
import { saveBase64ToOpfs } from "./migration-helpers"

export async function processCardOpfs(card: StyleCard): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    return
  }
  if (card.thumbnailData && card.thumbnailData.startsWith("data:image/")) {
    const thumbnailPath = `images/cards/${card.id}.png`
    try {
      await saveBase64ToOpfs(thumbnailPath, card.thumbnailData)
      card.thumbnailPath = thumbnailPath
      delete card.thumbnailData
    } catch (err) {
      console.warn(`Failed to save thumbnail to OPFS for card ${card.id}:`, err)
    }
  }
}

export async function processCardChangesOpfs(
  id: string,
  changes: Partial<StyleCard>
): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    return
  }
  if (
    changes.thumbnailData &&
    changes.thumbnailData.startsWith("data:image/")
  ) {
    const thumbnailPath = `images/cards/${id}.png`
    try {
      await saveBase64ToOpfs(thumbnailPath, changes.thumbnailData)
      changes.thumbnailPath = thumbnailPath
      delete changes.thumbnailData
    } catch (err) {
      console.warn(
        `Failed to save thumbnail to OPFS for card ${id} during update:`,
        err
      )
    }
  }
}

export async function processCategoryOpfs(
  category: CustomCategory
): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    return
  }
  if (
    category.coverImageUrl &&
    category.coverImageUrl.startsWith("data:image/")
  ) {
    const coverImagePath = `images/categories/${category.id}.png`
    try {
      await saveBase64ToOpfs(coverImagePath, category.coverImageUrl)
      category.coverImagePath = coverImagePath
      delete category.coverImageUrl
    } catch (err) {
      console.warn(
        `Failed to save cover image to OPFS for category ${category.id}:`,
        err
      )
    }
  }
}

export async function processCategoryChangesOpfs(
  id: string,
  changes: Partial<CustomCategory>
): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    return
  }
  if (
    changes.coverImageUrl &&
    changes.coverImageUrl.startsWith("data:image/")
  ) {
    const coverImagePath = `images/categories/${id}.png`
    try {
      await saveBase64ToOpfs(coverImagePath, changes.coverImageUrl)
      changes.coverImagePath = coverImagePath
      delete changes.coverImageUrl
    } catch (err) {
      console.warn(
        `Failed to save cover image to OPFS for category ${id} during update:`,
        err
      )
    }
  }
}
