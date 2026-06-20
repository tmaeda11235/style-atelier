/* eslint-disable max-lines-per-function */
import React, { useRef, useState } from "react"

import { useConfirm } from "../contexts/ConfirmContext"
import { useLanguage } from "../contexts/LanguageContext"
import { useSettings } from "../contexts/SettingsContext"
import { useCardExport } from "./useCardExport"
import { useHistory } from "./useHistory"
import { useLocalBackup } from "./useLocalBackup"
import { useSettingsGoogleDrive } from "./useSettingsGoogleDrive"
import { useStorageEstimate } from "./useStorageEstimate"

interface UseSettingsTabProps {
  addLog: (log: string) => void
  onResetDb: () => void
  isEasyMode?: boolean
  onToggleEasyMode?: (checked: boolean) => void
}

export function useSettingsTab({
  addLog,
  onResetDb,
  isEasyMode = false,
  onToggleEasyMode = () => {}
}: UseSettingsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { estimate, checkStorage } = useStorageEstimate()
  const confirm = useConfirm()
  const contextSettings = useSettings()
  const { clearHistory } = useHistory()

  const isTestEnv =
    typeof process !== "undefined" &&
    ((process.env.NODE_ENV as string) === "test" || !!process.env.VITEST)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    ui: true,
    cloud: isTestEnv,
    maintenance: isTestEnv,
    webllm: isTestEnv
  })

  const { autoOpenSection, setAutoOpenSection } = contextSettings

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
    }
  }, [autoOpenSection, setAutoOpenSection])

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const currentEasyMode = isEasyMode || contextSettings.isEasyMode
  const currentToggleEasyMode =
    onToggleEasyMode || contextSettings.toggleEasyMode
  const { expertFeatures, updateExpertFeature } = contextSettings

  const langContext = useLanguage()
  const t = langContext.t.settings

  const {
    isSyncEnabled,
    isAutoSyncEnabled,
    isSyncing,
    isRestoring,
    lastBackup,
    cloudBackup,
    isLoadingCloudBackup,
    syncProgress,
    restoreProgress,
    statusMessage,
    showStatus,
    handleCancelSync,
    handleToggleSync,
    handleToggleAutoSync,
    handleSync,
    handleForceRecovery
  } = useSettingsGoogleDrive({ addLog, checkStorage })

  const [isWarningOpen, setIsWarningOpen] = useState(false)

  const handleSyncWithWarning = () => {
    const lastSyncStr = localStorage.getItem("style-atelier-last-backup")
    const lastSyncTime = lastSyncStr ? parseInt(lastSyncStr, 10) : null
    const threshold = 60 * 24 * 60 * 60 * 1000 // 60 days

    if (lastSyncTime && Date.now() - lastSyncTime > threshold) {
      setIsWarningOpen(true)
    } else {
      handleSync("merge")
    }
  }

  const handleConfirmSyncStrategy = (
    strategy: "merge" | "local-overwrite" | "cloud-overwrite"
  ) => {
    setIsWarningOpen(false)
    handleSync(strategy)
  }

  const { handleLocalExport, handleLocalImport } = useLocalBackup({
    addLog,
    checkStorage,
    showStatus,
    fileInputRef
  })

  const { handleExportCSV, handleExportMarkdown } = useCardExport({
    addLog,
    showStatus
  })

  const handleResetDbClick = async () => {
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
  }

  const handleClearHistory = async () => {
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
  }

  return {
    fileInputRef,
    estimate,
    checkStorage,
    contextSettings,
    openSections,
    setOpenSections,
    toggleSection,
    currentEasyMode,
    currentToggleEasyMode,
    expertFeatures,
    updateExpertFeature,
    t,
    i18n: langContext.t,
    isSyncEnabled,
    isAutoSyncEnabled,
    isSyncing,
    isRestoring,
    lastBackup,
    cloudBackup,
    isLoadingCloudBackup,
    syncProgress,
    restoreProgress,
    statusMessage,
    showStatus,
    handleCancelSync,
    handleToggleSync,
    handleToggleAutoSync,
    handleSync,
    handleForceRecovery,
    isWarningOpen,
    setIsWarningOpen,
    handleSyncWithWarning,
    handleConfirmSyncStrategy,
    handleLocalExport,
    handleLocalImport,
    handleExportCSV,
    handleExportMarkdown,
    handleResetDbClick,
    handleClearHistory,
    lang: langContext.lang,
    changeLanguage: langContext.changeLanguage
  }
}
