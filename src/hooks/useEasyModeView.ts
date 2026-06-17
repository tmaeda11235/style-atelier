import { useConfirm } from "../contexts/ConfirmContext"
import { useEasyModeDragAndMint } from "./useEasyModeDragAndMint"
import { useEasyModeHandlers } from "./useEasyModeHandlers"
import { useEasyModeState } from "./useEasyModeState"

interface UseEasyModeViewProps {
  isEasyMode: boolean
  onToggleEasyMode: (enabled: boolean) => void
}

/**
 * Custom hook encapsulating the logic and state for the Easy Mode of the Style Atelier Sidepanel.
 */
export function useEasyModeView({
  isEasyMode: _isEasyMode,
  onToggleEasyMode
}: UseEasyModeViewProps) {
  const confirm = useConfirm()
  const state = useEasyModeState()
  const handlers = useEasyModeHandlers({ state, onToggleEasyMode, confirm })
  const dragAndMint = useEasyModeDragAndMint(state)

  return {
    activeTab: state.activeTab,
    setActiveTab: state.setActiveTab,
    logs: state.logs,
    alertType: state.alertType,
    setAlertType: state.setAlertType,
    activeDetailCard: state.activeDetailCard,
    setActiveDetailCard: state.setActiveDetailCard,
    isDragging: dragAndMint.isDragging,
    isDraggingFile: dragAndMint.isDraggingFile,
    isImporting: dragAndMint.isImporting,
    droppedItem: dragAndMint.droppedItem,
    clearDroppedItem: dragAndMint.clearDroppedItem,
    handleDragOver: dragAndMint.handleDragOver,
    handleDragLeave: dragAndMint.handleDragLeave,
    handleDrop: dragAndMint.handleDrop,
    minting: dragAndMint.minting,
    addLog: state.addLog,
    handleSaveCardDetails: handlers.handleSaveCardDetails,
    handleDeleteCard: handlers.handleDeleteCard,
    handleInjectPrompt: handlers.handleInjectPrompt,
    handleResetDb: handlers.handleResetDb,
    handleClearLogs: state.handleClearLogs,
    handleRetryConnection: handlers.handleRetryConnection,
    handleDismissAlert: state.handleDismissAlert,
    handleToggleEasyMode: handlers.handleToggleEasyMode,
    activeSimpleWorkbenchCard: state.activeSimpleWorkbenchCard,
    setActiveSimpleWorkbenchCard: state.setActiveSimpleWorkbenchCard
  }
}
