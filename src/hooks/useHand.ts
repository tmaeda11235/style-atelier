import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"

export function useHand() {
  const pinnedCards = useLiveQuery(() => db.styleCards.filter((card) => !!card.isPinned).toArray())

  const unpinCard = async (id: string) => {
    try {
      const card = await db.styleCards.get(id)
      if (card?.isVariable) {
        await db.styleCards.delete(id)
      } else {
        await db.styleCards.update(id, { isPinned: false })
      }
    } catch (err) {
      console.error("Failed to unpin card:", err)
    }
  }

  const clearHand = async () => {
    if (!pinnedCards) return
    try {
      await Promise.all(
        pinnedCards.map((card) =>
          card.isVariable ? db.styleCards.delete(card.id) : db.styleCards.update(card.id, { isPinned: false })
        )
      )
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