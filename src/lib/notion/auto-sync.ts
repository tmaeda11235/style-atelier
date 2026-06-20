import type { StyleCard } from "../../shared/lib/db-schema"
import { computeHash } from "../../shared/lib/db/migration-helpers"
import { db } from "../db"
import {
  getNotionCredentials,
  sendCardToNotion,
  updateCardInNotion
} from "./client"

export async function computeCardHash(card: StyleCard): Promise<string> {
  const encoder = new TextEncoder()
  const buf = encoder.encode(JSON.stringify(card)).buffer
  return computeHash(buf)
}

export function isNotionSyncActive(): boolean {
  return localStorage.getItem("style-atelier-license-status") === "valid"
}

export async function syncCardToNotion(card: StyleCard): Promise<void> {
  if (!isNotionSyncActive()) return

  const credentials = await getNotionCredentials()
  if (!credentials || !credentials.apiKey || !credentials.databaseId) {
    return
  }

  const hash = await computeCardHash(card)

  // Check if already synced and unchanged
  const syncState = await db.notionSyncStates.get(card.id)
  if (syncState && syncState.lastSyncedHash === hash) {
    return // No change
  }

  try {
    if (syncState && syncState.notionPageId) {
      // Update existing page
      await updateCardInNotion(syncState.notionPageId, card, credentials)
      await db.notionSyncStates.put({
        cardId: card.id,
        notionPageId: syncState.notionPageId,
        lastSyncedAt: Date.now(),
        lastSyncedHash: hash
      })
    } else {
      // Create new page
      const result = await sendCardToNotion(card, credentials)
      await db.notionSyncStates.put({
        cardId: card.id,
        notionPageId: result.pageId,
        lastSyncedAt: Date.now(),
        lastSyncedHash: hash
      })
    }
  } catch (error) {
    console.error("Failed to sync card to Notion:", error)
  }
}

let hooksRegistered = false

export function initializeNotionAutoSync() {
  if (hooksRegistered) return

  const triggerNotionSync = (card: StyleCard) => {
    if (card.isDeleted) return

    // Run asynchronously without blocking transaction
    setTimeout(async () => {
      await syncCardToNotion(card)
    }, 0)
  }

  db.styleCards.hook("creating", (primKey, obj, transaction) => {
    if (transaction && transaction.on) {
      transaction.on("complete", () => {
        triggerNotionSync(obj)
      })
    }
  })

  db.styleCards.hook("updating", (mods, primKey, obj, transaction) => {
    if (transaction && transaction.on) {
      transaction.on("complete", () => {
        triggerNotionSync(obj)
      })
    }
  })

  hooksRegistered = true
}
