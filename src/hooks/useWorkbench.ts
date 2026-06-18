import { useLiveQuery } from "dexie-react-hooks"
import { useCallback, useMemo, useState } from "react"

import { db } from "../lib/db"
import { buildMergedPromptString } from "../lib/prompt-reference-utils"
import {
  addCard,
  clearWorkbench,
  incrementCardUsage,
  performShuffleAndPick,
  saveSlotHistory,
  toggleCardSelection,
  updateCardWeight
} from "../lib/workbench-db-utils"
import type { RecipeHistoryItem, StyleCard } from "../shared/lib/db-schema"

interface PinnedCardState {
  id: string
  weight: number
  isVariable: boolean
  cardData?: any
}

interface WorkbenchSnapshot {
  pinnedCards: PinnedCardState[]
}

const pastStack: WorkbenchSnapshot[] = []
const futureStack: WorkbenchSnapshot[] = []

function isSameSnapshot(a: WorkbenchSnapshot, b: WorkbenchSnapshot): boolean {
  if (a.pinnedCards.length !== b.pinnedCards.length) return false
  return a.pinnedCards.every((ca, i) => {
    const cb = b.pinnedCards[i]
    return ca.id === cb.id && ca.weight === cb.weight
  })
}

async function takeSnapshot(): Promise<WorkbenchSnapshot> {
  const pinned = await db.styleCards
    .filter((c) => !c.isDeleted && !!c.isPinned)
    .toArray()
  return {
    pinnedCards: pinned.map((c) => ({
      id: c.id,
      weight: c.weight !== undefined ? c.weight : 1.0,
      isVariable: !!c.isVariable,
      cardData: c.isVariable ? { ...c } : undefined
    }))
  }
}

async function pushSnapshot() {
  const current = await takeSnapshot()
  const last = pastStack[pastStack.length - 1]
  if (last && isSameSnapshot(last, current)) {
    return
  }
  pastStack.push(current)
  futureStack.length = 0
}

async function removeUnneededCards(
  currentPinned: StyleCard[],
  snapshot: WorkbenchSnapshot
) {
  for (const card of currentPinned) {
    const target = snapshot.pinnedCards.find((c) => c.id === card.id)
    if (!target) {
      if (card.isVariable) {
        await db.deleteCard(card.id)
      } else {
        await db.styleCards.update(card.id, { isPinned: false })
      }
    }
  }
}

async function restorePinnedState(state: PinnedCardState) {
  if (state.isVariable) {
    const existing = await db.styleCards.get(state.id)
    if (!existing && state.cardData) {
      await db.styleCards.put({
        ...state.cardData,
        isPinned: true,
        weight: state.weight
      })
    } else {
      await db.styleCards.update(state.id, {
        isPinned: true,
        weight: state.weight
      })
    }
  } else {
    await db.styleCards.update(state.id, {
      isPinned: true,
      weight: state.weight
    })
  }
}

async function applySnapshot(snapshot: WorkbenchSnapshot) {
  const currentPinned = await db.styleCards
    .filter((c) => !c.isDeleted && !!c.isPinned)
    .toArray()

  await removeUnneededCards(currentPinned, snapshot)

  for (const state of snapshot.pinnedCards) {
    await restorePinnedState(state)
  }
}

async function undo() {
  if (pastStack.length === 0) return
  const current = await takeSnapshot()
  const previous = pastStack.pop()!
  futureStack.push(current)
  await applySnapshot(previous)
}

async function redo() {
  if (futureStack.length === 0) return
  const current = await takeSnapshot()
  const next = futureStack.pop()!
  pastStack.push(current)
  await applySnapshot(next)
}

function useWorkbenchUndoRedo(
  setHistoryVersion: React.Dispatch<React.SetStateAction<number>>
) {
  const handleUndo = useCallback(async () => {
    await undo()
    setHistoryVersion((v) => v + 1)
  }, [setHistoryVersion])

  const handleRedo = useCallback(async () => {
    await redo()
    setHistoryVersion((v) => v + 1)
  }, [setHistoryVersion])

  return { undo: handleUndo, redo: handleRedo }
}

function useWorkbenchMutations(
  setHistoryVersion: React.Dispatch<React.SetStateAction<number>>,
  handCards: StyleCard[],
  setIsShuffling: (s: boolean) => void,
  setShuffleCards: (c: StyleCard[] | null) => void
) {
  const handleToggleCardSelection = useCallback(
    async (cardId: string) => {
      await pushSnapshot()
      await toggleCardSelection(cardId)
      setHistoryVersion((v) => v + 1)
    },
    [setHistoryVersion]
  )

  const handleClearWorkbench = useCallback(async () => {
    await pushSnapshot()
    await clearWorkbench(handCards)
    setHistoryVersion((v) => v + 1)
  }, [setHistoryVersion, handCards])

  const pickRandomCardsWithShuffle = useCallback(async () => {
    await pushSnapshot()
    await performShuffleAndPick(handCards, setIsShuffling, setShuffleCards)
    setHistoryVersion((v) => v + 1)
  }, [setHistoryVersion, handCards, setIsShuffling, setShuffleCards])

  const handleStartWeightAdjustment = useCallback(async () => {
    await pushSnapshot()
    setHistoryVersion((v) => v + 1)
  }, [setHistoryVersion])

  const handleUpdateCardWeight = useCallback(
    async (cardId: string, weight: number) => {
      await updateCardWeight(cardId, weight)
    },
    []
  )

  return {
    toggleCardSelection: handleToggleCardSelection,
    clearWorkbench: handleClearWorkbench,
    pickRandomCards: pickRandomCardsWithShuffle,
    startWeightAdjustment: handleStartWeightAdjustment,
    updateCardWeight: handleUpdateCardWeight
  }
}

export async function restoreRecipe(recipe: RecipeHistoryItem) {
  try {
    const allCards = await db.styleCards.toArray()
    const pinnedCards = allCards.filter((c) => c.isPinned)
    await Promise.all(
      pinnedCards.map((card) =>
        card.isVariable
          ? db.styleCards.delete(card.id)
          : db.styleCards.update(card.id, { isPinned: false })
      )
    )

    await Promise.all(
      recipe.cards.map(async (rc) => {
        const card = await db.styleCards.get(rc.id)
        if (card && !card.isDeleted) {
          await db.styleCards.update(rc.id, {
            isPinned: true,
            weight: rc.weight
          })
        }
      })
    )
  } catch (err) {
    console.error("Failed to restore recipe:", err)
  }
}

export async function deleteRecipeHistory(id: string) {
  try {
    await db.deleteRecipeHistory(id)
  } catch (err) {
    console.error("Failed to delete recipe history:", err)
  }
}

function useWorkbenchCards(
  isShuffling: boolean,
  shuffleCards: StyleCard[] | null
) {
  const handCardsList = useLiveQuery(() =>
    db.styleCards.filter((c) => !!c.isPinned).toArray()
  )
  const handCards = useMemo(() => handCardsList || [], [handCardsList])

  const workbenchCards = useMemo(() => {
    if (isShuffling && shuffleCards) return shuffleCards
    return handCards
  }, [isShuffling, shuffleCards, handCards])

  const selectedCardIds = useMemo(
    () => workbenchCards.map((c) => c.id),
    [workbenchCards]
  )
  const mergedPrompt = useMemo(
    () => buildMergedPromptString(workbenchCards),
    [workbenchCards]
  )

  const rawSlotHistory = useLiveQuery(() => db.getAllSlotHistory())
  const slotHistory = useMemo(() => rawSlotHistory || {}, [rawSlotHistory])

  return {
    handCards,
    workbenchCards,
    selectedCardIds,
    mergedPrompt,
    slotHistory
  }
}

function useWorkbenchHistoryStatus(historyVersion: number) {
  const canUndo = useMemo(() => {
    // Reference historyVersion to force re-evaluation of this memo when history version updates
    const _dummy = historyVersion
    return pastStack.length > 0
  }, [historyVersion])

  const canRedo = useMemo(() => {
    // Reference historyVersion to force re-evaluation of this memo when history version updates
    const _dummy = historyVersion
    return futureStack.length > 0
  }, [historyVersion])

  return { canUndo, canRedo }
}

export function useWorkbench() {
  const [isShuffling, setIsShuffling] = useState(false)
  const [shuffleCards, setShuffleCards] = useState<StyleCard[] | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)

  const {
    handCards,
    workbenchCards,
    selectedCardIds,
    mergedPrompt,
    slotHistory
  } = useWorkbenchCards(isShuffling, shuffleCards)

  const { undo: historyUndo, redo: historyRedo } =
    useWorkbenchUndoRedo(setHistoryVersion)
  const {
    toggleCardSelection: mutateToggle,
    clearWorkbench: mutateClear,
    pickRandomCards: mutatePick,
    startWeightAdjustment: mutateStartWeight,
    updateCardWeight: mutateUpdateWeight
  } = useWorkbenchMutations(
    setHistoryVersion,
    handCards,
    setIsShuffling,
    setShuffleCards
  )

  const { canUndo, canRedo } = useWorkbenchHistoryStatus(historyVersion)

  return {
    handCards,
    workbenchCards,
    isShuffling,
    selectedCardIds,
    toggleCardSelection: mutateToggle,
    clearWorkbench: mutateClear,
    pickRandomCards: mutatePick,
    mergedPrompt,
    slotHistory,
    saveSlotHistory,
    addCard,
    incrementCardUsage,
    updateCardWeight: mutateUpdateWeight,
    startWeightAdjustment: mutateStartWeight,
    undo: historyUndo,
    redo: historyRedo,
    canUndo,
    canRedo,
    recipeHistory: useLiveQuery(() => db.getRecipeHistory()) || [],
    restoreRecipe,
    deleteRecipeHistory
  }
}
