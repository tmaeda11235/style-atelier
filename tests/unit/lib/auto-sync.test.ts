import {
  autoSyncConfig,
  checkAndMergeMobileTempData,
  checkAndMergeRemoteChanges,
  initializeAutoSync,
  isAutoSyncEnabled,
  setAutoSyncEnabled
} from "@/lib/auto-sync"
import * as backupManager from "@/lib/backup-manager"
import { db } from "@/lib/db"
import * as purgeOps from "@/lib/db/purge-ops"
import * as googleDrive from "@/lib/google-drive"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/google-drive", () => ({
  authorize: vi.fn(),
  getBackupMetadata: vi.fn(),
  downloadBackup: vi.fn(),
  uploadBackup: vi.fn(),
  searchTempSharedCardsFile: vi.fn(),
  downloadTempSharedCards: vi.fn(),
  deleteFile: vi.fn()
}))

vi.mock("@/lib/backup-manager", () => ({
  exportDatabase: vi.fn().mockResolvedValue('{"version": 1, "data": {}}'),
  importDatabase: vi.fn()
}))

vi.mock("@/lib/db/purge-ops", () => ({
  purgeDeletedRecords: vi.fn().mockResolvedValue(undefined)
}))

// Mock db hooks
const mockHooks: Record<string, Record<string, (...args: any[]) => any>> = {
  styleCards: {},
  categories: {},
  slotHistory: {}
}
vi.mock("@/lib/db", () => {
  const createHookMock = (tableName: string) =>
    vi.fn((event: string, callback: (...args: any[]) => any) => {
      mockHooks[tableName][event] = callback
    })
  return {
    db: {
      styleCards: {
        hook: createHookMock("styleCards")
      },
      categories: {
        hook: createHookMock("categories")
      },
      slotHistory: {
        hook: createHookMock("slotHistory")
      }
    }
  }
})

describe("auto-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.useFakeTimers()
    // Use short debounce/polling settings for fast tests
    autoSyncConfig.setDebounceMs(100)
    autoSyncConfig.setPollIntervalMs(500)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("Configuration & Toggle State", () => {
    it("returns false when sync or auto-sync is disabled", () => {
      localStorage.setItem("style-atelier-sync-enabled", "false")
      localStorage.setItem("style-atelier-auto-sync-enabled", "true")
      expect(isAutoSyncEnabled()).toBe(false)

      localStorage.setItem("style-atelier-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-enabled", "false")
      expect(isAutoSyncEnabled()).toBe(false)
    })

    it("returns true when both settings are enabled", () => {
      localStorage.setItem("style-atelier-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-enabled", "true")
      expect(isAutoSyncEnabled()).toBe(true)
    })

    it("updates localStorage when setAutoSyncEnabled is called", () => {
      setAutoSyncEnabled(true)
      expect(localStorage.getItem("style-atelier-auto-sync-enabled")).toBe(
        "true"
      )

      setAutoSyncEnabled(false)
      expect(localStorage.getItem("style-atelier-auto-sync-enabled")).toBe(
        "false"
      )
    })
  })

  describe("Automatic Backup Trigger", () => {
    it("debounces and triggers backup when db hook is fired", async () => {
      localStorage.setItem("style-atelier-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-enabled", "true")

      // Initialize hooks
      initializeAutoSync()

      // Ensure hook is registered and retrieve it
      expect(db.styleCards.hook).toHaveBeenCalledWith(
        "creating",
        expect.any(Function)
      )

      const creatingHook = (
        vi.mocked(db.styleCards.hook).mock.calls as any
      ).find((call: any) => call[0] === "creating")?.[1]
      expect(creatingHook).toBeDefined()

      vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token")
      vi.mocked(backupManager.exportDatabase).mockResolvedValue(
        '{"version":1,"data":{}}'
      )
      vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue({
        id: "file-1",
        modifiedTime: "2026-06-06T12:00:00.000Z",
        size: "100"
      })

      // Fire hook with mock transaction complete listener
      let transactionCompleteCallback: () => void = () => {}
      const mockTransaction = {
        on: vi.fn((event: string, callback: () => void) => {
          if (event === "complete") transactionCompleteCallback = callback
        })
      }

      ;(creatingHook as any)(null, null, mockTransaction)

      // Complete transaction
      transactionCompleteCallback()

      // Expect upload not called immediately (debounced)
      expect(googleDrive.uploadBackup).not.toHaveBeenCalled()

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(150)

      expect(googleDrive.authorize).toHaveBeenCalledWith(false)
      expect(backupManager.exportDatabase).toHaveBeenCalled()
      expect(googleDrive.uploadBackup).toHaveBeenCalledWith(
        "mock-token",
        '{"version":1,"data":{}}'
      )
      expect(localStorage.getItem("style-atelier-last-backup")).toBeDefined()
    })
  })

  describe("Remote Change Merging", () => {
    it("merges remote backup if remote modifiedTime is newer than local backup time", async () => {
      localStorage.setItem("style-atelier-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-enabled", "true")
      const now = Date.now()
      localStorage.setItem(
        "style-atelier-last-backup",
        (now - 60000).toString()
      ) // 1 minute ago

      vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token")
      const remoteTime = new Date(now - 30000) // 30 seconds ago
      vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue({
        id: "file-1",
        modifiedTime: remoteTime.toISOString(),
        size: "100"
      })
      vi.mocked(googleDrive.downloadBackup).mockResolvedValue(
        '{"remote": true}'
      )

      await checkAndMergeRemoteChanges()

      expect(googleDrive.downloadBackup).toHaveBeenCalledWith("mock-token")
      expect(backupManager.importDatabase).toHaveBeenCalledWith(
        '{"remote": true}',
        "merge"
      )
      expect(localStorage.getItem("style-atelier-last-backup")).toBe(
        remoteTime.getTime().toString()
      )
    })

    it("does not merge if remote backup is not newer", async () => {
      localStorage.setItem("style-atelier-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-enabled", "true")
      const now = Date.now()
      localStorage.setItem(
        "style-atelier-last-backup",
        (now - 30000).toString()
      ) // 30 seconds ago

      vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token")
      const remoteTime = new Date(now - 60000) // 1 minute ago
      vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue({
        id: "file-1",
        modifiedTime: remoteTime.toISOString(),
        size: "100"
      })

      await checkAndMergeRemoteChanges()

      expect(googleDrive.downloadBackup).not.toHaveBeenCalled()
      expect(backupManager.importDatabase).not.toHaveBeenCalled()
    })

    it("suspends auto-sync if last sync was more than 60 days ago", async () => {
      localStorage.setItem("style-atelier-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-enabled", "true")
      const sixtyOneDaysAgo = Date.now() - 61 * 24 * 60 * 60 * 1000
      localStorage.setItem(
        "style-atelier-last-backup",
        sixtyOneDaysAgo.toString()
      )

      await checkAndMergeRemoteChanges()

      expect(isAutoSyncEnabled()).toBe(false)
      expect(googleDrive.authorize).not.toHaveBeenCalled()
    })

    it("handles error in purgeDeletedRecords gracefully and continues", async () => {
      localStorage.setItem("style-atelier-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-enabled", "true")

      vi.mocked(purgeOps.purgeDeletedRecords).mockRejectedValue(
        new Error("Purge failed")
      )
      vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token")
      vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue({
        id: "file-1",
        modifiedTime: "2026-06-06T12:00:00.000Z",
        size: "100"
      })

      // Should not throw and continue execution
      await expect(checkAndMergeRemoteChanges()).resolves.not.toThrow()
      expect(googleDrive.authorize).toHaveBeenCalled()
    })

    it("handles general exception in checkAndMergeRemoteChanges and catches it", async () => {
      localStorage.setItem("style-atelier-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-enabled", "true")

      vi.mocked(purgeOps.purgeDeletedRecords).mockResolvedValue(undefined)
      vi.mocked(googleDrive.authorize).mockRejectedValue(
        new Error("Auth failed")
      )

      // Should catch the error and not throw it
      await expect(checkAndMergeRemoteChanges()).resolves.not.toThrow()
    })
  })

  describe("Hooks Triggering", () => {
    it("triggers auto backup for all hooks on styleCards, categories, and slotHistory", async () => {
      localStorage.setItem("style-atelier-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-enabled", "true")

      initializeAutoSync()

      vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token")
      vi.mocked(backupManager.exportDatabase).mockResolvedValue('{"version":1}')
      vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue({
        id: "file-1",
        modifiedTime: "2026-06-06T12:00:00.000Z",
        size: "100"
      })

      const tables = ["styleCards", "categories", "slotHistory"]
      const events = ["creating", "updating", "deleting"]

      for (const table of tables) {
        for (const event of events) {
          const hookFn = mockHooks[table]?.[event]
          expect(hookFn).toBeDefined()

          let transactionCompleteCallback: () => void = () => {}
          const mockTransaction = {
            on: vi.fn((ev: string, callback: () => void) => {
              if (ev === "complete") transactionCompleteCallback = callback
            })
          }

          // Trigger the hook
          hookFn(null, null, mockTransaction)
          transactionCompleteCallback()
        }
      }

      // Fast-forward once to trigger the debounced performAutoBackup
      await vi.advanceTimersByTimeAsync(150)
      // Flush microtasks to allow the async authorize -> exportDatabase -> uploadBackup sequence to resolve
      for (let i = 0; i < 10; i++) {
        await Promise.resolve()
      }

      expect(googleDrive.uploadBackup).toHaveBeenCalled()
    })
  })

  describe("Mobile Temp Data Syncing", () => {
    it("skips if sync is disabled", async () => {
      localStorage.setItem("style-atelier-sync-enabled", "false")
      await checkAndMergeMobileTempData()
      expect(googleDrive.searchTempSharedCardsFile).not.toHaveBeenCalled()
    })

    it("checks, downloads, merges and deletes temp file if found", async () => {
      localStorage.setItem("style-atelier-sync-enabled", "true")
      vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token")
      vi.mocked(googleDrive.searchTempSharedCardsFile).mockResolvedValue(
        "temp-file-id"
      )
      vi.mocked(googleDrive.downloadTempSharedCards).mockResolvedValue(
        '{"temp": true}'
      )

      await checkAndMergeMobileTempData()

      expect(googleDrive.authorize).toHaveBeenCalledWith(false)
      expect(googleDrive.searchTempSharedCardsFile).toHaveBeenCalledWith(
        "mock-token"
      )
      expect(googleDrive.downloadTempSharedCards).toHaveBeenCalledWith(
        "mock-token"
      )
      expect(backupManager.importDatabase).toHaveBeenCalledWith(
        '{"temp": true}',
        "merge"
      )
      expect(googleDrive.deleteFile).toHaveBeenCalledWith(
        "mock-token",
        "temp-file-id"
      )
    })

    it("does not merge or delete if temp file is not found", async () => {
      localStorage.setItem("style-atelier-sync-enabled", "true")
      vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token")
      vi.mocked(googleDrive.searchTempSharedCardsFile).mockResolvedValue(null)

      await checkAndMergeMobileTempData()

      expect(googleDrive.searchTempSharedCardsFile).toHaveBeenCalled()
      expect(googleDrive.downloadTempSharedCards).not.toHaveBeenCalled()
      expect(backupManager.importDatabase).not.toHaveBeenCalled()
      expect(googleDrive.deleteFile).not.toHaveBeenCalled()
    })
  })
})
