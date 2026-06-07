import { Settings2 } from "lucide-react"
import React, { useRef } from "react"

import { useConfirm } from "../../contexts/ConfirmContext"
import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useLocalBackup } from "../../hooks/useLocalBackup"
import { useSettingsGoogleDrive } from "../../hooks/useSettingsGoogleDrive"
import { useStorageEstimate } from "../../hooks/useStorageEstimate"
import { db } from "../../lib/db"
import type { Language } from "../../lib/i18n"
import { CloudSyncSection } from "./CloudSyncSection"
import { DangerZoneSection } from "./DangerZoneSection"
import { EasyModeSection } from "./EasyModeSection"
import { LocalBackupSection } from "./LocalBackupSection"
import { StorageManagerSection } from "./StorageManagerSection"

interface SettingsTabProps {
  addLog: (log: string) => void
  onResetDb: () => void
  isEasyMode?: boolean
  onToggleEasyMode?: (checked: boolean) => void
}

export function SettingsTab({
  addLog,
  onResetDb,
  isEasyMode = false,
  onToggleEasyMode = () => {}
}: SettingsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { estimate, checkStorage } = useStorageEstimate()
  const confirm = useConfirm()
  const contextSettings = useSettings()

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

  const { handleLocalExport, handleLocalImport } = useLocalBackup({
    addLog,
    checkStorage,
    showStatus,
    fileInputRef
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
      await db.historyItems.clear()
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Title block */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-blue-500/10 rounded-lg">
          <Settings2 className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-base font-bold text-slate-800">{t.title}</h2>
      </div>

      {/* Language Settings */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-100">
            <span className="text-xl">🌐</span>
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-slate-800">
              {t.languageLabel}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.languageDesc}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100/80 rounded-xl px-4 py-3 transition-all hover:bg-slate-50">
          <span className="text-xs font-bold text-slate-700">
            {t.languageLabel}
          </span>
          <select
            value={lang}
            onChange={(e) => changeLanguage(e.target.value as Language)}
            className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            id="language-select">
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </div>
      </div>

      {/* Tips Bar Settings */}
      <div
        className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
        id="settings-tips-bar-section">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-100">
            <span className="text-xl">💡</span>
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-slate-800">
              {t.tipsBarToggleLabel || "Enable Tips Bar"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.tipsBarToggleSub ||
                "Show a cycling tips bar at the bottom of the screen"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100/80 rounded-xl px-4 py-3 transition-all hover:bg-slate-50">
          <span className="text-xs font-bold text-slate-700">
            {t.tipsBarToggleLabel || "Enable Tips Bar"}
          </span>
          <button
            type="button"
            id="tips-bar-toggle-btn"
            onClick={() =>
              contextSettings.toggleTipsBar(!contextSettings.showTipsBar)
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              contextSettings.showTipsBar ? "bg-blue-600" : "bg-slate-200"
            }`}>
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                contextSettings.showTipsBar ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Interface Mode Settings (Easy Mode Toggle) */}
      <EasyModeSection
        currentEasyMode={currentEasyMode}
        currentToggleEasyMode={currentToggleEasyMode}
        expertFeatures={expertFeatures}
        updateExpertFeature={updateExpertFeature}
        t={t}
      />

      {/* Google Drive Card */}
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
        handleSync={handleSync}
        t={t}
      />

      {/* Storage Management Card */}
      <StorageManagerSection
        estimate={estimate}
        handleClearHistory={handleClearHistory}
        t={t}
      />

      {/* Local File Backup Card */}
      <LocalBackupSection
        fileInputRef={fileInputRef}
        isSyncing={isSyncing}
        isRestoring={isRestoring}
        handleLocalExport={handleLocalExport}
        handleLocalImport={handleLocalImport}
        t={t}
      />

      {/* Dangerous Operations (Reset DB) */}
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
  )
}
