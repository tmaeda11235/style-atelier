import { authorize, clearCachedToken } from "./google-drive/auth"
import { downloadBackup } from "./google-drive/download-ops"
import {
  createFolder,
  deleteImageFile,
  downloadImageFile,
  findFolder,
  getBackupMetadata,
  listFolderFiles,
  uploadImageFile
} from "./google-drive/file-ops"
import { type GoogleDriveClient } from "./google-drive/types"
import { uploadBackup } from "./google-drive/upload-ops"

export { GDriveTimeoutError } from "./google-drive/types"
export type {
  BackupMetadata,
  GoogleDriveClient,
  ReauthContext
} from "./google-drive/types"
export { authorize, clearCachedToken } from "./google-drive/auth"
export {
  searchBackupFile,
  getBackupMetadata,
  findFolder,
  createFolder,
  uploadImageFile,
  deleteImageFile,
  downloadImageFile,
  listFolderFiles
} from "./google-drive/file-ops"
export { uploadBackup } from "./google-drive/upload-ops"
export { downloadBackup } from "./google-drive/download-ops"

export const defaultGoogleDriveClient: GoogleDriveClient = {
  authorize,
  clearCachedToken,
  getBackupMetadata: (token, onTokenUpdated, options) =>
    getBackupMetadata(token, onTokenUpdated, undefined, options),
  uploadBackup,
  downloadBackup: (token, onTokenUpdated, onProgress, options) =>
    downloadBackup(token, onTokenUpdated, onProgress, undefined, options),
  findFolder: (token, folderName, parentId, onTokenUpdated, options) =>
    findFolder(token, folderName, parentId, onTokenUpdated, undefined, options),
  createFolder: (token, folderName, parentId, onTokenUpdated, options) =>
    createFolder(
      token,
      folderName,
      parentId,
      onTokenUpdated,
      undefined,
      options
    ),
  uploadImageFile: (
    token,
    folderId,
    fileName,
    blob,
    fileId,
    onTokenUpdated,
    options
  ) =>
    uploadImageFile(
      token,
      folderId,
      fileName,
      blob,
      fileId,
      onTokenUpdated,
      undefined,
      options
    ),
  deleteImageFile: (token, fileId, onTokenUpdated, options) =>
    deleteImageFile(token, fileId, onTokenUpdated, undefined, options),
  downloadImageFile: (token, fileId, onTokenUpdated, options) =>
    downloadImageFile(token, fileId, onTokenUpdated, undefined, options),
  listFolderFiles: (token, folderId, onTokenUpdated, options) =>
    listFolderFiles(token, folderId, onTokenUpdated, undefined, options)
}
