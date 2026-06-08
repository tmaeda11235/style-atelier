import { authorize, clearCachedToken } from "./google-drive/auth"
import { downloadBackup } from "./google-drive/download-ops"
import { getBackupMetadata } from "./google-drive/file-ops"
import { type GoogleDriveClient } from "./google-drive/types"
import { uploadBackup } from "./google-drive/upload-ops"

export { GDriveTimeoutError } from "./google-drive/types"
export type {
  BackupMetadata,
  GoogleDriveClient,
  ReauthContext
} from "./google-drive/types"
export { authorize, clearCachedToken } from "./google-drive/auth"
export { searchBackupFile, getBackupMetadata } from "./google-drive/file-ops"
export { uploadBackup } from "./google-drive/upload-ops"
export { downloadBackup } from "./google-drive/download-ops"

export const defaultGoogleDriveClient: GoogleDriveClient = {
  authorize,
  clearCachedToken,
  getBackupMetadata: (token, onTokenUpdated, options) =>
    getBackupMetadata(token, onTokenUpdated, undefined, options),
  uploadBackup,
  downloadBackup: (token, onTokenUpdated, onProgress, options) =>
    downloadBackup(token, onTokenUpdated, onProgress, undefined, options)
}
