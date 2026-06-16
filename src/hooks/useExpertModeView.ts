import { useState } from "react"

import type { AlertType } from "../components/molecules/ConnectionAlert"
import { useConfirm } from "../contexts/ConfirmContext"
import { useTutorial } from "../contexts/TutorialContext"
import {
  buildSidePanelLayoutProps,
  useExpertSubHooks
} from "./useExpertSubHooks"
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

export function useExpertModeView({
  isEasyMode: _isEasyMode,
  onToggleEasyMode
}: UseExpertModeViewProps) {
  const confirm = useConfirm()
  const { startTutorial, advanceIfStep } = useTutorial()
  const { activeTab, setActiveTab } = useTabs()
  const [alertType, setAlertType] = useState<AlertType>(null)

  const sub = useExpertSubHooks(
    confirm,
    setActiveTab,
    startTutorial,
    onToggleEasyMode,
    setAlertType,
    advanceIfStep
  )

  const sidePanelLayoutProps = buildSidePanelLayoutProps({
    activeTab,
    handleTabChange: sub.handleTabChange,
    dragMint: sub.dragMint,
    logs: sub.logs,
    handleClearLogs: sub.handleClearLogs,
    handleResetDb: sub.handleResetDb,
    alertType,
    handleRetryConnection: sub.handleRetryConnection,
    setAlertType,
    tutorial: sub.tutorial,
    isEasyMode: _isEasyMode
  })

  return {
    activeTab,
    setActiveTab,
    handleTabChange: sub.handleTabChange,
    sidePanelLayoutProps,
    logs: sub.logs,
    alertType,
    setAlertType,
    ...sub.cardOps,
    ...sub.tutorial,
    ...sub.dragMint,
    addLog: sub.addLog,
    handleInjectPrompt: sub.handleInjectPrompt,
    handleResetDb: sub.handleResetDb,
    handleClearLogs: sub.handleClearLogs,
    handleRetryConnection: sub.handleRetryConnection,
    handleDismissAlert: () => setAlertType(null),
    handleOpenMidjourney: openMidjourney
  }
}
