/* eslint-disable max-lines */
import { exportDatabase, importDatabase } from "./backup-manager"
import { db } from "./db"
import { computeHash, listOpfsFiles } from "./db/migration-helpers"
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

const CONCURRENCY_LIMIT = 3
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000

async function runWithRetry<T>(
  fn: () => Promise<T>,
  addLog: (log: string) => void,
  maxRetries = MAX_RETRIES,
  initialDelay = INITIAL_RETRY_DELAY
): Promise<T> {
  let delay = initialDelay
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === maxRetries - 1) throw err
      addLog(
        `Warning: Request failed, retrying in ${delay}ms... (Error: ${(err as Error).message})`
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay *= 2
    }
  }
  throw new Error("Unreachable")
}

async function runWithConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = []
  const executing: Promise<any>[] = []
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task())
    results.push(p as any)
    if (limit <= tasks.length) {
      const e: Promise<any> = p.then(() =>
        executing.splice(executing.indexOf(e), 1)
      )
      executing.push(e)
      if (executing.length >= limit) {
        await Promise.race(executing)
      }
    }
  }
  return Promise.all(results)
}

async function saveBlobToOpfs(filePath: string, blob: Blob): Promise<void> {
  const root = await navigator.storage.getDirectory()
  const parts = filePath.split("/")
  const fileName = parts.pop()
  if (!fileName) {
    throw new Error(`Invalid file path: ${filePath}`)
  }

  let currentDir = root
  for (const part of parts) {
    if (part) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true })
    }
  }

  const fileHandle = await currentDir.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
}

async function readOpfsFileAsBlob(filePath: string): Promise<Blob> {
  const root = await navigator.storage.getDirectory()
  const parts = filePath.split("/")
  const fileName = parts.pop()
  if (!fileName) {
    throw new Error(`Invalid file path: ${filePath}`)
  }

  let currentDir = root
  for (const part of parts) {
    if (part) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: false })
    }
  }

  const fileHandle = await currentDir.getFileHandle(fileName, { create: false })
  return await fileHandle.getFile()
}

async function getOrCreateFolder(
  token: string,
  gdriveClient: GoogleDriveClient,
  onTokenUpdated: (newToken: string) => void,
  signal: AbortSignal | undefined,
  addLog: (log: string) => void
): Promise<string> {
  let folderId = await runWithRetry(
    () =>
      gdriveClient.findFolder(
        token,
        "style-atelier-images",
        undefined,
        onTokenUpdated,
        { signal }
      ),
    addLog
  )

  if (!folderId) {
    addLog(
      "Folder 'style-atelier-images' not found on Google Drive. Creating it."
    )
    folderId = await runWithRetry(
      () =>
        gdriveClient.createFolder(
          token,
          "style-atelier-images",
          undefined,
          onTokenUpdated,
          { signal }
        ),
      addLog
    )
  }
  return folderId
}

async function getRemoteFilesMap(
  token: string,
  gdriveClient: GoogleDriveClient,
  folderId: string,
  onTokenUpdated: (newToken: string) => void,
  signal: AbortSignal | undefined,
  addLog: (log: string) => void
): Promise<Map<string, { id: string; md5Checksum?: string }>> {
  addLog("Fetching remote image list from Google Drive...")
  const remoteFiles = await runWithRetry(
    () =>
      gdriveClient.listFolderFiles(token, folderId, onTokenUpdated, { signal }),
    addLog
  )

  const remoteFilesMap = new Map<string, { id: string; md5Checksum?: string }>()
  for (const file of remoteFiles) {
    remoteFilesMap.set(file.name, {
      id: file.id,
      md5Checksum: file.md5Checksum
    })
  }
  return remoteFilesMap
}

async function getLocalFilesMap(
  imagesDir: FileSystemDirectoryHandle | null
): Promise<Map<string, { filePath: string; handle: FileSystemFileHandle }>> {
  const localFiles = imagesDir ? await listOpfsFiles(imagesDir, "images") : []
  const localFilesMap = new Map<
    string,
    { filePath: string; handle: FileSystemFileHandle }
  >()
  for (const f of localFiles) {
    localFilesMap.set(f.filePath, f)
  }
  return localFilesMap
}

async function syncLocalFilesToDb(
  localFiles: Array<{ filePath: string; handle: FileSystemFileHandle }>,
  syncStatesMap: Map<string, any>
): Promise<void> {
  for (const fileEntry of localFiles) {
    const filePath = fileEntry.filePath
    const file = await fileEntry.handle.getFile()
    const buf = await file.arrayBuffer()
    const hash = await computeHash(buf)

    let cardId: string | undefined
    let categoryId: string | undefined
    const parts = filePath.split("/")
    if (parts.length >= 3) {
      const type = parts[1]
      const nameWithExt = parts[2]
      const id = nameWithExt.replace(/\.[^/.]+$/, "")
      if (type === "cards") cardId = id
      else if (type === "categories") categoryId = id
    }

    const existingState = syncStatesMap.get(filePath)
    if (!existingState) {
      await db.imageSyncStates.put({
        filePath,
        cardId,
        categoryId,
        hash,
        syncStatus: "pending",
        updatedAt: file.lastModified || Date.now()
      })
    } else if (existingState.hash !== hash) {
      await db.imageSyncStates.put({
        ...existingState,
        hash,
        syncStatus: "pending",
        updatedAt: file.lastModified || Date.now()
      })
    }
  }
}

async function handleRemovedLocalFiles(
  allSyncStates: any[],
  localFilesMap: Map<string, any>
): Promise<void> {
  for (const state of allSyncStates) {
    if (!localFilesMap.has(state.filePath)) {
      if (state.syncStatus === "synced") {
        await db.imageSyncStates.put({
          ...state,
          syncStatus: "deleted",
          updatedAt: Date.now()
        })
      } else if (state.syncStatus === "pending") {
        await db.imageSyncStates.delete(state.filePath)
      }
    }
  }
}

async function updateLocalSyncStates(
  addLog: (log: string) => void
): Promise<Map<string, { filePath: string; handle: FileSystemFileHandle }>> {
  addLog("Scanning local OPFS files and updating image sync states...")
  const root = await navigator.storage.getDirectory()
  let imagesDir: FileSystemDirectoryHandle | null = null
  try {
    imagesDir = await root.getDirectoryHandle("images", { create: false })
  } catch {
    // Ignore if images directory does not exist yet
  }

  const localFilesMap = await getLocalFilesMap(imagesDir)
  const allSyncStates = await db.imageSyncStates.toArray()
  const syncStatesMap = new Map<string, (typeof allSyncStates)[0]>()
  for (const s of allSyncStates) {
    syncStatesMap.set(s.filePath, s)
  }

  const localFilesList = imagesDir
    ? await listOpfsFiles(imagesDir, "images")
    : []
  await syncLocalFilesToDb(localFilesList, syncStatesMap)
  await handleRemovedLocalFiles(allSyncStates, localFilesMap)

  return localFilesMap
}

async function getRequiredPaths(): Promise<Set<string>> {
  const cards = await db.styleCards.toArray()
  const categories = await db.categories.toArray()

  const requiredPaths = new Set<string>()
  for (const card of cards) {
    if (card.thumbnailPath && !card.isDeleted) {
      requiredPaths.add(card.thumbnailPath)
    }
  }
  for (const cat of categories) {
    if (cat.coverImagePath && !cat.isDeleted) {
      requiredPaths.add(cat.coverImagePath)
    }
  }
  return requiredPaths
}

async function updateDownloadedState(
  path: string,
  fileName: string,
  hash: string,
  cloudFileId: string
): Promise<void> {
  let cardId: string | undefined
  let categoryId: string | undefined
  const pathParts = path.split("/")
  if (pathParts.length >= 3) {
    const type = pathParts[1]
    const id = fileName.replace(/\.[^/.]+$/, "")
    if (type === "cards") cardId = id
    else if (type === "categories") categoryId = id
  }

  await db.imageSyncStates.put({
    filePath: path,
    cardId,
    categoryId,
    hash,
    cloudFileId,
    syncStatus: "synced",
    updatedAt: Date.now()
  })
}

function createDownloadTask(params: {
  path: string
  fileName: string
  remoteInfo: { id: string; md5Checksum?: string }
  token: string
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (newToken: string) => void
  signal: AbortSignal | undefined
  addLog: (log: string) => void
}): () => Promise<void> {
  const {
    path,
    fileName,
    remoteInfo,
    token,
    gdriveClient,
    onTokenUpdated,
    signal,
    addLog
  } = params
  return async () => {
    addLog(`Downloading image: ${fileName}...`)
    const blob = await runWithRetry(
      () =>
        gdriveClient.downloadImageFile(token, remoteInfo.id, onTokenUpdated, {
          signal
        }),
      addLog
    )
    await saveBlobToOpfs(path, blob)
    const arrayBuf = await blob.arrayBuffer()
    const hash = await computeHash(arrayBuf)

    await updateDownloadedState(path, fileName, hash, remoteInfo.id)
    addLog(`Downloaded and saved: ${fileName}`)
  }
}

async function downloadRemoteImages(
  token: string,
  gdriveClient: GoogleDriveClient,
  onTokenUpdated: (newToken: string) => void,
  signal: AbortSignal | undefined,
  addLog: (log: string) => void,
  remoteFilesMap: Map<string, { id: string; md5Checksum?: string }>,
  localFilesMap: Map<string, { filePath: string; handle: FileSystemFileHandle }>
): Promise<void> {
  addLog("Checking for remote images to download...")
  const requiredPaths = await getRequiredPaths()
  const downloadTasks: Array<() => Promise<void>> = []

  for (const path of requiredPaths) {
    const parts = path.split("/")
    const fileName = parts.pop()!
    const remoteInfo = remoteFilesMap.get(fileName)

    if (remoteInfo) {
      const localFileExists = localFilesMap.has(path)
      const currentSyncState = await db.imageSyncStates.get(path)

      let needsDownload = !localFileExists
      if (localFileExists && currentSyncState && remoteInfo.md5Checksum) {
        if (currentSyncState.hash !== remoteInfo.md5Checksum) {
          needsDownload = true
        }
      }

      if (needsDownload) {
        downloadTasks.push(
          createDownloadTask({
            path,
            fileName,
            remoteInfo,
            token,
            gdriveClient,
            onTokenUpdated,
            signal,
            addLog
          })
        )
      }
    }
  }

  if (downloadTasks.length > 0) {
    addLog(
      `Executing ${downloadTasks.length} download tasks with concurrency limit of ${CONCURRENCY_LIMIT}...`
    )
    await runWithConcurrencyLimit(downloadTasks, CONCURRENCY_LIMIT)
    addLog("All image downloads completed.")
  }
}

function createUploadTask(params: {
  state: any
  fileName: string
  folderId: string
  remoteInfo?: { id: string; md5Checksum?: string }
  token: string
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (newToken: string) => void
  signal: AbortSignal | undefined
  addLog: (log: string) => void
}): () => Promise<void> {
  const {
    state,
    fileName,
    folderId,
    remoteInfo,
    token,
    gdriveClient,
    onTokenUpdated,
    signal,
    addLog
  } = params
  return async () => {
    addLog(`Uploading image: ${fileName}...`)
    const blob = await readOpfsFileAsBlob(state.filePath)

    const fileIdToUse = state.cloudFileId || (remoteInfo ? remoteInfo.id : null)

    const newCloudFileId = await runWithRetry(
      () =>
        gdriveClient.uploadImageFile(
          token,
          folderId,
          fileName,
          blob,
          fileIdToUse,
          onTokenUpdated,
          { signal }
        ),
      addLog
    )

    await db.imageSyncStates.put({
      ...state,
      cloudFileId: newCloudFileId,
      syncStatus: "synced",
      updatedAt: Date.now()
    })
    addLog(`Uploaded: ${fileName}`)
  }
}

function createDeleteTask(params: {
  state: any
  fileName: string
  fileIdToDelete: string | null
  token: string
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (newToken: string) => void
  signal: AbortSignal | undefined
  addLog: (log: string) => void
}): () => Promise<void> {
  const {
    state,
    fileName,
    fileIdToDelete,
    token,
    gdriveClient,
    onTokenUpdated,
    signal,
    addLog
  } = params
  return async () => {
    addLog(`Deleting remote image: ${fileName}...`)
    await runWithRetry(
      () =>
        gdriveClient.deleteImageFile(token, fileIdToDelete!, onTokenUpdated, {
          signal
        }),
      addLog
    )
    await db.imageSyncStates.delete(state.filePath)
    addLog(`Deleted remote: ${fileName}`)
  }
}

function buildUploadTasks(params: {
  pendingStates: any[]
  remoteFilesMap: Map<string, { id: string; md5Checksum?: string }>
  folderId: string
  token: string
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (newToken: string) => void
  signal: AbortSignal | undefined
  addLog: (log: string) => void
}): Array<() => Promise<void>> {
  const {
    pendingStates,
    remoteFilesMap,
    folderId,
    token,
    gdriveClient,
    onTokenUpdated,
    signal,
    addLog
  } = params
  const uploadTasks: Array<() => Promise<void>> = []
  for (const state of pendingStates) {
    const parts = state.filePath.split("/")
    const fileName = parts.pop()!
    const remoteInfo = remoteFilesMap.get(fileName)
    uploadTasks.push(
      createUploadTask({
        state,
        fileName,
        folderId,
        remoteInfo,
        token,
        gdriveClient,
        onTokenUpdated,
        signal,
        addLog
      })
    )
  }
  return uploadTasks
}

async function buildDeleteTasks(params: {
  deletedStates: any[]
  remoteFilesMap: Map<string, { id: string; md5Checksum?: string }>
  token: string
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (newToken: string) => void
  signal: AbortSignal | undefined
  addLog: (log: string) => void
}): Promise<Array<() => Promise<void>>> {
  const {
    deletedStates,
    remoteFilesMap,
    token,
    gdriveClient,
    onTokenUpdated,
    signal,
    addLog
  } = params
  const deleteTasks: Array<() => Promise<void>> = []
  for (const state of deletedStates) {
    const parts = state.filePath.split("/")
    const fileName = parts.pop()!
    const remoteInfo = remoteFilesMap.get(fileName)
    const fileIdToDelete =
      state.cloudFileId || (remoteInfo ? remoteInfo.id : null)

    if (fileIdToDelete) {
      deleteTasks.push(
        createDeleteTask({
          state,
          fileName,
          fileIdToDelete,
          token,
          gdriveClient,
          onTokenUpdated,
          signal,
          addLog
        })
      )
    } else {
      await db.imageSyncStates.delete(state.filePath)
    }
  }
  return deleteTasks
}

async function runSyncTasks(
  tasks: Array<() => Promise<void>>,
  taskType: "upload" | "delete",
  addLog: (log: string) => void
): Promise<void> {
  if (tasks.length > 0) {
    addLog(
      `Executing ${tasks.length} ${taskType} tasks with concurrency limit of ${CONCURRENCY_LIMIT}...`
    )
    await runWithConcurrencyLimit(tasks, CONCURRENCY_LIMIT)
    addLog(`All image ${taskType}s completed.`)
  }
}

async function uploadAndDeleteRemoteImages(
  token: string,
  gdriveClient: GoogleDriveClient,
  folderId: string,
  onTokenUpdated: (newToken: string) => void,
  signal: AbortSignal | undefined,
  addLog: (log: string) => void,
  remoteFilesMap: Map<string, { id: string; md5Checksum?: string }>
): Promise<void> {
  const pendingStates = await db.imageSyncStates
    .where("syncStatus")
    .equals("pending")
    .toArray()
  const deletedStates = await db.imageSyncStates
    .where("syncStatus")
    .equals("deleted")
    .toArray()

  const uploadTasks = buildUploadTasks({
    pendingStates,
    remoteFilesMap,
    folderId,
    token,
    gdriveClient,
    onTokenUpdated,
    signal,
    addLog
  })

  const deleteTasks = await buildDeleteTasks({
    deletedStates,
    remoteFilesMap,
    token,
    gdriveClient,
    onTokenUpdated,
    signal,
    addLog
  })

  await runSyncTasks(uploadTasks, "upload", addLog)
  await runSyncTasks(deleteTasks, "delete", addLog)
}

export interface SyncImagesParams {
  token: string
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (newToken: string) => void
  signal?: AbortSignal
  addLog: (log: string) => void
  overwriteMode?: "local" | "cloud" | "merge"
}

// eslint-disable-next-line max-lines-per-function
export async function syncImages(params: SyncImagesParams): Promise<void> {
  const {
    token,
    gdriveClient,
    onTokenUpdated,
    signal,
    addLog,
    overwriteMode = "merge"
  } = params

  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    addLog("OPFS is not supported in this environment. Skipping image sync.")
    return
  }

  addLog("Starting incremental image sync workflow...")

  const folderId = await getOrCreateFolder(
    token,
    gdriveClient,
    onTokenUpdated,
    signal,
    addLog
  )
  const remoteFilesMap = await getRemoteFilesMap(
    token,
    gdriveClient,
    folderId,
    onTokenUpdated,
    signal,
    addLog
  )
  const localFilesMap = await updateLocalSyncStates(addLog)

  if (overwriteMode === "merge" || overwriteMode === "local") {
    await downloadRemoteImages(
      token,
      gdriveClient,
      onTokenUpdated,
      signal,
      addLog,
      remoteFilesMap,
      localFilesMap
    )
  }

  if (overwriteMode === "merge" || overwriteMode === "cloud") {
    await uploadAndDeleteRemoteImages(
      token,
      gdriveClient,
      folderId,
      onTokenUpdated,
      signal,
      addLog,
      remoteFilesMap
    )
  }

  addLog("Image sync workflow completed successfully.")
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

  // Sync images in local-overwrite mode
  await syncImages({
    token,
    gdriveClient,
    onTokenUpdated,
    signal,
    addLog,
    overwriteMode: "local"
  })

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

  // Sync images in cloud-overwrite mode
  await syncImages({
    token,
    gdriveClient,
    onTokenUpdated,
    signal,
    addLog,
    overwriteMode: "cloud"
  })

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

  // Sync images in merge mode
  await syncImages({
    token,
    gdriveClient,
    onTokenUpdated,
    signal,
    addLog,
    overwriteMode: "merge"
  })

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

  // Restore images as well
  await syncImages({
    token,
    gdriveClient,
    onTokenUpdated,
    signal,
    addLog,
    overwriteMode: "local"
  })

  addLog("Database recovered from Google Drive successfully.")
}
