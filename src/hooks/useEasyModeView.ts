import { useState } from "react"
import { db, seedDefaultCategories } from "../lib/db"
import { useDragAndDrop } from "./useDragAndDrop"
import { useMinting } from "./useMinting"
import type { AlertType } from "../components/molecules/ConnectionAlert"
import type { StyleCard } from "../lib/db-schema"

interface UseEasyModeViewProps {
  isEasyMode: boolean
  onToggleEasyMode: (enabled: boolean) => void
}

/**
 * Custom hook encapsulating the logic and state for the Easy Mode of the Style Atelier Sidepanel.
 */
export function useEasyModeView({ isEasyMode, onToggleEasyMode }: UseEasyModeViewProps) {
  const [activeTab, setActiveTab] = useState<"library" | "settings">("library")
  const [logs, setLogs] = useState<string[]>([])
  const [alertType, setAlertType] = useState<AlertType>(null)
  const [activeDetailCard, setActiveDetailCard] = useState<StyleCard | null>(null)

  const addLog = (log: string) => {
    setLogs((prev) => [log, ...prev].slice(0, 20))
  }

  const handleToggleEasyModeInternal = (enabled: boolean) => {
    onToggleEasyMode(enabled)
    if (enabled) {
      setActiveTab("library")
    }
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

  const handleInjectPrompt = async (prompt: string) => {
    setAlertType(null)
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const activeTabEl = tabs[0]
      if (!activeTabEl?.id) {
        throw new Error("No active tab found")
      }
      const response = await chrome.tabs.sendMessage(activeTabEl.id, {
        type: "INJECT_PROMPT",
        prompt: prompt,
      })
      if (response && response.status === "error") {
        if (response.message && response.message.includes("Could not find chat input")) {
          setAlertType("no_input")
        } else {
          setAlertType("disconnected")
        }
      } else {
        addLog(`Sent prompt: ${prompt.substring(0, 30)}...`)
        if (activeDetailCard) {
          db.styleCards.update(activeDetailCard.id, {
            usageCount: (activeDetailCard.usageCount || 0) + 1
          }).catch(err => console.error("Failed to update usage count on details inject:", err))
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
    handleDragOver,
    handleDragLeave,
    handleDrop: rawHandleDrop
  } = useDragAndDrop(addLog)

  const handleDrop = async (e: React.DragEvent) => {
    const result = (await rawHandleDrop(e)) as any
    if (result) {
      if (result.isImport) {
        setActiveTab("library")
      }
    }
  }

  const minting = useMinting(addLog, (tab) => {
    if (tab === "library") {
      setActiveTab("library")
    }
  })

  const handleResetDb = async () => {
    if (window.confirm("Are you sure you want to delete ALL DATA?")) {
      await Promise.all([db.historyItems.clear(), db.styleCards.clear(), db.userSettings.clear(), db.categories.clear()])
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

  return {
    activeTab,
    setActiveTab,
    logs,
    alertType,
    setAlertType,
    activeDetailCard,
    setActiveDetailCard,
    isDragging,
    isDraggingFile,
    isImporting,
    droppedItem,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    minting,
    addLog,
    handleSaveCardDetails,
    handleDeleteCard,
    handleInjectPrompt,
    handleResetDb,
    handleClearLogs,
    handleRetryConnection,
    handleDismissAlert,
    handleToggleEasyMode: handleToggleEasyModeInternal
  }
}
