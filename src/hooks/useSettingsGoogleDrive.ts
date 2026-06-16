import { useEffect, useRef, useState } from "react"

import { useConfirm } from "../contexts/ConfirmContext"
import { useLanguage } from "../contexts/LanguageContext"
import {
  defaultGoogleDriveClient,
  GoogleDriveQuotaError,
  GoogleDriveRateLimitError,
  type GoogleDriveClient
} from "../lib/google-drive"
import { useGDriveMutations } from "./gdrive-mutations"
import {
  useSettingsGoogleDriveBackupMetadata,
  useSettingsGoogleDriveQueries
} from "./useSettingsGoogleDriveQueries"

interface UseSettingsGoogleDriveProps {
  addLog: (log: string) => void
  checkStorage: () => void
  gdriveClient?: GoogleDriveClient
}

export function useGDriveProgress() {
  const [syncProgress, setSyncProgress] = useState<number | null>(null)
  const [restoreProgress, setRestoreProgress] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState<{
    text: string
    type: "success" | "error" | "info" | null
    actionType?: "quota" | "rateLimit" | null
  }>({ text: "", type: null, actionType: null })
  const showStatus = (
    text: string,
    type: "success" | "error" | "info",
    actionType?: "quota" | "rateLimit" | null
  ) => {
    setStatusMessage({ text, type, actionType })
    setTimeout(
      () => setStatusMessage({ text: "", type: null, actionType: null }),
      actionType ? 15000 : 6000
    )
  }
  return {
    syncProgress,
    setSyncProgress,
    restoreProgress,
    setRestoreProgress,
    statusMessage,
    setStatusMessage,
    showStatus
  }
}

function useAbortController() {
  const abortControllerRef = useRef<AbortController | null>(null)
  useEffect(() => {
    const ref = abortControllerRef
    return () => {
      ref.current?.abort()
    }
  }, [])
  return abortControllerRef
}

function useSettingsGoogleDriveBackupError(
  error: any,
  showStatus: any,
  t: any
) {
  useEffect(() => {
    if (error) {
      if (error instanceof GoogleDriveQuotaError) {
        showStatus(t.syncQuotaError, "error", "quota")
      } else if (error instanceof GoogleDriveRateLimitError) {
        showStatus(t.syncRateLimitError, "error", "rateLimit")
      }
    }
  }, [error, showStatus, t])
}

export function useSettingsGoogleDrive({
  addLog,
  checkStorage,
  gdriveClient = defaultGoogleDriveClient
}: UseSettingsGoogleDriveProps) {
  const abortControllerRef = useAbortController()
  const confirm = useConfirm()
  const t = useLanguage().t.settings
  const q = useSettingsGoogleDriveQueries(gdriveClient)
  const meta = useSettingsGoogleDriveBackupMetadata(
    q.accessToken,
    q.isSyncEnabled,
    gdriveClient,
    q.onTokenUpdated
  )
  const progress = useGDriveProgress()
  const mutations = useGDriveMutations({
    isSyncEnabled: q.isSyncEnabled,
    accessToken: q.accessToken,
    gdriveClient,
    onTokenUpdated: q.onTokenUpdated,
    cloudBackup: meta.cloudBackup,
    progress,
    confirm,
    t,
    abortControllerRef,
    addLog,
    checkStorage
  })

  useSettingsGoogleDriveBackupError(meta.error, progress.showStatus, t)

  return {
    ...q,
    ...meta,
    ...progress,
    isSyncing: mutations.syncMutation.isPending,
    isRestoring: mutations.restoreMutation.isPending,
    handleCancelSync: () => abortControllerRef.current?.abort(),
    handleToggleSync: (checked: boolean) =>
      mutations.toggleSyncMutation.mutate(checked),
    handleToggleAutoSync: (checked: boolean) =>
      mutations.toggleAutoSyncMutation.mutate(checked),
    handleSync: (
      mergeStrategy?: "merge" | "local-overwrite" | "cloud-overwrite"
    ) => mutations.syncMutation.mutate(mergeStrategy),
    handleForceRecovery: () => mutations.restoreMutation.mutate()
  }
}
