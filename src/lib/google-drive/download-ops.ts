import { authorize, clearCachedToken } from "./auth"
import { searchBackupFile } from "./file-ops"
import { configureXhr } from "./http-client"
import { GDriveTimeoutError, type ReauthContext } from "./types"

export async function downloadBackup(
  accessToken: string,
  onTokenUpdated?: (newToken: string) => void,
  onProgress?: (progress: number) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<string | null> {
  const ctx = context || { token: accessToken }
  const fileId = await searchBackupFile(ctx.token, onTokenUpdated, ctx, options)
  if (!fileId) {
    return null
  }
  return executeDownload(fileId, ctx, onTokenUpdated, onProgress, options)
}

async function executeDownload(
  fileId: string,
  ctx: ReauthContext,
  onTokenUpdated?: (newToken: string) => void,
  onProgress?: (progress: number) => void,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<string | null> {
  let result = await sendDownloadXhr(fileId, ctx.token, onProgress, options)
  if (result.status === 401) {
    await clearCachedToken(ctx.token)
    const newToken = await authorize(false)
    ctx.token = newToken
    if (onTokenUpdated) onTokenUpdated(newToken)
    result = await sendDownloadXhr(fileId, newToken, onProgress, options)
  }

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Failed to download backup file: status ${result.status}`)
  }

  return result.text
}

function sendDownloadXhr(
  fileId: string,
  token: string,
  onProgress?: (progress: number) => void,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<{ status: number; text: string | null }> {
  return new Promise<{ status: number; text: string | null }>(
    (resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open(
        "GET",
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        true
      )
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)

      const cleanup = configureXhr(xhr, options, () => {
        reject(new Error("Download aborted by user"))
      })

      if (onProgress) {
        xhr.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100)
            onProgress(percent)
          }
        }
      }

      xhr.onload = () => {
        cleanup()
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ status: xhr.status, text: xhr.responseText })
        } else {
          resolve({ status: xhr.status, text: null })
        }
      }
      xhr.ontimeout = () => {
        cleanup()
        reject(new GDriveTimeoutError())
      }
      xhr.onerror = () => {
        cleanup()
        reject(new Error("Network error during download."))
      }
      xhr.send()
    }
  )
}
