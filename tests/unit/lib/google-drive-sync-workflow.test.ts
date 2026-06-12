import { exportDatabase, importDatabase } from "@/lib/backup-manager"
import { db } from "@/lib/db"
import { purgeDeletedRecords } from "@/lib/db/purge-ops"
import type { GoogleDriveClient } from "@/lib/google-drive"
import {
  runRestoreWorkflow,
  runSyncWorkflow
} from "@/lib/google-drive-sync-workflow"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock dependencies
vi.mock("@/lib/backup-manager", () => ({
  exportDatabase: vi.fn(),
  importDatabase: vi.fn()
}))

vi.mock("@/lib/db/purge-ops", () => ({
  purgeDeletedRecords: vi.fn()
}))

vi.mock("@/lib/db", () => ({
  db: {}
}))

describe("Google Drive Sync Workflow", () => {
  let mockGdriveClient: GoogleDriveClient
  let mockParams: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockGdriveClient = {
      downloadBackup: vi.fn(),
      uploadBackup: vi.fn()
    } as unknown as GoogleDriveClient

    mockParams = {
      token: "mock-token",
      gdriveClient: mockGdriveClient,
      onTokenUpdated: vi.fn(),
      onDownloadProgress: vi.fn(),
      onUploadProgress: vi.fn(),
      signal: undefined,
      addLog: vi.fn()
    }
  })

  describe("runSyncWorkflow", () => {
    it("should handle local-overwrite strategy correctly", async () => {
      mockParams.mergeStrategy = "local-overwrite"
      vi.mocked(mockGdriveClient.downloadBackup).mockResolvedValue(
        "mock-backup-data"
      )
      vi.mocked(exportDatabase).mockResolvedValue("mock-exported-data")

      const result = await runSyncWorkflow(mockParams)

      expect(result).toBeLessThanOrEqual(Date.now())
      expect(mockGdriveClient.downloadBackup).toHaveBeenCalledWith(
        "mock-token",
        mockParams.onTokenUpdated,
        mockParams.onDownloadProgress,
        { signal: undefined }
      )
      expect(importDatabase).toHaveBeenCalledWith("mock-backup-data", "replace")
      expect(exportDatabase).toHaveBeenCalled()
      expect(mockGdriveClient.uploadBackup).toHaveBeenCalledWith(
        "mock-token",
        "mock-exported-data",
        mockParams.onTokenUpdated,
        mockParams.onUploadProgress,
        { signal: undefined }
      )
      expect(mockParams.addLog).toHaveBeenCalledWith(
        expect.stringContaining("Merge strategy: LOCAL OVERWRITE")
      )
    })

    it("should throw error in local-overwrite strategy if backup not found", async () => {
      mockParams.mergeStrategy = "local-overwrite"
      vi.mocked(mockGdriveClient.downloadBackup).mockResolvedValue(null)

      await expect(runSyncWorkflow(mockParams)).rejects.toThrow(
        "Backup file not found on cloud"
      )
    })

    it("should handle cloud-overwrite strategy correctly", async () => {
      mockParams.mergeStrategy = "cloud-overwrite"
      vi.mocked(exportDatabase).mockResolvedValue("mock-exported-data")

      const result = await runSyncWorkflow(mockParams)

      expect(result).toBeLessThanOrEqual(Date.now())
      expect(purgeDeletedRecords).toHaveBeenCalledWith(
        db,
        60 * 24 * 60 * 60 * 1000
      )
      expect(exportDatabase).toHaveBeenCalled()
      expect(mockGdriveClient.uploadBackup).toHaveBeenCalledWith(
        "mock-token",
        "mock-exported-data",
        mockParams.onTokenUpdated,
        mockParams.onUploadProgress,
        { signal: undefined }
      )
      expect(mockParams.addLog).toHaveBeenCalledWith(
        expect.stringContaining("Merge strategy: CLOUD OVERWRITE")
      )
    })

    it("should log warning in cloud-overwrite strategy if purge fails", async () => {
      mockParams.mergeStrategy = "cloud-overwrite"
      vi.mocked(purgeDeletedRecords).mockRejectedValue(new Error("purge-error"))
      vi.mocked(exportDatabase).mockResolvedValue("mock-exported-data")

      await runSyncWorkflow(mockParams)

      expect(mockParams.addLog).toHaveBeenCalledWith(
        expect.stringContaining(
          "Warning: Failed to purge aged deleted records: Error: purge-error"
        )
      )
    })

    it("should handle merge strategy (default) when backup exists", async () => {
      vi.mocked(mockGdriveClient.downloadBackup).mockResolvedValue(
        "mock-backup-data"
      )
      vi.mocked(exportDatabase).mockResolvedValue("mock-exported-data")

      const result = await runSyncWorkflow(mockParams)

      expect(result).toBeLessThanOrEqual(Date.now())
      expect(purgeDeletedRecords).toHaveBeenCalledWith(
        db,
        60 * 24 * 60 * 60 * 1000
      )
      expect(mockGdriveClient.downloadBackup).toHaveBeenCalled()
      expect(importDatabase).toHaveBeenCalledWith("mock-backup-data", "merge")
      expect(exportDatabase).toHaveBeenCalled()
      expect(mockGdriveClient.uploadBackup).toHaveBeenCalled()
    })

    it("should handle merge strategy (default) when backup does not exist", async () => {
      vi.mocked(mockGdriveClient.downloadBackup).mockResolvedValue(null)
      vi.mocked(exportDatabase).mockResolvedValue("mock-exported-data")

      await runSyncWorkflow(mockParams)

      expect(importDatabase).not.toHaveBeenCalled()
      expect(mockParams.addLog).toHaveBeenCalledWith(
        expect.stringContaining("No existing backup found.")
      )
      expect(exportDatabase).toHaveBeenCalled()
      expect(mockGdriveClient.uploadBackup).toHaveBeenCalled()
    })
  })

  describe("runRestoreWorkflow", () => {
    it("should restore backup data from cloud successfully", async () => {
      vi.mocked(mockGdriveClient.downloadBackup).mockResolvedValue(
        "mock-backup-data"
      )

      await runRestoreWorkflow(mockParams)

      expect(mockGdriveClient.downloadBackup).toHaveBeenCalledWith(
        "mock-token",
        mockParams.onTokenUpdated,
        mockParams.onDownloadProgress,
        { signal: undefined }
      )
      expect(importDatabase).toHaveBeenCalledWith("mock-backup-data", "replace")
      expect(mockParams.addLog).toHaveBeenCalledWith(
        expect.stringContaining(
          "Database recovered from Google Drive successfully."
        )
      )
    })

    it("should throw error if backup data is not found", async () => {
      vi.mocked(mockGdriveClient.downloadBackup).mockResolvedValue(null)

      await expect(runRestoreWorkflow(mockParams)).rejects.toThrow(
        "Backup file not found on cloud"
      )
    })
  })
})
