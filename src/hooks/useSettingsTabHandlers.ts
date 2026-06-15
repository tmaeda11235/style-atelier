import React, { useRef } from "react"

import { useConfirm } from "../contexts/ConfirmContext"
import { useLanguage } from "../contexts/LanguageContext"
import { useSettings } from "../contexts/SettingsContext"
import { useCardExport } from "./useCardExport"
import { useHistory } from "./useHistory"
import { useLocalBackup } from "./useLocalBackup"
import { useSettingsGoogleDrive } from "./useSettingsGoogleDrive"

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

export function useCloudSyncHandlers(
  gdrive: ReturnType<typeof useSettingsGoogleDrive>,
  setIsWarningOpen: React.Dispatch<React.SetStateAction<boolean>>
) {
  const handleSyncWithWarning = React.useCallback(() => {
    const lastSyncStr = localStorage.getItem("style-atelier-last-backup")
    const lastSyncTime = lastSyncStr ? parseInt(lastSyncStr, 10) : null
    const threshold = 60 * 24 * 60 * 60 * 1000 // 60 days

    if (lastSyncTime && Date.now() - lastSyncTime > threshold) {
      setIsWarningOpen(true)
    } else {
      gdrive.handleSync("merge")
    }
  }, [gdrive, setIsWarningOpen])

  const handleConfirmSyncStrategy = React.useCallback(
    (strategy: "merge" | "local-overwrite" | "cloud-overwrite") => {
      setIsWarningOpen(false)
      gdrive.handleSync(strategy)
    },
    [gdrive, setIsWarningOpen]
  )

  return { handleSyncWithWarning, handleConfirmSyncStrategy }
}

export function useResetDbHandler({
  confirm,
  onResetDb,
  showStatus,
  checkStorage,
  t
}: {
  confirm: ReturnType<typeof useConfirm>
  onResetDb: () => void
  showStatus: (msg: string, type: "success" | "error") => void
  checkStorage: () => void
  t: any
}) {
  return React.useCallback(async () => {
    const ok = await confirm({
      title: t.confirmTitle,
      message: t.resetConfirm,
      confirmText: t.confirmBtn,
      cancelText: t.cancelBtn,
      variant: "danger"
    })
    if (!ok) return
    await onResetDb()
    showStatus(t.resetSuccess, "success")
    checkStorage()
  }, [confirm, onResetDb, showStatus, checkStorage, t])
}

export function useClearHistoryHandler({
  confirm,
  clearHistory,
  addLog,
  showStatus,
  checkStorage,
  t
}: {
  confirm: ReturnType<typeof useConfirm>
  clearHistory: () => Promise<void>
  addLog: (log: string) => void
  showStatus: (msg: string, type: "success" | "error") => void
  checkStorage: () => void
  t: any
}) {
  return React.useCallback(async () => {
    const ok = await confirm({
      title: t.confirmTitle,
      message: t.clearHistoryConfirm,
      confirmText: t.confirmBtn,
      cancelText: t.cancelBtn,
      variant: "danger"
    })
    if (!ok) return
    try {
      await clearHistory()
      addLog("Prompt history cleared successfully.")
      showStatus(t.clearHistorySuccess, "success")
      checkStorage()
    } catch (err: any) {
      console.error(err)
      addLog(`Failed to clear history: ${err.message || err}`)
      showStatus(
        `${t.clearHistoryFailed}: ${err.message || "Unknown error"}`,
        "error"
      )
    }
  }, [confirm, clearHistory, addLog, showStatus, checkStorage, t])
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

export function useCloudSyncState({
  addLog,
  checkStorage,
  setIsWarningOpen,
  t
}: {
  addLog: (log: string) => void
  checkStorage: () => void
  setIsWarningOpen: React.Dispatch<React.SetStateAction<boolean>>
  t: any
}) {
  const gdrive = useSettingsGoogleDrive({ addLog, checkStorage })
  const lastSyncStr = localStorage.getItem("style-atelier-last-backup")
  const lastSyncTime = lastSyncStr ? parseInt(lastSyncStr, 10) : null
  const threshold = 60 * 24 * 60 * 60 * 1000 // 60 days

  const handleSyncWithWarning = React.useCallback(() => {
    if (lastSyncTime && Date.now() - lastSyncTime > threshold) {
      setIsWarningOpen(true)
    } else {
      gdrive.handleSync("merge")
    }
  }, [gdrive, lastSyncTime, threshold, setIsWarningOpen])

  const cloudProps = {
    isSyncEnabled: gdrive.isSyncEnabled,
    isAutoSyncEnabled: gdrive.isAutoSyncEnabled,
    isSyncing: gdrive.isSyncing,
    isRestoring: gdrive.isRestoring,
    lastBackup: gdrive.lastBackup,
    cloudBackup: gdrive.cloudBackup,
    isLoadingCloudBackup: gdrive.isLoadingCloudBackup,
    syncProgress: gdrive.syncProgress,
    restoreProgress: gdrive.restoreProgress,
    statusMessage: gdrive.statusMessage,
    handleCancelSync: gdrive.handleCancelSync,
    handleToggleSync: gdrive.handleToggleSync,
    handleToggleAutoSync: gdrive.handleToggleAutoSync,
    handleSync: handleSyncWithWarning,
    t
  }

  return { gdrive, cloudProps }
}

function useLocalBackupState({ addLog, checkStorage, gdriveShowStatus }: any) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const localBackup = useLocalBackup({
    addLog,
    checkStorage,
    showStatus: gdriveShowStatus,
    fileInputRef
  })
  return { fileInputRef, localBackup }
}

interface UseMaintenanceStateProps {
  addLog: (log: string) => void
  onResetDb: () => void
  checkStorage: () => void
  gdriveShowStatus: (msg: string, type: "success" | "error") => void
  gdriveSyncState: any
  estimate: any
  t: any
}

export function useMaintenanceState(props: UseMaintenanceStateProps) {
  const {
    addLog,
    onResetDb,
    checkStorage,
    gdriveShowStatus,
    gdriveSyncState,
    estimate,
    t
  } = props
  const confirm = useConfirm()
  const { clearHistory } = useHistory()

  const { fileInputRef, localBackup } = useLocalBackupState({
    addLog,
    checkStorage,
    gdriveShowStatus
  })

  const cardExport = useCardExport({
    addLog,
    showStatus: gdriveShowStatus
  })

  const handleResetDbClick = useResetDbHandler({
    confirm,
    onResetDb,
    showStatus: gdriveShowStatus,
    checkStorage,
    t
  })

  const handleClearHistory = useClearHistoryHandler({
    confirm,
    clearHistory,
    addLog,
    showStatus: gdriveShowStatus,
    checkStorage,
    t
  })

  return {
    maintenanceProps: {
      t,
      estimate,
      handleClearHistory,
      fileInputRef,
      isSyncing: gdriveSyncState.isSyncing,
      isRestoring: gdriveSyncState.isRestoring,
      handleLocalExport: localBackup.handleLocalExport,
      handleLocalImport: localBackup.handleLocalImport,
      handleExportCSV: cardExport.handleExportCSV,
      handleExportMarkdown: cardExport.handleExportMarkdown,
      isSyncEnabled: gdriveSyncState.isSyncEnabled,
      isLoadingCloudBackup: gdriveSyncState.isLoadingCloudBackup,
      cloudBackup: gdriveSyncState.cloudBackup,
      handleResetDbClick,
      handleForceRecovery: gdriveSyncState.handleForceRecovery
    }
  }
}
