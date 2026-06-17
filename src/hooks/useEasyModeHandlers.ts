import { useConfirm } from "../contexts/ConfirmContext"
import { safeReloadTab } from "../lib/chrome-utils"
import { useEasyModeCardHandlers } from "./useEasyModeCardHandlers"
import { useEasyModeDbHandlers } from "./useEasyModeDbHandlers"
import { useEasyModePromptInjector } from "./useEasyModePromptInjector"
import type { EasyModeState } from "./useEasyModeState"

interface UseEasyModeHandlersOptions {
  state: EasyModeState
  onToggleEasyMode: (enabled: boolean) => void
  confirm: ReturnType<typeof useConfirm>
}

export function useEasyModeHandlers({
  state,
  onToggleEasyMode,
  confirm
}: UseEasyModeHandlersOptions) {
  const { handleSaveCardDetails, handleDeleteCard } = useEasyModeCardHandlers({
    setActiveDetailCard: state.setActiveDetailCard,
    addLog: state.addLog,
    setAlertType: state.setAlertType
  })

  const { handleResetDb } = useEasyModeDbHandlers({
    confirm,
    addLog: state.addLog
  })

  const { handleInjectPrompt } = useEasyModePromptInjector({
    activeDetailCard: state.activeDetailCard,
    addLog: state.addLog,
    setAlertType: state.setAlertType
  })

  const handleToggleEasyMode = (enabled: boolean) => {
    onToggleEasyMode(enabled)
    if (enabled) {
      state.setActiveTab("library")
    }
  }

  const handleRetryConnection = () => {
    safeReloadTab()
    state.setAlertType(null)
  }

  return {
    handleToggleEasyMode,
    handleSaveCardDetails,
    handleDeleteCard,
    handleInjectPrompt,
    handleResetDb,
    handleRetryConnection
  }
}
