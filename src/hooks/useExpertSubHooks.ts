import { useCallback, useState } from "react"

import type { AlertType } from "../components/molecules/ConnectionAlert"
import { useP2PSyncContext } from "../contexts/P2PSyncContext"
import type { StyleCard } from "../shared/lib/db-schema"
import {
  deleteCard,
  injectPrompt,
  saveCardDetails,
  sendToWorkbench
} from "./expert-utils"
import { useDragAndDrop } from "./useDragAndDrop"
import { useExpertLogs } from "./useExpertLogs"
import { useExpertTutorial } from "./useExpertTutorial"
import { useMinting } from "./useMinting"

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
      const ok = await saveCardDetails(updatedCard, addLog, setAlertType)
      if (ok) {
        setActiveDetailCard(null)
      }
    },
    [addLog, setAlertType]
  )
  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      const ok = await deleteCard(cardId, addLog, setAlertType)
      if (ok) {
        setActiveDetailCard(null)
      }
    },
    [addLog, setAlertType]
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
  advanceIfStep: (stepId: string) => void,
  setAlertType: (type: AlertType) => void
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
  const minting = useMinting(addLog, setActiveTab, setAlertType)
  const handleStartMinting = useCallback(
    (historyItem: any) => {
      minting.handleStartMinting(historyItem)
      advanceIfStep("mint-button")
    },
    [minting, advanceIfStep]
  )
  return { ...dragProps, handleDrop, minting, handleStartMinting }
}

export function buildSidePanelLayoutProps({
  activeTab,
  handleTabChange,
  dragMint,
  logs,
  handleClearLogs,
  handleResetDb,
  alertType,
  handleRetryConnection,
  setAlertType,
  tutorial,
  isEasyMode
}: any) {
  return {
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
    isEasyMode
  }
}

function useExpertCardOpsHelper(
  addLog: any,
  setAlertType: any,
  setActiveTab: any
) {
  const cardOps = useExpertCardOperations(addLog, setAlertType, setActiveTab)
  const { setActiveDetailCard } = cardOps
  const { handleInjectPrompt } = useExpertPromptInjection(
    addLog,
    setAlertType,
    cardOps.activeDetailCard
  )
  return { cardOps, setActiveDetailCard, handleInjectPrompt }
}

function useExpertCoreHooks(
  addLog: any,
  setActiveTab: any,
  startTutorial: any,
  onToggleEasyMode: any,
  advanceIfStep: any,
  setAlertType: any
) {
  const tutorial = useExpertTutorial(
    setActiveTab,
    startTutorial,
    onToggleEasyMode
  )
  const dragMint = useExpertDragAndMint(
    addLog,
    setActiveTab,
    advanceIfStep,
    setAlertType
  )
  return { tutorial, dragMint }
}

/* eslint-disable-next-line max-lines-per-function */
export function useExpertSubHooks(
  confirm: any,
  setActiveTab: any,
  startTutorial: any,
  onToggleEasyMode: any,
  setAlertType: any,
  advanceIfStep: any
) {
  const { logs, addLog, handleClearLogs, handleResetDb } =
    useExpertLogs(confirm)
  const { tutorial, dragMint } = useExpertCoreHooks(
    addLog,
    setActiveTab,
    startTutorial,
    onToggleEasyMode,
    advanceIfStep,
    setAlertType
  )
  const { cardOps, setActiveDetailCard, handleInjectPrompt } =
    useExpertCardOpsHelper(addLog, setAlertType, setActiveTab)

  const sync = useP2PSyncContext()
  const isActive =
    sync.role !== "idle" &&
    (sync.status === "connecting" ||
      sync.status === "connected" ||
      sync.status === "syncing" ||
      sync.status === "relay-connecting" ||
      sync.status === "relay-syncing")

  const handleTabChange = useCallback(
    async (tab: string) => {
      if (isActive) {
        const ok = await confirm({
          title: "P2P Synchronization in Progress",
          message:
            "A P2P synchronization is currently in progress. Navigating away will cancel the sync. Are you sure you want to proceed?",
          confirmText: "Proceed",
          cancelText: "Cancel",
          variant: "danger"
        })
        if (!ok) return
        sync.reset()
      }

      setActiveTab(tab)
      dragMint.minting.setMintingItem(null)
      dragMint.minting.setVariationBase(null)
      setActiveDetailCard(null)
    },
    [
      isActive,
      sync,
      confirm,
      setActiveTab,
      dragMint.minting,
      setActiveDetailCard
    ]
  )

  const handleRetryConnection = useCallback(() => {
    if (typeof chrome !== "undefined" && chrome.tabs?.reload)
      chrome.tabs.reload()
    else window.location.reload()
    setAlertType(null)
  }, [setAlertType])

  return {
    logs,
    addLog,
    handleClearLogs,
    handleResetDb,
    tutorial,
    cardOps,
    setActiveDetailCard,
    handleInjectPrompt,
    dragMint,
    handleTabChange,
    handleRetryConnection
  }
}
