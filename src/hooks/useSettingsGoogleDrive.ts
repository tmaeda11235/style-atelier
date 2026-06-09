import { useEffect, useRef, useState } from "react"

import { useConfirm } from "../contexts/ConfirmContext"
import { useLanguage } from "../contexts/LanguageContext"
import {
  defaultGoogleDriveClient,
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
  }>({ text: "", type: null })
  const showStatus = (text: string, type: "success" | "error" | "info") => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage({ text: "", type: null }), 6000)
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
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])
  return abortControllerRef
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
