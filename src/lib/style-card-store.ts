import { db } from "./db"
import type { StyleCard } from "./db-schema"

/**
 * Retrieves a StyleCard by its unique ID.
 * Isolates the Dexie database dependency from the UI layer.
 */
export async function getStyleCardById(
  id: string
): Promise<StyleCard | undefined> {
  return await db.styleCards.get(id)
}
