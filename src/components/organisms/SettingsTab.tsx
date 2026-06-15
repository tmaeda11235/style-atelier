import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettingsTabFocus } from "../../hooks/useSettingsTabFocus"
import {
  useCloudSyncHandlers,
  useCloudSyncState,
  useMaintenanceState,
  useSettingsAccordionState,
  useUiPreferencesState
} from "../../hooks/useSettingsTabHandlers"
import { useStorageEstimate } from "../../hooks/useStorageEstimate"
import { SettingsTabPresenter } from "./SettingsTabPresenter"

interface SettingsTabProps {
  addLog: (log: string) => void
  onResetDb: () => void
  isEasyMode?: boolean
  onToggleEasyMode?: (checked: boolean) => void
  onNavigateToLibrary?: () => void
  onReplayTutorial?: () => void
}

export function SettingsTab(props: SettingsTabProps) {
  const { addLog, onResetDb, isEasyMode, onToggleEasyMode } = props
  const { estimate, checkStorage } = useStorageEstimate()
  const isTest =
    typeof process !== "undefined" &&
    (!!process.env.VITEST || process.env.NODE_ENV === "test")

  const accordion = useSettingsAccordionState(isTest)
  const { t: i18n } = useLanguage()
  const t = i18n.settings
  const [isWarningOpen, setIsWarningOpen] = React.useState(false)

  useSettingsTabFocus(accordion.setOpenSections)

  const { currentEasyMode, uiProps } = useUiPreferencesState({
    isEasyMode: !!isEasyMode,
    onToggleEasyMode: onToggleEasyMode || (() => {}),
    onNavigateToLibrary: props.onNavigateToLibrary,
    onReplayTutorial: props.onReplayTutorial,
    t
  })

  const { gdrive, cloudProps } = useCloudSyncState({
    addLog,
    checkStorage,
    setIsWarningOpen,
    t
  })

  const { handleConfirmSyncStrategy } = useCloudSyncHandlers(
    gdrive,
    setIsWarningOpen
  )

  const { maintenanceProps } = useMaintenanceState({
    addLog,
    onResetDb,
    checkStorage,
    gdriveShowStatus: gdrive.showStatus,
    gdriveSyncState: gdrive,
    estimate,
    t
  })

  return (
    <SettingsTabPresenter
      t={t}
      currentEasyMode={currentEasyMode}
      openSections={accordion.openSections}
      onToggleUi={accordion.handleToggleUi}
      onToggleCloud={accordion.handleToggleCloud}
      onToggleMaintenance={accordion.handleToggleMaintenance}
      onToggleWebLlm={accordion.handleToggleWebLlm}
      uiProps={uiProps}
      cloudProps={cloudProps}
      maintenanceProps={maintenanceProps}
      isWarningOpen={isWarningOpen}
      handleConfirmSyncStrategy={handleConfirmSyncStrategy}
      setIsWarningOpen={setIsWarningOpen}
    />
  )
}
