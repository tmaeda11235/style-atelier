import { exportDatabase, importDatabase } from "@/lib/backup-manager"
import { db } from "@/lib/db"
import { purgeDeletedRecords } from "@/lib/db/purge-ops"
import type { GoogleDriveClient } from "@/lib/google-drive"
import {
  runRestoreWorkflow,
  runSyncWorkflow,
  syncImages
} from "@/lib/google-drive-sync-workflow"
import { listOpfsFiles } from "@/shared/lib/db/migration-helpers"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock Dexie DB tables with vi.hoisted to prevent initialization error due to hoisting
const { mockSyncStatesTable, mockStyleCardsTable, mockCategoriesTable } =
  vi.hoisted(() => {
    return {
      mockSyncStatesTable: {
        toArray: vi.fn().mockResolvedValue([]),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(undefined),
        where: vi.fn().mockImplementation(() => ({
          equals: vi.fn().mockImplementation((_status) => ({
            toArray: vi.fn().mockResolvedValue([])
          }))
        }))
      },
      mockStyleCardsTable: {
        toArray: vi.fn().mockResolvedValue([])
      },
      mockCategoriesTable: {
        toArray: vi.fn().mockResolvedValue([])
      }
    }
  })

vi.mock("@/lib/db", () => ({
  db: {
    imageSyncStates: mockSyncStatesTable,
    styleCards: mockStyleCardsTable,
    categories: mockCategoriesTable
  }
}))

// Mock other dependencies
vi.mock("@/lib/backup-manager", () => ({
  exportDatabase: vi.fn(),
  importDatabase: vi.fn()
}))

vi.mock("@/lib/db/purge-ops", () => ({
  purgeDeletedRecords: vi.fn()
}))

vi.mock("@/shared/lib/db/migration-helpers", () => ({
  listOpfsFiles: vi.fn().mockResolvedValue([]),
  computeHash: vi.fn().mockResolvedValue("mock-hash-123")
}))

describe("Google Drive Sync Workflow", () => {
  let mockGdriveClient: GoogleDriveClient
  let mockParams: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockGdriveClient = {
      downloadBackup: vi.fn(),
      uploadBackup: vi.fn(),
      findFolder: vi.fn().mockResolvedValue("mock-folder-id"),
      createFolder: vi.fn().mockResolvedValue("mock-folder-id"),
      listFolderFiles: vi.fn().mockResolvedValue([]),
      uploadImageFile: vi.fn().mockResolvedValue("mock-image-id"),
      deleteImageFile: vi.fn().mockResolvedValue(undefined),
      downloadImageFile: vi.fn().mockResolvedValue(new Blob())
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

    // Default navigator storage mock
    const mockWritable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined)
    }
    const mockFile = new Blob(["mock-image-data"], { type: "image/png" })
    const mockFileHandle = {
      getFile: vi.fn().mockResolvedValue(mockFile),
      createWritable: vi.fn().mockResolvedValue(mockWritable)
    }
    const mockDirHandle: any = {
      getDirectoryHandle: vi
        .fn()
        .mockImplementation(() => Promise.resolve(mockDirHandle)),
      getFileHandle: vi.fn().mockResolvedValue(mockFileHandle)
    }

    vi.stubGlobal("navigator", {
      storage: {
        getDirectory: vi.fn().mockResolvedValue(mockDirHandle)
      }
    })

    // Default tables mocked return
    mockSyncStatesTable.toArray.mockResolvedValue([])
    mockStyleCardsTable.toArray.mockResolvedValue([])
    mockCategoriesTable.toArray.mockResolvedValue([])
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

  describe("syncImages", () => {
    it("should create folder if not found on drive", async () => {
      vi.mocked(mockGdriveClient.findFolder).mockResolvedValue(null)
      vi.mocked(mockGdriveClient.createFolder).mockResolvedValue(
        "new-folder-id"
      )

      await syncImages({
        token: "mock-token",
        gdriveClient: mockGdriveClient,
        onTokenUpdated: vi.fn(),
        addLog: vi.fn()
      })

      expect(mockGdriveClient.findFolder).toHaveBeenCalledWith(
        "mock-token",
        "style-atelier-images",
        undefined,
        expect.any(Function),
        expect.any(Object)
      )
      expect(mockGdriveClient.createFolder).toHaveBeenCalledWith(
        "mock-token",
        "style-atelier-images",
        undefined,
        expect.any(Function),
        expect.any(Object)
      )
    })

    it("should upload pending images and update db sync states", async () => {
      const pendingImage = {
        filePath: "images/cards/card-abc.png",
        cardId: "card-abc",
        hash: "hash-abc",
        syncStatus: "pending" as const,
        updatedAt: 1234
      }

      // Mock imageSyncStates table behavior for finding pending items
      mockSyncStatesTable.where.mockImplementation((field) => {
        if (field === "syncStatus") {
          return {
            equals: vi.fn().mockImplementation((status) => ({
              toArray: vi.fn().mockImplementation(async () => {
                if (status === "pending") return [pendingImage]
                return []
              })
            }))
          }
        }
        return {} as any
      })

      // Mock listFolderFiles to return empty
      vi.mocked(mockGdriveClient.listFolderFiles).mockResolvedValue([])

      await syncImages({
        token: "mock-token",
        gdriveClient: mockGdriveClient,
        onTokenUpdated: vi.fn(),
        addLog: vi.fn(),
        overwriteMode: "merge"
      })

      expect(mockGdriveClient.uploadImageFile).toHaveBeenCalledWith(
        "mock-token",
        "mock-folder-id",
        "card-abc.png",
        expect.any(Blob),
        null,
        expect.any(Function),
        expect.any(Object)
      )

      expect(mockSyncStatesTable.put).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: "images/cards/card-abc.png",
          cloudFileId: "mock-image-id",
          syncStatus: "synced"
        })
      )
    })

    it("should delete remote images that are flagged as deleted locally", async () => {
      const deletedImage = {
        filePath: "images/cards/card-xyz.png",
        cardId: "card-xyz",
        hash: "hash-xyz",
        cloudFileId: "cloud-xyz-id",
        syncStatus: "deleted" as const,
        updatedAt: 5678
      }

      mockSyncStatesTable.where.mockImplementation((field) => {
        if (field === "syncStatus") {
          return {
            equals: vi.fn().mockImplementation((status) => ({
              toArray: vi.fn().mockImplementation(async () => {
                if (status === "deleted") return [deletedImage]
                return []
              })
            }))
          }
        }
        return {} as any
      })

      await syncImages({
        token: "mock-token",
        gdriveClient: mockGdriveClient,
        onTokenUpdated: vi.fn(),
        addLog: vi.fn(),
        overwriteMode: "merge"
      })

      expect(mockGdriveClient.deleteImageFile).toHaveBeenCalledWith(
        "mock-token",
        "cloud-xyz-id",
        expect.any(Function),
        expect.any(Object)
      )

      expect(mockSyncStatesTable.delete).toHaveBeenCalledWith(
        "images/cards/card-xyz.png"
      )
    })

    it("should download missing remote images in merge or local overwrite mode", async () => {
      // Setup required local records
      mockStyleCardsTable.toArray.mockResolvedValue([
        {
          id: "card-remote",
          thumbnailPath: "images/cards/card-remote.png",
          isDeleted: false
        }
      ])

      // Drive list contains this file
      vi.mocked(mockGdriveClient.listFolderFiles).mockResolvedValue([
        {
          id: "remote-image-id",
          name: "card-remote.png",
          md5Checksum: "hash-remote"
        }
      ])

      // OPFS mock doesn't have it (listOpfsFiles returns empty)
      vi.mocked(listOpfsFiles).mockResolvedValue([])

      await syncImages({
        token: "mock-token",
        gdriveClient: mockGdriveClient,
        onTokenUpdated: vi.fn(),
        addLog: vi.fn(),
        overwriteMode: "merge"
      })

      expect(mockGdriveClient.downloadImageFile).toHaveBeenCalledWith(
        "mock-token",
        "remote-image-id",
        expect.any(Function),
        expect.any(Object)
      )

      expect(mockSyncStatesTable.put).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: "images/cards/card-remote.png",
          cloudFileId: "remote-image-id",
          syncStatus: "synced"
        })
      )
    })
  })
})
