import { exportDatabase, importDatabase } from "./backup-manager"
import { db } from "./db"
import { purgeDeletedRecords } from "./db/purge-ops"
import type { GoogleDriveClient } from "./google-drive"

export interface SyncWorkflowParams {
  token: string
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (newToken: string) => void
  onDownloadProgress: (percent: number) => void
  onUploadProgress: (percent: number) => void
  signal?: AbortSignal
  addLog: (log: string) => void
  mergeStrategy?: "merge" | "local-overwrite" | "cloud-overwrite"
}

async function handleLocalOverwrite(
  token: string,
  gdriveClient: GoogleDriveClient,
  onTokenUpdated: (newToken: string) => void,
  onDownloadProgress: (percent: number) => void,
  onUploadProgress: (percent: number) => void,
  signal: AbortSignal | undefined,
  addLog: (log: string) => void
) {
  addLog("Replacing local database with remote backup.")
  const backupData = await gdriveClient.downloadBackup(
    token,
    onTokenUpdated,
    onDownloadProgress,
    { signal }
  )
  if (!backupData) {
    throw new Error("Backup file not found on cloud")
  }
  await importDatabase(backupData, "replace")
  const jsonData = await exportDatabase()
  await gdriveClient.uploadBackup(
    token,
    jsonData,
    onTokenUpdated,
    onUploadProgress,
    { signal }
  )
}

async function handleCloudOverwrite(
  token: string,
  gdriveClient: GoogleDriveClient,
  onTokenUpdated: (newToken: string) => void,
  onUploadProgress: (percent: number) => void,
  signal: AbortSignal | undefined,
  addLog: (log: string) => void
) {
  addLog("Purging aged deleted records older than 60 days...")
  try {
    const thresholdMs = 60 * 24 * 60 * 60 * 1000 // 60 days
    await purgeDeletedRecords(db, thresholdMs)
  } catch (error) {
    addLog(`Warning: Failed to purge aged deleted records: ${error}`)
  }
  const jsonData = await exportDatabase()
  await gdriveClient.uploadBackup(
    token,
    jsonData,
    onTokenUpdated,
    onUploadProgress,
    { signal }
  )
}

async function handleMergeStrategy(
  token: string,
  gdriveClient: GoogleDriveClient,
  onTokenUpdated: (newToken: string) => void,
  onDownloadProgress: (percent: number) => void,
  onUploadProgress: (percent: number) => void,
  signal: AbortSignal | undefined,
  addLog: (log: string) => void
) {
  addLog("Purging aged deleted records older than 60 days...")
  try {
    const thresholdMs = 60 * 24 * 60 * 60 * 1000 // 60 days
    await purgeDeletedRecords(db, thresholdMs)
  } catch (error) {
    addLog(`Warning: Failed to purge aged deleted records: ${error}`)
  }
  const backupData = await gdriveClient.downloadBackup(
    token,
    onTokenUpdated,
    onDownloadProgress,
    { signal }
  )
  if (backupData) {
    addLog("Merging remote backup data into local database.")
    await importDatabase(backupData, "merge")
  } else {
    addLog("No existing backup found. Uploading local data as new backup.")
  }
  const jsonData = await exportDatabase()
  await gdriveClient.uploadBackup(
    token,
    jsonData,
    onTokenUpdated,
    onUploadProgress,
    { signal }
  )
}

export async function runSyncWorkflow(
  params: SyncWorkflowParams
): Promise<number> {
  const { mergeStrategy = "merge", addLog } = params

  if (mergeStrategy === "local-overwrite") {
    addLog(
      "Merge strategy: LOCAL OVERWRITE (Replacing local database with remote backup)."
    )
    await handleLocalOverwrite(
      params.token,
      params.gdriveClient,
      params.onTokenUpdated,
      params.onDownloadProgress,
      params.onUploadProgress,
      params.signal,
      addLog
    )
  } else if (mergeStrategy === "cloud-overwrite") {
    addLog(
      "Merge strategy: CLOUD OVERWRITE (Replacing remote backup with local database)."
    )
    await handleCloudOverwrite(
      params.token,
      params.gdriveClient,
      params.onTokenUpdated,
      params.onUploadProgress,
      params.signal,
      addLog
    )
  } else {
    addLog("Merge strategy: MERGE (Merging remote backup into local database).")
    await handleMergeStrategy(
      params.token,
      params.gdriveClient,
      params.onTokenUpdated,
      params.onDownloadProgress,
      params.onUploadProgress,
      params.signal,
      addLog
    )
  }

  return Date.now()
}

export interface RestoreWorkflowParams {
  token: string
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (newToken: string) => void
  onDownloadProgress: (percent: number) => void
  signal?: AbortSignal
  addLog: (log: string) => void
}

export async function runRestoreWorkflow(
  params: RestoreWorkflowParams
): Promise<void> {
  const {
    token,
    gdriveClient,
    onTokenUpdated,
    onDownloadProgress,
    signal,
    addLog
  } = params

  const backupData = await gdriveClient.downloadBackup(
    token,
    onTokenUpdated,
    onDownloadProgress,
    { signal }
  )

  if (!backupData) {
    throw new Error("Backup file not found on cloud")
  }

  await importDatabase(backupData, "replace")
  addLog("Database recovered from Google Drive successfully.")
}
