import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"

export function useHand() {
  const pinnedCards = useLiveQuery(() => db.getPinnedCards())

  const unpinCard = async (id: string) => {
    try {
      const card = await db.getCard(id)
      if (card?.isVariable) {
        await db.deleteCard(id)
      } else {
        await db.updateCard(id, { isPinned: false })
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
          card.isVariable ? db.deleteCard(card.id) : db.updateCard(card.id, { isPinned: false })
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