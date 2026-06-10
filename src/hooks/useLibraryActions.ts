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
    if (pinnedCount >= 7) {
      setAlertType("hand_full")
      return
    }
    db.updateCard(card.id, { isPinned: true }).catch((err) =>
      console.error("Failed to pin card:", err)
    )
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
      }).catch((err) =>
        console.error("Failed to update usage count on inject:", err)
      )
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
        if (pinnedCount >= 7) {
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
  addLog: (msg: string) => void
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
    }
  }
}
