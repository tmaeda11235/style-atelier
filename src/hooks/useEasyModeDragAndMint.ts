import { useEasyModeDragAndDrop } from "./useEasyModeDragAndDrop"
import type { EasyModeState } from "./useEasyModeState"
import { useMinting } from "./useMinting"

export function useEasyModeDragAndMint(state: EasyModeState) {
  const minting = useMinting(
    state.addLog,
    (tab) => {
      if (tab === "library") {
        state.setActiveTab("library")
      }
    },
    state.setAlertType
  )

  const dragAndDrop = useEasyModeDragAndDrop(
    state.addLog,
    state.setActiveTab,
    minting.handleStartMinting
  )

  return {
    minting,
    ...dragAndDrop
  }
}
