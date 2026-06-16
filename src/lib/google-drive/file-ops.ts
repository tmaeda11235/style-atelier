import { checkResponseForErrors, fetchWithReauth } from "./http-client"
import type { BackupMetadata, ReauthContext } from "./types"

/**
 * Search Google Drive for an existing file named 'style-atelier-backup.json'
 */
export async function searchBackupFile(
  accessToken: string,
  onTokenUpdated?: (newToken: string) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<string | null> {
  const ctx = context || { token: accessToken }
  const query = encodeURIComponent(
    "name = 'style-atelier-backup.json' and trashed = false"
  )
  const res = await fetchWithReauth(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`,
    {
      ...options
    },
    ctx,
    onTokenUpdated
  )

  if (!res.ok) {
    await checkResponseForErrors(res)
    throw new Error(
      `Failed to search backup file: ${res.status} ${res.statusText}`
    )
  }

  const data = await res.json()
  if (data.files && data.files.length > 0) {
    return data.files[0].id
  }
  return null
}

/**
 * Search Google Drive for 'style-atelier-backup.json' and return its metadata
 */
export async function getBackupMetadata(
  accessToken: string,
  onTokenUpdated?: (newToken: string) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<BackupMetadata | null> {
  const ctx = context || { token: accessToken }
  const query = encodeURIComponent(
    "name = 'style-atelier-backup.json' and trashed = false"
  )
  const res = await fetchWithReauth(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)&spaces=drive`,
    {
      ...options
    },
    ctx,
    onTokenUpdated
  )

  if (!res.ok) {
    await checkResponseForErrors(res)
    throw new Error(
      `Failed to get backup metadata: ${res.status} ${res.statusText}`
    )
  }

  const data = await res.json()
  if (data.files && data.files.length > 0) {
    const file = data.files[0]
    return {
      id: file.id,
      modifiedTime: file.modifiedTime || "",
      size: file.size || "0"
    }
  }
  return null
}
