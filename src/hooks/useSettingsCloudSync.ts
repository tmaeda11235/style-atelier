import React from "react"

import { useSettingsGoogleDrive } from "./useSettingsGoogleDrive"

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
