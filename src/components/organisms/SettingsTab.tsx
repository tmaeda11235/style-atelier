import { ChevronDown, ChevronUp, Settings2 } from "lucide-react"
import React, { useRef } from "react"

import { useConfirm } from "../../contexts/ConfirmContext"
import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useCardExport } from "../../hooks/useCardExport"
import { useHistory } from "../../hooks/useHistory"
import { useLocalBackup } from "../../hooks/useLocalBackup"
import { useSettingsGoogleDrive } from "../../hooks/useSettingsGoogleDrive"
import { useStorageEstimate } from "../../hooks/useStorageEstimate"
import { GDriveSyncStrategyDialog } from "../molecules/GDriveSyncStrategyDialog"
import { CloudSyncSection } from "./CloudSyncSection"
import { DangerZoneSection } from "./DangerZoneSection"
import { LocalBackupSection } from "./LocalBackupSection"
import { StorageManagerSection } from "./StorageManagerSection"
import { UiPreferencesSection } from "./UiPreferencesSection"
import { WebLlmSettingsSection } from "./WebLlmSettingsSection"

interface SettingsTabProps {
  addLog: (log: string) => void
  onResetDb: () => void
  isEasyMode?: boolean
  onToggleEasyMode?: (checked: boolean) => void
  onNavigateToLibrary?: () => void
}

export function SettingsTab({
  addLog,
  onResetDb,
  isEasyMode = false,
  onToggleEasyMode = () => {},
  onNavigateToLibrary
}: SettingsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { estimate, checkStorage } = useStorageEstimate()
  const confirm = useConfirm()
  const contextSettings = useSettings()
  const { clearHistory } = useHistory()

  const [openSections, setOpenSections] = React.useState<
    Record<string, boolean>
  >({
    ui: true,
    cloud: typeof process !== "undefined" && process.env.NODE_ENV === "test",
    maintenance:
      typeof process !== "undefined" && process.env.NODE_ENV === "test",
    webllm: typeof process !== "undefined" && process.env.NODE_ENV === "test"
  })

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const currentEasyMode = isEasyMode || contextSettings.isEasyMode
  const currentToggleEasyMode =
    onToggleEasyMode || contextSettings.toggleEasyMode
  const { expertFeatures, updateExpertFeature } = contextSettings

  const { lang, changeLanguage, t: i18n } = useLanguage()
  const t = i18n.settings

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

  const [isWarningOpen, setIsWarningOpen] = React.useState(false)

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

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Title block (only in expert mode to prevent duplication) */}
      {!currentEasyMode && (
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-blue-500/10 rounded-lg">
            <Settings2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-base font-bold text-text-primary">{t.title}</h2>
        </div>
      )}

      {/* Group 1: UI Preferences */}
      <div className="border border-border-primary rounded-2xl bg-surface overflow-hidden shadow-sm hover:shadow-md transition-all">
        <button
          type="button"
          id="settings-accordion-ui"
          onClick={() => toggleSection("ui")}
          className="flex items-center justify-between w-full p-4 bg-muted hover:bg-surface-hover transition-colors font-bold text-xs text-text-primary border-b border-border-primary/60 select-none cursor-pointer">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            {t.uiGroupTitle}
          </span>
          {openSections.ui ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </button>
        {openSections.ui && (
          <UiPreferencesSection
            lang={lang}
            changeLanguage={changeLanguage}
            showTipsBar={contextSettings.showTipsBar}
            toggleTipsBar={contextSettings.toggleTipsBar}
            currentEasyMode={currentEasyMode}
            currentToggleEasyMode={currentToggleEasyMode}
            expertFeatures={expertFeatures}
            updateExpertFeature={updateExpertFeature}
            onNavigateToLibrary={onNavigateToLibrary}
            t={t}
            theme={contextSettings.theme}
            changeTheme={contextSettings.changeTheme}
            includeBrandLogo={contextSettings.includeBrandLogo}
            toggleBrandLogo={contextSettings.toggleBrandLogo}
            alwaysEnglishLogoText={contextSettings.alwaysEnglishLogoText}
            toggleAlwaysEnglishLogoText={
              contextSettings.toggleAlwaysEnglishLogoText
            }
          />
        )}
      </div>

      {/* Group 2: Cloud Backup & Sync */}
      <div className="border border-border-primary rounded-2xl bg-surface overflow-hidden shadow-sm hover:shadow-md transition-all">
        <button
          type="button"
          id="settings-accordion-cloud"
          onClick={() => toggleSection("cloud")}
          className="flex items-center justify-between w-full p-4 bg-muted hover:bg-surface-hover transition-colors font-bold text-xs text-text-primary border-b border-border-primary/60 select-none cursor-pointer">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            {t.cloudGroupTitle}
          </span>
          {openSections.cloud ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </button>
        {openSections.cloud && (
          <div className="p-5 space-y-6 animate-in slide-in-from-top-2 duration-250">
            <CloudSyncSection
              isSyncEnabled={isSyncEnabled}
              isAutoSyncEnabled={isAutoSyncEnabled}
              isSyncing={isSyncing}
              isRestoring={isRestoring}
              lastBackup={lastBackup}
              cloudBackup={cloudBackup}
              isLoadingCloudBackup={isLoadingCloudBackup}
              syncProgress={syncProgress}
              restoreProgress={restoreProgress}
              statusMessage={statusMessage}
              handleCancelSync={handleCancelSync}
              handleToggleSync={handleToggleSync}
              handleToggleAutoSync={handleToggleAutoSync}
              handleSync={handleSyncWithWarning}
              t={t}
            />
          </div>
        )}
      </div>

      {/* Group 3: Maintenance & Local Backup */}
      <div className="border border-border-primary rounded-2xl bg-surface overflow-hidden shadow-sm hover:shadow-md transition-all">
        <button
          type="button"
          id="settings-accordion-maintenance"
          onClick={() => toggleSection("maintenance")}
          className="flex items-center justify-between w-full p-4 bg-muted hover:bg-surface-hover transition-colors font-bold text-xs text-text-primary border-b border-border-primary/60 select-none cursor-pointer">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            {t.maintenanceGroupTitle}
          </span>
          {openSections.maintenance ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </button>
        {openSections.maintenance && (
          <div className="p-5 space-y-6 animate-in slide-in-from-top-2 duration-250">
            <StorageManagerSection
              estimate={estimate}
              handleClearHistory={handleClearHistory}
              t={t}
            />
            <LocalBackupSection
              fileInputRef={fileInputRef}
              isSyncing={isSyncing}
              isRestoring={isRestoring}
              handleLocalExport={handleLocalExport}
              handleLocalImport={handleLocalImport}
              handleExportCSV={handleExportCSV}
              handleExportMarkdown={handleExportMarkdown}
              t={t}
            />
            <DangerZoneSection
              isSyncEnabled={isSyncEnabled}
              isSyncing={isSyncing}
              isRestoring={isRestoring}
              isLoadingCloudBackup={isLoadingCloudBackup}
              cloudBackup={cloudBackup}
              handleResetDbClick={handleResetDbClick}
              handleForceRecovery={handleForceRecovery}
              t={t}
            />
          </div>
        )}
      </div>

      {/* Group 4: Local AI Model (WebLLM) */}
      <div className="border border-border-primary rounded-2xl bg-surface overflow-hidden shadow-sm hover:shadow-md transition-all">
        <button
          type="button"
          id="settings-accordion-webllm"
          onClick={() => toggleSection("webllm")}
          className="flex items-center justify-between w-full p-4 bg-muted hover:bg-surface-hover transition-colors font-bold text-xs text-text-primary border-b border-border-primary/60 select-none cursor-pointer">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            {t.webLlmGroupTitle}
          </span>
          {openSections.webllm ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </button>
        {openSections.webllm && <WebLlmSettingsSection />}
      </div>

      <GDriveSyncStrategyDialog
        isOpen={isWarningOpen}
        onConfirm={handleConfirmSyncStrategy}
        onCancel={() => setIsWarningOpen(false)}
        t={t}
      />
    </div>
  )
}
