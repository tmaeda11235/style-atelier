export class GDriveTimeoutError extends Error {
  constructor(message = "Google Drive API request timed out.") {
    super(message)
    this.name = "GDriveTimeoutError"
  }
}

export class GoogleDriveQuotaError extends Error {
  constructor(message = "Google Drive storage quota exceeded.") {
    super(message)
    this.name = "GoogleDriveQuotaError"
  }
}

export class GoogleDriveRateLimitError extends Error {
  constructor(
    message = "Google Drive API rate limit exceeded. Please try again later."
  ) {
    super(message)
    this.name = "GoogleDriveRateLimitError"
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
}
