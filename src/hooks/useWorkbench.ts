import { useLiveQuery } from "dexie-react-hooks"
import { useMemo } from "react"

import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
import { buildMergedPromptString } from "../lib/prompt-utils"

export async function toggleCardSelection(cardId: string) {
  try {
    const card = await db.styleCards.get(cardId)
    if (card) {
      if (card.isVariable) {
        await db.styleCards.delete(cardId)
      } else {
        await db.styleCards.update(cardId, { isPinned: !card.isPinned })
      }
    }
  } catch (err) {
    console.error("Failed to toggle card selection:", err)
  }
}

export async function clearWorkbench(handCards: StyleCard[]) {
  try {
    await Promise.all(
      handCards.map((card) =>
        card.isVariable
          ? db.styleCards.delete(card.id)
          : db.styleCards.update(card.id, { isPinned: false })
      )
    )
  } catch (err) {
    console.error("Failed to clear workbench:", err)
  }
}

export async function saveSlotHistory(label: string, values: string[]) {
  try {
    await db.saveSlotHistory(label, values)
  } catch (err) {
    console.error("Failed to save slot history:", err)
  }
}

export async function addCard(card: any) {
  try {
    return await db.addCard(card)
  } catch (err) {
    console.error("Failed to add card:", err)
    throw err
  }
}

export async function incrementCardUsage(cardId: string) {
  try {
    const card = await db.styleCards.get(cardId)
    if (card) {
      await db.styleCards.update(cardId, {
        usageCount: (card.usageCount || 0) + 1
      })
    }
  } catch (err) {
    console.error("Failed to increment card usage:", err)
  }
}

export async function updateCardWeight(cardId: string, weight: number) {
  try {
    await db.styleCards.update(cardId, { weight })
  } catch (err) {
    console.error("Failed to update card weight:", err)
  }
}

export async function pickRandomCards(handCards: StyleCard[]) {
  try {
    await clearWorkbench(handCards)
    const allCards = await db.getAllCards()
    const validCards = allCards.filter((c) => !c.isDeleted && !c.isVariable)
    if (validCards.length === 0) return

    // Pick 1 to 3 random cards
    const count = Math.min(validCards.length, Math.floor(Math.random() * 3) + 1)
    const selected: StyleCard[] = []
    const temp = [...validCards]
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * temp.length)
      selected.push(temp[idx])
      temp.splice(idx, 1)
    }

    await Promise.all(
      selected.map((c) => db.styleCards.update(c.id, { isPinned: true }))
    )
  } catch (err) {
    console.error("Failed to pick random cards:", err)
  }
}

export function useWorkbench() {
  const handCardsList = useLiveQuery(() =>
    db.styleCards.filter((c) => !!c.isPinned).toArray()
  )
  const handCards = useMemo(() => handCardsList || [], [handCardsList])

  const workbenchCards = useMemo(() => handCards, [handCards])

  const selectedCardIds = useMemo(() => {
    return workbenchCards.map((c) => c.id)
  }, [workbenchCards])

  const mergedPrompt = useMemo(() => {
    return buildMergedPromptString(workbenchCards)
  }, [workbenchCards])

  const rawSlotHistory = useLiveQuery(() => db.getAllSlotHistory())
  const slotHistory = useMemo(() => rawSlotHistory || {}, [rawSlotHistory])

  return {
    handCards,
    workbenchCards,
    selectedCardIds,
    toggleCardSelection,
    clearWorkbench: () => clearWorkbench(handCards),
    pickRandomCards: () => pickRandomCards(handCards),
    mergedPrompt,
    slotHistory,
    saveSlotHistory,
    addCard,
    incrementCardUsage,
    updateCardWeight
  }
}
