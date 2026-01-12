import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"

export function useHand() {
  const pinnedCards = useLiveQuery(() => db.styleCards.filter((card) => !!card.isPinned).toArray())

  const unpinCard = async (id: string) => {
    try {
      await db.styleCards.update(id, { isPinned: false })
    } catch (err) {
      console.error("Failed to unpin card:", err)
    }
  }

  const clearHand = async () => {
    if (!pinnedCards) return
    try {
      await Promise.all(pinnedCards.map((card) => db.styleCards.update(card.id, { isPinned: false })))
    } catch (err) {
      console.error("Failed to clear hand:", err)
    }
  }

  return {
    pinnedCards: pinnedCards || [],
    unpinCard,
    clearHand,
  }
}