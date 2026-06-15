import { useLiveQuery } from "dexie-react-hooks"
import { useCallback, useMemo, useState } from "react"

import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
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
  setHistoryVersion: React.Dispatch<React.SetStateAction<number>>
) {
  const handleToggleCardSelection = useCallback(
    async (cardId: string) => {
      await pushSnapshot()
      await toggleCardSelection(cardId)
      setHistoryVersion((v) => v + 1)
    },
    [setHistoryVersion]
  )

  const handleClearWorkbench = useCallback(
    async (handCards: StyleCard[]) => {
      await pushSnapshot()
      await clearWorkbench(handCards)
      setHistoryVersion((v) => v + 1)
    },
    [setHistoryVersion]
  )

  const pickRandomCardsWithShuffle = useCallback(
    async (
      handCards: StyleCard[],
      setIsShuffling: (s: boolean) => void,
      setShuffleCards: (c: StyleCard[] | null) => void
    ) => {
      await pushSnapshot()
      await performShuffleAndPick(handCards, setIsShuffling, setShuffleCards)
      setHistoryVersion((v) => v + 1)
    },
    [setHistoryVersion]
  )

  const handleStartWeightAdjustment = useCallback(async () => {
    await pushSnapshot()
    setHistoryVersion((v) => v + 1)
  }, [setHistoryVersion])

  return {
    toggleCardSelection: handleToggleCardSelection,
    clearWorkbench: handleClearWorkbench,
    pickRandomCards: pickRandomCardsWithShuffle,
    startWeightAdjustment: handleStartWeightAdjustment
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
    startWeightAdjustment: mutateStartWeight
  } = useWorkbenchMutations(setHistoryVersion)

  const { canUndo, canRedo } = useWorkbenchHistoryStatus(historyVersion)

  return {
    handCards,
    workbenchCards,
    isShuffling,
    selectedCardIds,
    toggleCardSelection: mutateToggle,
    clearWorkbench: useCallback(
      () => mutateClear(handCards),
      [mutateClear, handCards]
    ),
    pickRandomCards: useCallback(
      () => mutatePick(handCards, setIsShuffling, setShuffleCards),
      [mutatePick, handCards, setIsShuffling, setShuffleCards]
    ),
    mergedPrompt,
    slotHistory,
    saveSlotHistory,
    addCard,
    incrementCardUsage,
    updateCardWeight: useCallback(async (cardId: string, weight: number) => {
      await updateCardWeight(cardId, weight)
    }, []),
    startWeightAdjustment: mutateStartWeight,
    undo: historyUndo,
    redo: historyRedo,
    canUndo,
    canRedo
  }
}
