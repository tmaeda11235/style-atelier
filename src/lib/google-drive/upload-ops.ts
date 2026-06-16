import { authorize, clearCachedToken } from "./auth"
import { searchBackupFile } from "./file-ops"
import {
  checkResponseForErrors,
  fetchWithReauth,
  sendResumableXhr,
  sendSimpleXhr
} from "./http-client"
import { type ReauthContext } from "./types"

export async function uploadBackup(
  accessToken: string,
  jsonData: string,
  onTokenUpdated?: (newToken: string) => void,
  onProgress?: (progress: number) => void,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<void> {
  const ctx = { token: accessToken }
  const fileId = await searchBackupFile(ctx.token, onTokenUpdated, ctx, options)
  const blob = new Blob([jsonData], { type: "application/json" })
  const threshold = 2 * 1024 * 1024 // 2MB

  if (blob.size >= threshold) {
    await uploadBackupResumable(
      ctx.token,
      fileId,
      blob,
      onTokenUpdated,
      onProgress,
      ctx,
      options
    )
  } else {
    await uploadBackupSimple(
      ctx.token,
      fileId,
      jsonData,
      onTokenUpdated,
      onProgress,
      ctx,
      options
    )
  }
}

async function uploadBackupResumable(
  accessToken: string,
  fileId: string | null,
  blob: Blob,
  onTokenUpdated?: (newToken: string) => void,
  onProgress?: (progress: number) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<void> {
  const ctx = context || { token: accessToken }
  const uploadUrl = await initResumableSession(
    fileId,
    blob.size,
    ctx,
    onTokenUpdated,
    options
  )
  await executeResumableUpload(
    uploadUrl,
    blob,
    onProgress,
    ctx,
    onTokenUpdated,
    options
  )
}

async function initResumableSession(
  fileId: string | null,
  blobSize: number,
  ctx: ReauthContext,
  onTokenUpdated?: (newToken: string) => void,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<string> {
  let initUrl =
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable"
  let method = "POST"
  const metadata: any = { mimeType: "application/json" }

  if (fileId) {
    initUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=resumable`
    method = "PATCH"
  } else {
    metadata.name = "style-atelier-backup.json"
  }

  const res = await fetchWithReauth(
    initUrl,
    {
      method,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "application/json",
        "X-Upload-Content-Length": blobSize.toString()
      },
      body: JSON.stringify(metadata),
      ...options
    },
    ctx,
    onTokenUpdated
  )

  if (!res.ok) {
    await checkResponseForErrors(res)
    throw new Error(
      `Failed to initialize resumable upload: ${res.status} ${res.statusText}`
    )
  }

  const uploadUrl = res.headers.get("Location")
  if (!uploadUrl) {
    throw new Error(
      "Failed to get resumable upload session URL (Location header missing)"
    )
  }
  return uploadUrl
}

async function executeResumableUpload(
  uploadUrl: string,
  blob: Blob,
  onProgress?: (progress: number) => void,
  ctx?: ReauthContext,
  onTokenUpdated?: (newToken: string) => void,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<void> {
  const activeCtx = ctx || { token: "" }
  let status = await sendResumableXhr(
    uploadUrl,
    blob,
    activeCtx.token,
    onProgress,
    options
  )
  if (status === 401) {
    console.warn(
      "Resumable upload PUT returned 401. Retrying with new token..."
    )
    await clearCachedToken(activeCtx.token)
    const newToken = await authorize(false)
    activeCtx.token = newToken
    if (onTokenUpdated) onTokenUpdated(newToken)
    status = await sendResumableXhr(
      uploadUrl,
      blob,
      newToken,
      onProgress,
      options
    )
  }

  if (status < 200 || status >= 300) {
    throw new Error(`Resumable upload failed with status: ${status}`)
  }
}

async function uploadBackupSimple(
  accessToken: string,
  fileId: string | null,
  jsonData: string,
  onTokenUpdated?: (newToken: string) => void,
  onProgress?: (progress: number) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<void> {
  const ctx = context || { token: accessToken }
  if (fileId) {
    await updateBackupSimple(
      fileId,
      jsonData,
      ctx,
      onTokenUpdated,
      onProgress,
      options
    )
  } else {
    await createBackupSimple(jsonData, ctx, onTokenUpdated, onProgress, options)
  }
}

async function updateBackupSimple(
  fileId: string,
  jsonData: string,
  ctx: ReauthContext,
  onTokenUpdated?: (newToken: string) => void,
  onProgress?: (progress: number) => void,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<void> {
  const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`
  let status = await sendSimpleXhr(
    "PATCH",
    url,
    "application/json",
    jsonData,
    ctx.token,
    onProgress,
    options
  )

  if (status === 401) {
    await clearCachedToken(ctx.token)
    const newToken = await authorize(false)
    ctx.token = newToken
    if (onTokenUpdated) onTokenUpdated(newToken)
    status = await sendSimpleXhr(
      "PATCH",
      url,
      "application/json",
      jsonData,
      newToken,
      onProgress,
      options
    )
  }

  if (status < 200 || status >= 300) {
    throw new Error(`Failed to update backup file: status ${status}`)
  }
}

async function createBackupSimple(
  jsonData: string,
  ctx: ReauthContext,
  onTokenUpdated?: (newToken: string) => void,
  onProgress?: (progress: number) => void,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<void> {
  const boundary = "style_atelier_backup_boundary"
  const metadata = {
    name: "style-atelier-backup.json",
    mimeType: "application/json"
  }
  const multipartBody = buildMultipartBody(boundary, metadata, jsonData)

  const url =
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
  const contentType = `multipart/related; boundary=${boundary}`
  let status = await sendSimpleXhr(
    "POST",
    url,
    contentType,
    multipartBody,
    ctx.token,
    onProgress,
    options
  )

  if (status === 401) {
    await clearCachedToken(ctx.token)
    const newToken = await authorize(false)
    ctx.token = newToken
    if (onTokenUpdated) onTokenUpdated(newToken)
    status = await sendSimpleXhr(
      "POST",
      url,
      contentType,
      multipartBody,
      newToken,
      onProgress,
      options
    )
  }

  if (status < 200 || status >= 300) {
    throw new Error(`Failed to create backup file: status ${status}`)
  }
}

function buildMultipartBody(
  boundary: string,
  metadata: any,
  jsonData: string
): string {
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`
  return (
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    jsonData +
    closeDelimiter
  )
}
