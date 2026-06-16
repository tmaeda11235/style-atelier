import { GDriveTimeoutError } from "./google-drive"
import {
  runRestoreWorkflow,
  runSyncWorkflow
} from "./google-drive-sync-workflow"
import {
  GoogleDriveQuotaError,
  GoogleDriveRateLimitError,
  type GoogleDriveClient
} from "./google-drive/types"

export interface GDriveProgressTracker {
  setSyncProgress: (progress: number | null) => void
  setRestoreProgress: (progress: number | null) => void
  setStatusMessage: (msg: {
    text: string
    type: "success" | "error" | "info" | null
  }) => void
  showStatus: (
    text: string,
    type: "success" | "error" | "info",
    actionType?: "quota" | "rateLimit" | null
  ) => void
}

export async function performSyncWorkflow(params: {
  token: string
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (token: string) => void
  progress: GDriveProgressTracker
  t: any
  signal: AbortSignal
  addLog: (log: string) => void
  mergeStrategy?: "merge" | "local-overwrite" | "cloud-overwrite"
}) {
  const {
    token,
    gdriveClient,
    onTokenUpdated,
    progress,
    t,
    signal,
    addLog,
    mergeStrategy
  } = params
  return await runSyncWorkflow({
    token,
    gdriveClient,
    onTokenUpdated,
    onDownloadProgress: (p) => {
      progress.setSyncProgress(Math.round(p * 0.5))
      progress.setStatusMessage({
        text: `${t.syncingProgress} (${p}%)...`,
        type: "info"
      })
    },
    onUploadProgress: (p) => {
      progress.setSyncProgress(50 + Math.round(p * 0.5))
      progress.setStatusMessage({
        text: `${t.syncingUpload} (${p}%)...`,
        type: "info"
      })
    },
    signal,
    addLog,
    mergeStrategy
  })
}

export async function executeSyncWorkflow(params: {
  token: string
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (token: string) => void
  progress: GDriveProgressTracker
  t: any
  signal: AbortSignal
  addLog: (log: string) => void
  checkStorage: () => void
  queryClient: any
  mergeStrategy?: "merge" | "local-overwrite" | "cloud-overwrite"
}) {
  const { queryClient, addLog, progress, t, checkStorage, mergeStrategy } =
    params
  const now = await performSyncWorkflow({ ...params, mergeStrategy })

  localStorage.setItem("style-atelier-last-backup", now.toString())
  queryClient.setQueryData(
    ["gdrive", "lastBackup"],
    new Date(now).toLocaleString()
  )
  addLog("Google Drive synchronization completed successfully.")
  progress.showStatus(t.syncSuccess, "success")
  checkStorage()
}

export async function handleSyncError(params: {
  err: any
  accessToken: string | null
  gdriveClient: GoogleDriveClient
  addLog: (log: string) => void
  progress: GDriveProgressTracker
  t: any
  queryClient: any
}) {
  const { err, accessToken, gdriveClient, addLog, progress, t, queryClient } =
    params

  if (err.name === "AbortError") {
    addLog("Sync cancelled by user.")
    progress.showStatus(t.syncCancelled, "info")
  } else if (err instanceof GDriveTimeoutError) {
    addLog("Sync failed: Connection timed out.")
    progress.showStatus(t.syncTimeout, "error")
  } else if (err instanceof GoogleDriveQuotaError) {
    addLog(
      `Sync failed: Google Drive storage quota exceeded. Details: ${err.message}`
    )
    progress.showStatus(t.syncQuotaError, "error", "quota")
  } else if (err instanceof GoogleDriveRateLimitError) {
    addLog(
      `Sync failed: Google Drive API rate limit exceeded. Details: ${err.message}`
    )
    progress.showStatus(t.syncRateLimitError, "error", "rateLimit")
  } else {
    console.error(err)
    addLog(`Sync failed: ${err.message || err}`)
    progress.showStatus(
      `${t.syncFailed}: ${err.message || "Unknown error"}`,
      "error"
    )
  }

  if (err.name !== "AbortError" && accessToken) {
    await gdriveClient.clearCachedToken(accessToken).catch(console.error)
    queryClient.setQueryData(["gdrive", "accessToken"], null)
  }
}

export async function promptRestoreConfirmation(params: {
  token: string
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (token: string) => void
  _cloudBackup: { modifiedTime: string; size: string } | null
  progress: GDriveProgressTracker
  confirm: any
  t: any
  signal: AbortSignal
}): Promise<boolean> {
  const {
    token,
    gdriveClient,
    onTokenUpdated,
    _cloudBackup,
    progress,
    confirm,
    t,
    signal
  } = params

  progress.setStatusMessage({ text: t.loadingCloudBackup, type: "info" })

  const meta = await gdriveClient.getBackupMetadata(token, onTokenUpdated, {
    signal
  })
  let currentBackup: { modifiedTime: string; size: string } | null
  if (meta) {
    const dateStr = new Date(meta.modifiedTime).toLocaleString()
    const sizeKB = (parseInt(meta.size) / 1024).toFixed(1)
    currentBackup = { modifiedTime: dateStr, size: `${sizeKB} KB` }
  } else {
    currentBackup = null
  }

  let confirmMsg = t.restoreConfirmMsg
  if (currentBackup) {
    confirmMsg += `\n\n${t.restoreConfirmHeader}\n${t.restoreConfirmTime}${currentBackup.modifiedTime}\n${t.restoreConfirmSize}${currentBackup.size}`
  }

  progress.setStatusMessage({ text: "", type: null })
  return await confirm({
    title: t.confirmTitle,
    message: confirmMsg,
    confirmText: t.confirmBtn,
    cancelText: t.cancelBtn,
    variant: "danger"
  })
}

export async function performRestoreWorkflowImpl(params: {
  token: string
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (token: string) => void
  progress: GDriveProgressTracker
  t: any
  signal: AbortSignal
  addLog: (log: string) => void
}) {
  const { token, gdriveClient, onTokenUpdated, progress, t, signal, addLog } =
    params
  await runRestoreWorkflow({
    token,
    gdriveClient,
    onTokenUpdated,
    onDownloadProgress: (percent) => {
      progress.setRestoreProgress(percent)
      progress.setStatusMessage({
        text: `${t.restoreProgress} (${percent}%)...`,
        type: "info"
      })
    },
    signal,
    addLog
  })
}

export async function executeRestoreWorkflow(params: {
  token: string
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (token: string) => void
  progress: GDriveProgressTracker
  t: any
  signal: AbortSignal
  addLog: (log: string) => void
  checkStorage: () => void
}) {
  const { progress, t, addLog, checkStorage } = params

  progress.setRestoreProgress(0)
  progress.setStatusMessage({
    text: `${t.restoreLoading} (0%)...`,
    type: "info"
  })

  await performRestoreWorkflowImpl(params)

  addLog("Database recovered from Google Drive successfully.")
  progress.showStatus(t.restoreSuccess, "success")
  checkStorage()
}

export async function handleRestoreError(params: {
  err: any
  accessToken: string | null
  gdriveClient: GoogleDriveClient
  addLog: (log: string) => void
  progress: GDriveProgressTracker
  t: any
  queryClient: any
}) {
  const { err, accessToken, gdriveClient, addLog, progress, t, queryClient } =
    params

  if (err.name === "AbortError") {
    addLog("Force recovery cancelled by user.")
    progress.showStatus(t.restoreCancelled, "info")
  } else if (err.message === "Backup file not found on cloud") {
    progress.showStatus(t.noCloudBackup, "error")
    addLog("Force recovery failed: Backup file not found.")
  } else if (err instanceof GDriveTimeoutError) {
    addLog("Force recovery failed: Connection timed out.")
    progress.showStatus(t.syncTimeout, "error")
  } else if (err instanceof GoogleDriveQuotaError) {
    addLog(
      `Force recovery failed: Google Drive storage quota exceeded. Details: ${err.message}`
    )
    progress.showStatus(t.syncQuotaError, "error", "quota")
  } else if (err instanceof GoogleDriveRateLimitError) {
    addLog(
      `Force recovery failed: Google Drive API rate limit exceeded. Details: ${err.message}`
    )
    progress.showStatus(t.syncRateLimitError, "error", "rateLimit")
  } else {
    console.error(err)
    addLog(`Force recovery failed: ${err.message || err}`)
    progress.showStatus(
      `${t.restoreFailed}: ${err.message || "Unknown error"}`,
      "error"
    )
  }

  if (err.name !== "AbortError" && accessToken) {
    await gdriveClient.clearCachedToken(accessToken).catch(console.error)
    queryClient.setQueryData(["gdrive", "accessToken"], null)
  }
}
