import React from "react"

import { DangerZoneSection } from "../../features/settings/components/DangerZoneSection"
import { LocalBackupSection } from "../../features/settings/components/LocalBackupSection"
import { StorageManagerSection } from "../../features/settings/components/StorageManagerSection"

interface MaintenanceContentProps {
  t: any
  estimate: any
  handleClearHistory: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  isSyncing: boolean
  isRestoring: boolean
  handleLocalExport: () => void
  handleLocalImport: () => void
  handleExportCSV: () => void
  handleExportMarkdown: () => void
  isSyncEnabled: boolean
  isLoadingCloudBackup: boolean
  cloudBackup: any
  handleResetDbClick: () => void
  handleForceRecovery: () => void
}

export function MaintenanceContent({
  t,
  estimate,
  handleClearHistory,
  fileInputRef,
  isSyncing,
  isRestoring,
  handleLocalExport,
  handleLocalImport,
  handleExportCSV,
  handleExportMarkdown,
  isSyncEnabled,
  isLoadingCloudBackup,
  cloudBackup,
  handleResetDbClick,
  handleForceRecovery
}: MaintenanceContentProps) {
  return (
    <div className="p-5 space-y-6 animate-in slide-in-from-top-2 duration-250">
      <div id="storage-manager-section-wrapper">
        <StorageManagerSection
          estimate={estimate}
          handleClearHistory={handleClearHistory}
          t={t}
        />
      </div>
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
  )
}
