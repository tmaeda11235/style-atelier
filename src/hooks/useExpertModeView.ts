import { useCallback, useEffect, useState } from "react"

import type { AlertType } from "../components/molecules/ConnectionAlert"
import { useConfirm } from "../contexts/ConfirmContext"
import { useTutorial } from "../contexts/TutorialContext"
import { db, seedDefaultCategories } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
import { useDragAndDrop } from "./useDragAndDrop"
import { useMinting } from "./useMinting"
import { useTabs } from "./useTabs"

interface UseExpertModeViewProps {
  isEasyMode: boolean
  onToggleEasyMode: (enabled: boolean) => void
}

function openMidjourney() {
  if (typeof chrome !== "undefined" && chrome.tabs?.update) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id)
        chrome.tabs.update(tabs[0].id, {
          url: "https://www.midjourney.com/imagine"
        })
    })
  } else {
    window.open("https://www.midjourney.com/imagine", "_blank")
  }
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

async function performDbReset(addLog: (log: string) => void) {
  await db.historyItems.clear()
  await db.styleCards.clear()
  await db.userSettings.clear()
  await db.categories.clear()
  await seedDefaultCategories()
  localStorage.removeItem("style-atelier-onboarding-seen")
  addLog("All data cleared.")
}

export function useExpertLogs() {
  const [logs, setLogs] = useState<string[]>([])
  const addLog = useCallback(
    (log: string) => setLogs((prev) => [log, ...prev].slice(0, 20)),
    []
  )
  const handleClearLogs = useCallback(() => setLogs([]), [])
  return { logs, addLog, handleClearLogs }
}

export function useExpertTutorial(
  setActiveTab: (tab: string) => void,
  startTutorial: () => void
) {
  const [showWelcome, setShowWelcome] = useState(false)
  useEffect(() => {
    if (!localStorage.getItem("style-atelier-onboarding-seen"))
      setShowWelcome(true)
  }, [])
  const handleStartTutorial = useCallback(() => {
    localStorage.setItem("style-atelier-onboarding-seen", "true")
    setShowWelcome(false)
    setActiveTab("history")
    startTutorial()
  }, [setActiveTab, startTutorial])
  const handleSkipTutorial = useCallback(() => {
    localStorage.setItem("style-atelier-onboarding-seen", "true")
    setShowWelcome(false)
  }, [])
  const handleOpenGuide = useCallback(() => {
    setActiveTab("history")
    startTutorial()
  }, [setActiveTab, startTutorial])
  return {
    showWelcome,
    setShowWelcome,
    handleStartTutorial,
    handleSkipTutorial,
    handleOpenGuide
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

  const { logs, addLog, handleClearLogs } = useExpertLogs()
  const tutorial = useExpertTutorial(setActiveTab, startTutorial)
  const cardOps = useExpertCardOperations(addLog, setAlertType, setActiveTab)
  const { handleInjectPrompt } = useExpertPromptInjection(
    addLog,
    setAlertType,
    cardOps.activeDetailCard
  )
  const dragMint = useExpertDragAndMint(addLog, setActiveTab, advanceIfStep)
  const handleToggleEasyModeInternal = useCallback(
    (enabled: boolean) => {
      onToggleEasyMode(enabled)
      if (enabled) setActiveTab("library")
    },
    [onToggleEasyMode, setActiveTab]
  )
  const handleResetDb = useCallback(async () => {
    if (
      await confirm({
        title: "Reset Database",
        message: "Are you sure you want to delete ALL DATA?",
        confirmText: "Reset",
        cancelText: "Cancel",
        variant: "danger"
      })
    ) {
      await performDbReset(addLog)
    }
  }, [confirm, addLog])
  return {
    activeTab,
    setActiveTab,
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
    handleRetryConnection: () => {
      chrome.tabs.reload()
      setAlertType(null)
    },
    handleDismissAlert: () => setAlertType(null),
    handleOpenMidjourney: openMidjourney,
    handleToggleEasyMode: handleToggleEasyModeInternal
  }
}
