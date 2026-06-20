/* eslint-disable max-lines-per-function */
import React from "react"

import { useLanguage } from "../contexts/LanguageContext"
import { useSettings } from "../contexts/SettingsContext"
import { useCloudSyncHandlers, useCloudSyncState } from "./useSettingsCloudSync"
import { useMaintenanceState } from "./useSettingsMaintenance"
import { useSettingsTabFocus } from "./useSettingsTabFocus"
import { useStorageEstimate } from "./useStorageEstimate"

const SECTION_UI = "ui"
const SECTION_CLOUD = "cloud"
const SECTION_MAINTENANCE = "maintenance"
const SECTION_WEBLLM = "webllm"

export function useSettingsAccordionState(isTestEnv: boolean) {
  const [openSections, setOpenSections] = React.useState<
    Record<string, boolean>
  >({
    ui: true,
    cloud: isTestEnv,
    maintenance: isTestEnv,
    webllm: isTestEnv
  })

  const toggleSection = React.useCallback((section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }, [])

  const handleToggleUi = React.useCallback(
    () => toggleSection(SECTION_UI),
    [toggleSection]
  )
  const handleToggleCloud = React.useCallback(
    () => toggleSection(SECTION_CLOUD),
    [toggleSection]
  )
  const handleToggleMaintenance = React.useCallback(
    () => toggleSection(SECTION_MAINTENANCE),
    [toggleSection]
  )
  const handleToggleWebLlm = React.useCallback(
    () => toggleSection(SECTION_WEBLLM),
    [toggleSection]
  )

  return {
    openSections,
    setOpenSections,
    handleToggleUi,
    handleToggleCloud,
    handleToggleMaintenance,
    handleToggleWebLlm
  }
}

export function useUiPreferencesState({
  isEasyMode,
  onToggleEasyMode,
  onNavigateToLibrary,
  onReplayTutorial,
  t
}: {
  isEasyMode: boolean
  onToggleEasyMode: (checked: boolean) => void
  onNavigateToLibrary?: () => void
  onReplayTutorial?: () => void
  t: any
}) {
  const contextSettings = useSettings()
  const currentEasyMode = isEasyMode || contextSettings.isEasyMode
  const currentToggleEasyMode =
    onToggleEasyMode || contextSettings.toggleEasyMode

  const langContext = useLanguage()

  const uiProps = {
    lang: langContext.lang,
    changeLanguage: langContext.changeLanguage,
    currentEasyMode,
    currentToggleEasyMode,
    expertFeatures: contextSettings.expertFeatures,
    updateExpertFeature: contextSettings.updateExpertFeature,
    onNavigateToLibrary,
    t,
    ...contextSettings,
    onReplayTutorial
  }

  return { currentEasyMode, uiProps }
}

interface SettingsTabHooksProps {
  addLog: (log: string) => void
  onResetDb: () => void
  isEasyMode?: boolean
  onToggleEasyMode?: (checked: boolean) => void
  onNavigateToLibrary?: () => void
  onReplayTutorial?: () => void
}

function buildSettingsTabResult(
  t: any,
  currentEasyMode: any,
  accordion: any,
  uiProps: any,
  cloudProps: any,
  maintenanceProps: any,
  isWarningOpen: boolean,
  handleConfirmSyncStrategy: any,
  setIsWarningOpen: any
) {
  return {
    t,
    currentEasyMode,
    openSections: accordion.openSections,
    onToggleUi: accordion.handleToggleUi,
    onToggleCloud: accordion.handleToggleCloud,
    onToggleMaintenance: accordion.handleToggleMaintenance,
    onToggleWebLlm: accordion.handleToggleWebLlm,
    uiProps,
    cloudProps,
    maintenanceProps,
    isWarningOpen,
    handleConfirmSyncStrategy,
    setIsWarningOpen
  }
}

export function useSettingsTab(props: SettingsTabHooksProps) {
  const { estimate, checkStorage } = useStorageEstimate()
  const isVitest =
    typeof process !== "undefined" &&
    (!!process.env.VITEST || (process.env.NODE_ENV as string) === "test")

  const isTest = isVitest

  const accordion = useSettingsAccordionState(isTest)
  const t = useLanguage().t.settings
  const [isWarningOpen, setIsWarningOpen] = React.useState(false)

  const { currentEasyMode, uiProps } = useUiPreferencesState({
    isEasyMode: !!props.isEasyMode,
    onToggleEasyMode: props.onToggleEasyMode || (() => {}),
    onNavigateToLibrary: props.onNavigateToLibrary,
    onReplayTutorial: props.onReplayTutorial,
    t
  })

  const { gdrive, cloudProps } = useCloudSyncState({
    addLog: props.addLog,
    checkStorage,
    setIsWarningOpen,
    t
  })

  const { handleConfirmSyncStrategy } = useCloudSyncHandlers(
    gdrive,
    setIsWarningOpen
  )

  const { maintenanceProps } = useMaintenanceState({
    addLog: props.addLog,
    onResetDb: props.onResetDb,
    checkStorage,
    gdriveShowStatus: gdrive.showStatus,
    gdriveSyncState: gdrive,
    estimate,
    t
  })

  const contextSettings = useSettings()
  const { autoOpenSection, setAutoOpenSection } = contextSettings

  const { setOpenSections } = accordion

  React.useEffect(() => {
    if (autoOpenSection === "local-ai") {
      setOpenSections((prev) => ({ ...prev, webllm: true }))
      setAutoOpenSection(null)
      setTimeout(() => {
        const btn = document.getElementById("webllm-download-btn")
        if (btn) {
          btn.focus()
          btn.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 300)
    } else if (autoOpenSection === "license") {
      setOpenSections((prev) => ({ ...prev, license: true }))
      setAutoOpenSection(null)
      setTimeout(() => {
        const input = document.getElementById("license-key-input")
        if (input) {
          input.focus()
          input.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 300)
    }
  }, [autoOpenSection, setAutoOpenSection, setOpenSections])

  useSettingsTabFocus(accordion.setOpenSections)

  return buildSettingsTabResult(
    t,
    currentEasyMode,
    accordion,
    uiProps,
    cloudProps,
    maintenanceProps,
    isWarningOpen,
    handleConfirmSyncStrategy,
    setIsWarningOpen,
    isTest
  )
}
