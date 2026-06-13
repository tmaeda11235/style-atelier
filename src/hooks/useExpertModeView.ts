import { useEffect, useState } from "react"

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

/**
 * Custom hook encapsulating the logic and state for the Expert Mode of the Style Atelier Sidepanel.
 */
export function useExpertModeView({
  onToggleEasyMode
}: UseExpertModeViewProps) {
  const confirm = useConfirm()
  const { startTutorial, advanceIfStep } = useTutorial()
  const { activeTab, setActiveTab } = useTabs()
  const [logs, setLogs] = useState<string[]>([])
  const [alertType, setAlertType] = useState<AlertType>(null)
  const [activeDetailCard, setActiveDetailCard] = useState<StyleCard | null>(
    null
  )
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem("style-atelier-onboarding-seen")
    if (!seen) {
      setShowWelcome(true)
    }
  }, [])

  const addLog = (log: string) => {
    setLogs((prev) => [log, ...prev].slice(0, 20))
  }

  const handleToggleEasyModeInternal = (enabled: boolean) => {
    onToggleEasyMode(enabled)
    if (enabled) {
      setActiveTab("library")
    }
  }

  const handleStartTutorial = () => {
    localStorage.setItem("style-atelier-onboarding-seen", "true")
    setShowWelcome(false)
    setActiveTab("history")
    startTutorial()
  }

  const handleSkipTutorial = () => {
    localStorage.setItem("style-atelier-onboarding-seen", "true")
    setShowWelcome(false)
  }

  const handleSaveCardDetails = async (updatedCard: StyleCard) => {
    try {
      await db.styleCards.put(updatedCard)
      addLog(`StyleCard "${updatedCard.name}" updated successfully!`)
      setActiveDetailCard(null)
    } catch (err) {
      console.error("Failed to save style card updates:", err)
      addLog("Error: Failed to save style card updates.")
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    try {
      await db.deleteStyleCardAndCleanup(cardId)
      addLog("StyleCard deleted successfully.")
      setActiveDetailCard(null)
    } catch (err) {
      console.error("Failed to delete style card:", err)
      addLog("Error: Failed to delete style card.")
    }
  }

  const handleSendToWorkbench = async (card: StyleCard) => {
    try {
      if (!card.isPinned) {
        const pinnedCount = await db.styleCards
          .filter((c) => !!c.isPinned)
          .count()
        if (pinnedCount >= 5) {
          setAlertType("hand_full")
          return
        }
        await db.updateCard(card.id, {
          isPinned: true,
          usageCount: (card.usageCount || 0) + 1
        })
        addLog(`Added ${card.name} to Workbench.`)
      }
      setActiveDetailCard(null)
      setActiveTab("workbench")
    } catch (err) {
      console.error("Failed to send card to workbench:", err)
      addLog("Error: Failed to send card to workbench.")
    }
  }

  const handleInjectPrompt = async (prompt: string) => {
    setAlertType(null)
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      const activeTabEl = tabs[0]
      if (!activeTabEl?.id) {
        throw new Error("No active tab found")
      }
      const response = await chrome.tabs.sendMessage(activeTabEl.id, {
        type: "INJECT_PROMPT",
        prompt: prompt
      })
      if (response && response.status === "error") {
        if (
          response.message &&
          response.message.includes("Could not find chat input")
        ) {
          setAlertType("no_input")
        } else {
          setAlertType("disconnected")
        }
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

  const {
    isDragging,
    isDraggingFile,
    isImporting,
    droppedItem,
    clearDroppedItem,
    handleDragOver,
    handleDragLeave,
    handleDrop: rawHandleDrop
  } = useDragAndDrop(addLog)

  const handleDrop = async (e: React.DragEvent) => {
    const result = (await rawHandleDrop(e)) as any
    if (result) {
      if (result.isImport) {
        setActiveTab("library")
      } else {
        advanceIfStep("drop-history")
      }
    }
  }

  const minting = useMinting(addLog, setActiveTab)

  const handleStartMinting = (historyItem: any) => {
    minting.handleStartMinting(historyItem)
    advanceIfStep("mint-button")
  }

  const handleResetDb = async () => {
    const ok = await confirm({
      title: "Reset Database",
      message: "Are you sure you want to delete ALL DATA?",
      confirmText: "Reset",
      cancelText: "Cancel",
      variant: "danger"
    })
    if (ok) {
      await Promise.all([
        db.historyItems.clear(),
        db.styleCards.clear(),
        db.userSettings.clear(),
        db.categories.clear()
      ])
      await seedDefaultCategories()
      localStorage.removeItem("style-atelier-onboarding-seen")
      addLog("All data cleared.")
    }
  }

  const handleClearLogs = () => {
    setLogs([])
  }

  const handleRetryConnection = () => {
    chrome.tabs.reload()
    setAlertType(null)
  }

  const handleDismissAlert = () => {
    setAlertType(null)
  }

  const handleOpenMidjourney = () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.update) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.update(tabs[0].id, {
            url: "https://www.midjourney.com/imagine"
          })
        }
      })
    } else {
      window.open("https://www.midjourney.com/imagine", "_blank")
    }
  }

  const handleOpenGuide = () => {
    setActiveTab("history")
    startTutorial()
  }

  return {
    activeTab,
    setActiveTab,
    logs,
    alertType,
    setAlertType,
    activeDetailCard,
    setActiveDetailCard,
    showWelcome,
    setShowWelcome,
    isDragging,
    isDraggingFile,
    isImporting,
    droppedItem,
    clearDroppedItem,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    minting,
    addLog,
    handleStartMinting,
    handleSaveCardDetails,
    handleDeleteCard,
    handleInjectPrompt,
    handleResetDb,
    handleClearLogs,
    handleRetryConnection,
    handleDismissAlert,
    handleOpenMidjourney,
    handleOpenGuide,
    handleStartTutorial,
    handleSkipTutorial,
    handleSendToWorkbench,
    handleToggleEasyMode: handleToggleEasyModeInternal
  }
}
