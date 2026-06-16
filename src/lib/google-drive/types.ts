export class GDriveTimeoutError extends Error {
  constructor(message = "Google Drive API request timed out.") {
    super(message)
    this.name = "GDriveTimeoutError"
  }
}

export interface BackupMetadata {
  id: string
  modifiedTime: string
  size: string
}

export interface ReauthContext {
  token: string
}

export interface GoogleDriveClient {
  authorize(interactive?: boolean): Promise<string>
  clearCachedToken(token: string): Promise<void>
  getBackupMetadata(
    token: string,
    onTokenUpdated?: (newToken: string) => void,
    options?: { signal?: AbortSignal; timeoutMs?: number }
  ): Promise<BackupMetadata | null>
  uploadBackup(
    token: string,
    jsonData: string,
    onTokenUpdated?: (newToken: string) => void,
    onProgress?: (progress: number) => void,
    options?: { signal?: AbortSignal; timeoutMs?: number }
  ): Promise<void>
  downloadBackup(
    token: string,
    onTokenUpdated?: (newToken: string) => void,
    onProgress?: (progress: number) => void,
    options?: { signal?: AbortSignal; timeoutMs?: number }
  ): Promise<string | null>
  downloadTempSharedCards?(
    token: string,
    onTokenUpdated?: (newToken: string) => void,
    options?: { signal?: AbortSignal; timeoutMs?: number }
  ): Promise<string | null>
  deleteFile?(
    token: string,
    fileId: string,
    onTokenUpdated?: (newToken: string) => void,
    options?: { signal?: AbortSignal; timeoutMs?: number }
  ): Promise<void>
  searchTempSharedCardsFile?(
    token: string,
    onTokenUpdated?: (newToken: string) => void,
    options?: { signal?: AbortSignal; timeoutMs?: number }
  ): Promise<string | null>
}
