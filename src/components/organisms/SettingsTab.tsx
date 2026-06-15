import { ChevronDown, ChevronUp, Settings2 } from "lucide-react"
import React from "react"

import { useSettingsTab } from "../../hooks/useSettingsTab"
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

export function SettingsTab(props: SettingsTabProps) {
  const {
    fileInputRef,
    estimate,
    contextSettings,
    openSections,
    toggleSection,
    currentEasyMode,
    currentToggleEasyMode,
    expertFeatures,
    updateExpertFeature,
    t,
    lang,
    changeLanguage,
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
    handleCancelSync,
    handleToggleSync,
    handleToggleAutoSync,
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
    handleClearHistory
  } = useSettingsTab(props)

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
            onNavigateToLibrary={props.onNavigateToLibrary}
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
