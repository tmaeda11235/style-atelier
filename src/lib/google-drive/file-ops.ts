import { fetchWithReauth, handleResponseError } from "./http-client"
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
    await handleResponseError(res, "Failed to search backup file")
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
    await handleResponseError(res, "Failed to get backup metadata")
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

/**
 * Search Google Drive's appDataFolder for 'temp_shared_cards.json'
 */
export async function searchTempSharedCardsFile(
  accessToken: string,
  onTokenUpdated?: (newToken: string) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<string | null> {
  const ctx = context || { token: accessToken }
  const query = encodeURIComponent(
    "name = 'temp_shared_cards.json' and trashed = false"
  )
  const res = await fetchWithReauth(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=appDataFolder`,
    {
      ...options
    },
    ctx,
    onTokenUpdated
  )

  if (!res.ok) {
    await handleResponseError(res, "Failed to search temp shared cards file")
  }

  const data = await res.json()
  if (data.files && data.files.length > 0) {
    return data.files[0].id
  }
  return null
}

/**
 * Delete a file on Google Drive by fileId
 */
export async function deleteFile(
  accessToken: string,
  fileId: string,
  onTokenUpdated?: (newToken: string) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<void> {
  const ctx = context || { token: accessToken }
  const res = await fetchWithReauth(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: "DELETE",
      ...options
    },
    ctx,
    onTokenUpdated
  )

  if (!res.ok) {
    await handleResponseError(res, "Failed to delete file")
  }
}
