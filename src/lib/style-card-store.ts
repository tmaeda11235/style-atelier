import type { CustomCategory, StyleCard } from "../shared/lib/db-schema"
import { db } from "./db"

/**
 * Retrieves a StyleCard by its unique ID.
 * Isolates the Dexie database dependency from the UI layer.
 */
export async function getStyleCardById(
  id: string
): Promise<StyleCard | undefined> {
  return await db.getCard(id)
}

/**
 * Retrieves all non-deleted StyleCards.
 */
export function getAllStyleCards(): Promise<StyleCard[]> {
  return db.getAllCards()
}

/**
 * Retrieves pinned StyleCards.
 */
export function getPinnedStyleCards(): Promise<StyleCard[]> {
  return db.getPinnedCards()
}

/**
 * Retrieves all categories.
 */
export function getAllCategories(): Promise<CustomCategory[]> {
  return db.getAllCategories()
}

/**
 * Adds a new StyleCard to the database.
 */
export async function addStyleCard(card: StyleCard): Promise<string> {
  return await db.addCard(card)
}

/**
 * Updates an existing StyleCard.
 */
export async function updateStyleCard(
  id: string,
  changes: Partial<StyleCard>
): Promise<number> {
  return await db.updateCard(id, changes)
}

/**
 * Logical deletion of a StyleCard and cleans up category links.
 */
export async function deleteStyleCard(id: string): Promise<void> {
  return await db.deleteCard(id)
}
