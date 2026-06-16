import type { AlertType } from "../components/molecules/ConnectionAlert"
import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
import { buildPromptString } from "../lib/prompt-utils"
import type { StyleCardMetadata } from "./useLibraryData"

function injectPromptToActiveTab(
  prompt: string,
  onSuccess: () => void,
  onNoInput: () => void,
  onDisconnected: () => void
) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0]
    if (activeTab?.id) {
      chrome.tabs
        .sendMessage(activeTab.id, {
          type: "INJECT_PROMPT",
          prompt: prompt
        })
        .then((response) => {
          if (response && response.status === "error") {
            const isNoInput = response.message?.includes(
              "Could not find chat input"
            )
            if (isNoInput) onNoInput()
            else onDisconnected()
          } else {
            onSuccess()
          }
        })
        .catch((err) => {
          console.error("Library injection failed:", err)
          onDisconnected()
        })
    } else {
      onDisconnected()
    }
  })
}

function handleSlotCard(
  card: StyleCard | StyleCardMetadata,
  pinnedCount: number,
  setAlertType: (type: AlertType) => void,
  addLog: (msg: string) => void,
  onNavigateToWorkbench?: () => void
) {
  if (!card.isPinned) {
    if (pinnedCount >= 5) {
      setAlertType("hand_full")
      return
    }
    db.updateCard(card.id, { isPinned: true }).catch((err) => {
      console.error("Failed to pin card:", err)
      setAlertType("db_error")
    })
  }
  addLog(`Redirected to Workbench to fill slot variables for "${card.name}".`)
  if (onNavigateToWorkbench) {
    onNavigateToWorkbench()
  }
}

function handleNormalCard(
  card: StyleCard | StyleCardMetadata,
  addLog: (msg: string) => void,
  setAlertType: (type: AlertType) => void
) {
  const maskedKeys: (keyof StyleCard["parameters"])[] = []
  if (card.masking.isSrefHidden) {
    maskedKeys.push("sref")
  }
  if (card.masking.isPHidden) {
    maskedKeys.push("p")
  }
  const prompt = buildPromptString(
    card.promptSegments,
    card.parameters,
    maskedKeys
  )

  injectPromptToActiveTab(
    prompt,
    () => {
      addLog(`Sent prompt: ${prompt.substring(0, 30)}...`)
      db.updateCard(card.id, {
        usageCount: (card.usageCount || 0) + 1
      }).catch((err) => {
        console.error("Failed to update usage count on inject:", err)
        setAlertType("db_error")
      })
    },
    () => setAlertType("no_input"),
    () => setAlertType("disconnected")
  )
}

export function useTogglePin(
  allCardsMeta: StyleCardMetadata[] | undefined,
  addLog: (msg: string) => void,
  setAlertType: (type: AlertType) => void
) {
  return async (card: StyleCard | StyleCardMetadata, e: React.MouseEvent) => {
    e.stopPropagation()
    const newPinnedStatus = !card.isPinned
    try {
      const updateData: Partial<StyleCard> = { isPinned: newPinnedStatus }
      if (newPinnedStatus) {
        const pinnedCount = allCardsMeta?.filter((c) => c.isPinned).length || 0
        if (pinnedCount >= 5) {
          setAlertType("hand_full")
          return
        }
        updateData.usageCount = (card.usageCount || 0) + 1
      }
      await db.updateCard(card.id, updateData)
      addLog(
        newPinnedStatus
          ? `Added ${card.name} to Workbench.`
          : `Removed ${card.name} from Workbench.`
      )
    } catch (err) {
      console.error("Failed to toggle pin:", err)
      setAlertType("db_error")
    }
  }
}

export function useHandleCardClick(
  allCardsMeta: StyleCardMetadata[] | undefined,
  addLog: (msg: string) => void,
  setAlertType: (type: AlertType) => void,
  onNavigateToWorkbench?: () => void
) {
  return (card: StyleCard | StyleCardMetadata) => {
    const hasSlots = card.promptSegments?.some((seg) => seg.type === "slot")
    if (hasSlots) {
      const pinnedCount = allCardsMeta?.filter((c) => c.isPinned).length || 0
      handleSlotCard(
        card,
        pinnedCount,
        setAlertType,
        addLog,
        onNavigateToWorkbench
      )
    } else {
      handleNormalCard(card, addLog, setAlertType)
    }
  }
}

export function useMoveCardToCategory(
  categories: { id: string; name: string }[],
  addLog: (msg: string) => void,
  setAlertType?: (type: AlertType) => void
) {
  return async (cardId: string, categoryId: string | null) => {
    try {
      await db.updateCard(cardId, { category: categoryId || undefined })
      const catName = categoryId
        ? categories.find((c) => c.id === categoryId)?.name || "Folder"
        : "Root"
      addLog(`Moved card to "${catName}".`)
    } catch (err) {
      console.error("Failed to move card:", err)
      setAlertType?.("db_error")
    }
  }
}

export function useSortStyleCards(addLog: (msg: string) => void) {
  return async (
    draggedCardId: string,
    targetCardId: string,
    categoryFilter: string,
    currentFolderId: string | null
  ) => {
    try {
      const allCards = await db.getAllCards()
      const filtered = allCards.filter((card) => {
        if (card.isVariable) return false
        if (categoryFilter !== "All") {
          return card.category === categoryFilter
        } else {
          return !currentFolderId
            ? !card.category
            : card.category === currentFolderId
        }
      })

      // Sort existing cards by sortIndex (or fallback to createdAt newest first)
      filtered.sort((a, b) => {
        const sortA = a.sortIndex ?? 0
        const sortB = b.sortIndex ?? 0
        if (sortA !== sortB) return sortA - sortB
        return b.createdAt - a.createdAt
      })

      const draggedIndex = filtered.findIndex((c) => c.id === draggedCardId)
      const targetIndex = filtered.findIndex((c) => c.id === targetCardId)

      if (
        draggedIndex === -1 ||
        targetIndex === -1 ||
        draggedIndex === targetIndex
      ) {
        return
      }

      // Move element
      const [draggedCard] = filtered.splice(draggedIndex, 1)
      filtered.splice(targetIndex, 0, draggedCard)

      // Update sortIndex for all items in the filtered list
      await Promise.all(
        filtered.map((card, idx) => {
          return db.updateCard(card.id, { sortIndex: idx })
        })
      )

      addLog("Reordered cards within the binder.")
    } catch (err) {
      console.error("Failed to sort cards:", err)
    }
  }
}

export function useCardReorder(
  addLog: (msg: string) => void,
  categoryFilter: string,
  currentFolderId: string | null,
  setSortBy: (sort: any) => void
) {
  const sortStyleCards = useSortStyleCards(addLog)
  return async (draggedCardId: string, targetCardId: string) => {
    await sortStyleCards(
      draggedCardId,
      targetCardId,
      categoryFilter,
      currentFolderId
    )
    setSortBy("custom")
  }
}
