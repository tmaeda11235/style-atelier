import { useCallback, useState } from "react"

import type { AlertType } from "../components/molecules/ConnectionAlert"
import { useConfirm } from "../contexts/ConfirmContext"
import { useTutorial } from "../contexts/TutorialContext"
import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
import { useDragAndDrop } from "./useDragAndDrop"
import { useExpertLogs } from "./useExpertLogs"
import { useExpertTutorial } from "./useExpertTutorial"
import { useMinting } from "./useMinting"
import { useTabs } from "./useTabs"

interface UseExpertModeViewProps {
  isEasyMode: boolean
  onToggleEasyMode: (enabled: boolean) => void
}

async function openMidjourney() {
  if (typeof chrome !== "undefined" && chrome.tabs?.query) {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      if (tabs?.[0]?.id) {
        chrome.tabs.update(
          tabs[0].id,
          { url: "https://www.midjourney.com/imagine" },
          () => {}
        )
        return
      }
    } catch (err) {
      console.error("Failed to query tabs:", err)
    }
  }
  window.open("https://www.midjourney.com/imagine", "_blank")
}

async function saveCardDetails(
  updatedCard: StyleCard,
  addLog: (log: string) => void
) {
  try {
    await db.styleCards.put(updatedCard)
    addLog(`StyleCard "${updatedCard.name}" updated successfully!`)
  } catch (err) {
    console.error("Failed to save style card updates:", err)
    addLog("Error: Failed to save style card updates.")
  }
}

async function deleteCard(cardId: string, addLog: (log: string) => void) {
  try {
    await db.deleteStyleCardAndCleanup(cardId)
    addLog("StyleCard deleted successfully.")
  } catch (err) {
    console.error("Failed to delete style card:", err)
    addLog("Error: Failed to delete style card.")
  }
}

async function sendToWorkbench(
  card: StyleCard,
  addLog: (log: string) => void,
  setAlertType: (type: AlertType) => void
) {
  try {
    if (!card.isPinned) {
      const pinnedCount = await db.styleCards
        .filter((c) => !!c.isPinned)
        .count()
      if (pinnedCount >= 5) {
        setAlertType("hand_full")
        return false
      }
      await db.updateCard(card.id, {
        isPinned: true,
        usageCount: (card.usageCount || 0) + 1
      })
      addLog(`Added ${card.name} to Workbench.`)
    }
    return true
  } catch (err) {
    console.error("Failed to send card to workbench:", err)
    addLog("Error: Failed to send card to workbench.")
    return false
  }
}

async function injectPrompt(
  prompt: string,
  addLog: (log: string) => void,
  setAlertType: (type: AlertType) => void,
  activeDetailCard: StyleCard | null
) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const activeTabEl = tabs[0]
    if (!activeTabEl?.id) throw new Error("No active tab found")
    const response = await chrome.tabs.sendMessage(activeTabEl.id, {
      type: "INJECT_PROMPT",
      prompt
    })
    if (response?.status === "error") {
      const isChatInput = response.message?.includes(
        "Could not find chat input"
      )
      setAlertType(isChatInput ? "no_input" : "disconnected")
    } else {
      addLog(`Sent prompt: ${prompt.substring(0, 30)}...`)
      if (activeDetailCard) {
        db.styleCards
          .update(activeDetailCard.id, {
            usageCount: (activeDetailCard.usageCount || 0) + 1
          })
          .catch((err) =>
            console.error(
              "Failed to update usage count on details inject:",
              err
            )
          )
      }
    }
  } catch (err: any) {
    console.error("Injection failed:", err)
    setAlertType("disconnected")
    addLog(`Note: ${err.message || "Could not send to tab"}`)
  }
}

export function useExpertCardOperations(
  addLog: (log: string) => void,
  setAlertType: (type: AlertType) => void,
  setActiveTab: (tab: string) => void
) {
  const [activeDetailCard, setActiveDetailCard] = useState<StyleCard | null>(
    null
  )
  const handleSaveCardDetails = useCallback(
    async (updatedCard: StyleCard) => {
      await saveCardDetails(updatedCard, addLog)
      setActiveDetailCard(null)
    },
    [addLog]
  )
  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      await deleteCard(cardId, addLog)
      setActiveDetailCard(null)
    },
    [addLog]
  )
  const handleSendToWorkbench = useCallback(
    async (card: StyleCard) => {
      const ok = await sendToWorkbench(card, addLog, setAlertType)
      if (ok) {
        setActiveDetailCard(null)
        setActiveTab("workbench")
      }
    },
    [addLog, setAlertType, setActiveTab]
  )
  return {
    activeDetailCard,
    setActiveDetailCard,
    handleSaveCardDetails,
    handleDeleteCard,
    handleSendToWorkbench
  }
}

export function useExpertPromptInjection(
  addLog: (log: string) => void,
  setAlertType: (type: AlertType) => void,
  activeDetailCard: StyleCard | null
) {
  const handleInjectPrompt = useCallback(
    async (prompt: string) => {
      setAlertType(null)
      await injectPrompt(prompt, addLog, setAlertType, activeDetailCard)
    },
    [addLog, setAlertType, activeDetailCard]
  )
  return { handleInjectPrompt }
}

export function useExpertDragAndMint(
  addLog: (log: string) => void,
  setActiveTab: (tab: string) => void,
  advanceIfStep: (stepId: string) => void
) {
  const { handleDrop: rawHandleDrop, ...dragProps } = useDragAndDrop(addLog)
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      const result = (await rawHandleDrop(e)) as any
      if (result) {
        if (result.isImport) setActiveTab("library")
        else advanceIfStep("drop-history")
      }
    },
    [rawHandleDrop, setActiveTab, advanceIfStep]
  )
  const minting = useMinting(addLog, setActiveTab)
  const handleStartMinting = useCallback(
    (historyItem: any) => {
      minting.handleStartMinting(historyItem)
      advanceIfStep("mint-button")
    },
    [minting, advanceIfStep]
  )
  return { ...dragProps, handleDrop, minting, handleStartMinting }
}

export function useExpertModeView({
  isEasyMode: _isEasyMode,
  onToggleEasyMode
}: UseExpertModeViewProps) {
  const confirm = useConfirm()
  const { startTutorial, advanceIfStep } = useTutorial()
  const { activeTab, setActiveTab } = useTabs()
  const [alertType, setAlertType] = useState<AlertType>(null)

  const { logs, addLog, handleClearLogs, handleResetDb } =
    useExpertLogs(confirm)
  const tutorial = useExpertTutorial(
    setActiveTab,
    startTutorial,
    onToggleEasyMode
  )
  const cardOps = useExpertCardOperations(addLog, setAlertType, setActiveTab)
  const { setActiveDetailCard } = cardOps
  const { handleInjectPrompt } = useExpertPromptInjection(
    addLog,
    setAlertType,
    cardOps.activeDetailCard
  )
  const dragMint = useExpertDragAndMint(addLog, setActiveTab, advanceIfStep)

  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab)
      dragMint.minting.setMintingItem(null)
      dragMint.minting.setVariationBase(null)
      setActiveDetailCard(null)
    },
    [setActiveTab, dragMint.minting, setActiveDetailCard]
  )

  const handleRetryConnection = useCallback(() => {
    if (typeof chrome !== "undefined" && chrome.tabs?.reload) {
      chrome.tabs.reload()
    } else {
      window.location.reload()
    }
    setAlertType(null)
  }, [])

  const sidePanelLayoutProps = {
    activeTab,
    onTabChange: handleTabChange,
    isDragging: dragMint.isDragging,
    isDraggingFile: dragMint.isDraggingFile,
    isImporting: dragMint.isImporting,
    logs,
    onClearLogs: handleClearLogs,
    onResetDb: handleResetDb,
    droppedItem: dragMint.droppedItem,
    onClearDroppedItem: dragMint.clearDroppedItem,
    alertType,
    onRetryConnection: handleRetryConnection,
    onDismissAlert: () => setAlertType(null),
    onOpenGuide: tutorial.handleOpenGuide,
    isEasyMode: _isEasyMode
  }

  return {
    activeTab,
    setActiveTab,
    handleTabChange,
    sidePanelLayoutProps,
    logs,
    alertType,
    setAlertType,
    ...cardOps,
    ...tutorial,
    ...dragMint,
    addLog,
    handleInjectPrompt,
    handleResetDb,
    handleClearLogs,
    handleRetryConnection,
    handleDismissAlert: () => setAlertType(null),
    handleOpenMidjourney: openMidjourney
  }
}
