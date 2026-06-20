/* eslint-disable max-lines */
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
 * Search Google Drive for an existing folder by name and optional parent folder id
 */
export async function findFolder(
  accessToken: string,
  folderName: string,
  parentId?: string,
  onTokenUpdated?: (newToken: string) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal }
): Promise<string | null> {
  const ctx = context || { token: accessToken }
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  if (parentId) {
    query += ` and '${parentId}' in parents`
  }
  const queryEscaped = encodeURIComponent(query)
  const res = await fetchWithReauth(
    `https://www.googleapis.com/drive/v3/files?q=${queryEscaped}&fields=files(id)&spaces=drive`,
    { ...options },
    ctx,
    onTokenUpdated
  )

  if (!res.ok) {
    throw new Error(`Failed to find folder: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  if (data.files && data.files.length > 0) {
    return data.files[0].id
  }
  return null
}

/**
 * Create a folder in Google Drive with an optional parent folder
 */
export async function createFolder(
  accessToken: string,
  folderName: string,
  parentId?: string,
  onTokenUpdated?: (newToken: string) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal }
): Promise<string> {
  const ctx = context || { token: accessToken }
  const metadata: any = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder"
  }
  if (parentId) {
    metadata.parents = [parentId]
  }

  const res = await fetchWithReauth(
    `https://www.googleapis.com/drive/v3/files`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify(metadata),
      ...options
    },
    ctx,
    onTokenUpdated
  )

  if (!res.ok) {
    throw new Error(`Failed to create folder: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  return data.id
}

async function buildMultipartBody(
  metadata: any,
  blob: Blob,
  boundary: string
): Promise<Uint8Array> {
  const delimiter = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${blob.type || "image/png"}\r\n\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const delimiterBytes = new TextEncoder().encode(delimiter)
  const closeDelimiterBytes = new TextEncoder().encode(closeDelimiter)

  const arrayBuffer = await blob.arrayBuffer()
  const contentBytes = new Uint8Array(arrayBuffer)

  const totalLength =
    delimiterBytes.length + contentBytes.length + closeDelimiterBytes.length
  const multipartBody = new Uint8Array(totalLength)
  multipartBody.set(delimiterBytes, 0)
  multipartBody.set(contentBytes, delimiterBytes.length)
  multipartBody.set(
    closeDelimiterBytes,
    delimiterBytes.length + contentBytes.length
  )
  return multipartBody
}

async function createNewImageFile(
  ctx: ReauthContext,
  folderId: string,
  fileName: string,
  blob: Blob,
  onTokenUpdated?: (newToken: string) => void,
  options?: { signal?: AbortSignal }
): Promise<string> {
  const boundary = "style_atelier_image_boundary"
  const metadata = {
    name: fileName,
    mimeType: blob.type || "image/png",
    parents: [folderId]
  }

  const multipartBody = await buildMultipartBody(metadata, blob, boundary)

  const url =
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
  const res = await fetchWithReauth(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipartBody as any,
      ...options
    },
    ctx,
    onTokenUpdated
  )

  if (!res.ok) {
    throw new Error(
      `Failed to create image file: ${res.status} ${res.statusText}`
    )
  }

  const data = await res.json()
  return data.id
}

/**
 * Upload image file to a specified folder (create new if fileId is null, update if fileId is provided)
 */
export async function uploadImageFile(
  accessToken: string,
  folderId: string,
  fileName: string,
  blob: Blob,
  fileId: string | null,
  onTokenUpdated?: (newToken: string) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal }
): Promise<string> {
  const ctx = context || { token: accessToken }

  if (fileId) {
    const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`
    const res = await fetchWithReauth(
      url,
      {
        method: "PATCH",
        headers: {
          "Content-Type": blob.type || "image/png"
        },
        body: blob,
        ...options
      },
      ctx,
      onTokenUpdated
    )

    if (!res.ok) {
      throw new Error(
        `Failed to update image file: ${res.status} ${res.statusText}`
      )
    }

    return fileId
  } else {
    return createNewImageFile(
      ctx,
      folderId,
      fileName,
      blob,
      onTokenUpdated,
      options
    )
  }
}

/**
 * Delete a file in Google Drive
 */
export async function deleteImageFile(
  accessToken: string,
  fileId: string,
  onTokenUpdated?: (newToken: string) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal }
): Promise<void> {
  const ctx = context || { token: accessToken }
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`
  const res = await fetchWithReauth(
    url,
    {
      method: "DELETE",
      ...options
    },
    ctx,
    onTokenUpdated
  )

  if (!res.ok && res.status !== 404) {
    throw new Error(
      `Failed to delete image file: ${res.status} ${res.statusText}`
    )
  }
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

/**
 * Download an image file from Google Drive as a Blob
 */
export async function downloadImageFile(
  accessToken: string,
  fileId: string,
  onTokenUpdated?: (newToken: string) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal }
): Promise<Blob> {
  const ctx = context || { token: accessToken }
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  const res = await fetchWithReauth(url, { ...options }, ctx, onTokenUpdated)

  if (!res.ok) {
    throw new Error(
      `Failed to download image file: ${res.status} ${res.statusText}`
    )
  }

  return await res.blob()
}

/**
 * List all files in a specific Google Drive folder (handles pagination)
 */
export async function listFolderFiles(
  accessToken: string,
  folderId: string,
  onTokenUpdated?: (newToken: string) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal }
): Promise<Array<{ id: string; name: string; md5Checksum?: string }>> {
  const ctx = context || { token: accessToken }
  const files: Array<{ id: string; name: string; md5Checksum?: string }> = []
  let pageToken: string | undefined = undefined

  do {
    const query = encodeURIComponent(
      `'${folderId}' in parents and trashed = false`
    )
    let url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=nextPageToken,files(id,name,md5Checksum)&spaces=drive`
    if (pageToken) {
      url += `&pageToken=${pageToken}`
    }

    const res = await fetchWithReauth(url, { ...options }, ctx, onTokenUpdated)
    if (!res.ok) {
      throw new Error(
        `Failed to list folder files: ${res.status} ${res.statusText}`
      )
    }

    const data = await res.json()
    if (data.files) {
      files.push(...data.files)
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return files
}
