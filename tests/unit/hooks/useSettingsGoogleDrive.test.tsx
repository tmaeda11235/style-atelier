import { ConfirmProvider } from "@/contexts/ConfirmContext"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { useSettingsGoogleDrive } from "@/hooks/useSettingsGoogleDrive"
import { QueryTestProvider } from "@/test/react-query-helper"
import { act, renderHook, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/contexts/ConfirmContext", () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
  ConfirmProvider: ({ children }: any) => <>{children}</>
}))

// Mock auto-sync
vi.mock("@/lib/auto-sync", () => ({
  setAutoSyncEnabled: vi.fn()
}))

// Mock google-drive library
vi.mock("@/lib/google-drive", () => {
  const authorize = vi.fn().mockResolvedValue("mock-token")
  const clearCachedToken = vi.fn()
  const downloadBackup = vi.fn()
  const getBackupMetadata = vi.fn().mockResolvedValue(null)
  const uploadBackup = vi.fn()
  const defaultGoogleDriveClient = {
    authorize,
    clearCachedToken,
    downloadBackup,
    getBackupMetadata,
    uploadBackup
  }
  return {
    authorize,
    clearCachedToken,
    downloadBackup,
    GDriveTimeoutError: class extends Error {},
    getBackupMetadata,
    uploadBackup,
    defaultGoogleDriveClient
  }
})

vi.mock("@/lib/backup-manager", () => ({
  exportDatabase: vi.fn(),
  importDatabase: vi.fn()
}))

describe("useSettingsGoogleDrive", () => {
  const addLog = vi.fn()
  const checkStorage = vi.fn()

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <LanguageProvider>
      <ConfirmProvider>
        <QueryTestProvider>{children}</QueryTestProvider>
      </ConfirmProvider>
    </LanguageProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("should initialize with default values", () => {
    const { result } = renderHook(
      () => useSettingsGoogleDrive({ addLog, checkStorage }),
      { wrapper }
    )
    expect(result.current.isSyncEnabled).toBe(false)
    expect(result.current.isAutoSyncEnabled).toBe(false)
    expect(result.current.isSyncing).toBe(false)
    expect(result.current.isRestoring).toBe(false)
    expect(result.current.lastBackup).toBeNull()
  })

  it("should handle toggle sync enabling", async () => {
    const mockAuthorize = vi.fn().mockResolvedValue("test-token-xyz")
    const mockClient = {
      authorize: mockAuthorize,
      clearCachedToken: vi.fn(),
      downloadBackup: vi.fn(),
      getBackupMetadata: vi.fn().mockResolvedValue(null),
      uploadBackup: vi.fn()
    }

    const { result } = renderHook(
      () =>
        useSettingsGoogleDrive({
          addLog,
          checkStorage,
          gdriveClient: mockClient as any
        }),
      { wrapper }
    )

    await act(async () => {
      result.current.handleToggleSync(true)
    })

    expect(mockAuthorize).toHaveBeenCalledWith(true)
    await waitFor(() => {
      expect(result.current.isSyncEnabled).toBe(true)
      expect(result.current.accessToken).toBe("test-token-xyz")
    })
  })

  it("should handle toggle sync disabling", async () => {
    localStorage.setItem("style-atelier-sync-enabled", "true")
    const mockClearToken = vi.fn().mockResolvedValue(undefined)
    const mockClient = {
      authorize: vi.fn().mockResolvedValue("test-token-xyz"),
      clearCachedToken: mockClearToken,
      downloadBackup: vi.fn(),
      getBackupMetadata: vi.fn().mockResolvedValue(null),
      uploadBackup: vi.fn()
    }

    const { result } = renderHook(
      () =>
        useSettingsGoogleDrive({
          addLog,
          checkStorage,
          gdriveClient: mockClient as any
        }),
      { wrapper }
    )

    // Wait for initial silent authorize
    await waitFor(() => {
      expect(result.current.isSyncEnabled).toBe(true)
      expect(result.current.accessToken).toBe("test-token-xyz")
    })

    await act(async () => {
      result.current.handleToggleSync(false)
    })

    expect(mockClearToken).toHaveBeenCalledWith("test-token-xyz")
    await waitFor(() => {
      expect(result.current.isSyncEnabled).toBe(false)
      expect(result.current.accessToken).toBeNull()
    })
  })

  it("should handle toggle auto sync", async () => {
    const { setAutoSyncEnabled } = await import("@/lib/auto-sync")
    const { result } = renderHook(
      () => useSettingsGoogleDrive({ addLog, checkStorage }),
      { wrapper }
    )

    await act(async () => {
      result.current.handleToggleAutoSync(true)
    })

    await waitFor(() => {
      expect(setAutoSyncEnabled).toHaveBeenCalledWith(true)
      expect(result.current.isAutoSyncEnabled).toBe(true)
    })
  })

  it("should handle database synchronization", async () => {
    localStorage.setItem("style-atelier-sync-enabled", "true")
    const { importDatabase, exportDatabase } =
      await import("@/lib/backup-manager")
    vi.mocked(exportDatabase).mockResolvedValue('{"cards":[]}')

    const mockDownload = vi.fn().mockResolvedValue('{"cards":[]}')
    const mockUpload = vi.fn().mockResolvedValue(undefined)
    const mockClient = {
      authorize: vi.fn().mockResolvedValue("test-token-xyz"),
      clearCachedToken: vi.fn(),
      downloadBackup: mockDownload,
      getBackupMetadata: vi.fn().mockResolvedValue(null),
      uploadBackup: mockUpload
    }

    const { result } = renderHook(
      () =>
        useSettingsGoogleDrive({
          addLog,
          checkStorage,
          gdriveClient: mockClient as any
        }),
      { wrapper }
    )

    // Wait for silent authorize on mount
    await waitFor(() => {
      expect(result.current.isSyncEnabled).toBe(true)
    })

    await act(async () => {
      result.current.handleSync()
    })

    await waitFor(() => {
      expect(mockDownload).toHaveBeenCalledWith(
        "test-token-xyz",
        expect.any(Function),
        expect.any(Function),
        expect.any(Object)
      )
      expect(importDatabase).toHaveBeenCalledWith('{"cards":[]}', "merge")
      expect(exportDatabase).toHaveBeenCalled()
      expect(mockUpload).toHaveBeenCalledWith(
        "test-token-xyz",
        '{"cards":[]}',
        expect.any(Function),
        expect.any(Function),
        expect.any(Object)
      )
      expect(checkStorage).toHaveBeenCalled()
      expect(result.current.lastBackup).not.toBeNull()
    })
  })

  it("should handle force recovery", async () => {
    localStorage.setItem("style-atelier-sync-enabled", "true")
    const { importDatabase } = await import("@/lib/backup-manager")

    const mockDownload = vi.fn().mockResolvedValue('{"cards":[]}')
    const mockClient = {
      authorize: vi.fn().mockResolvedValue("test-token-xyz"),
      clearCachedToken: vi.fn(),
      downloadBackup: mockDownload,
      getBackupMetadata: vi.fn().mockResolvedValue({
        id: "backup-id",
        modifiedTime: "2026-06-03T12:00:00.000Z",
        size: "1024"
      }),
      uploadBackup: vi.fn()
    }

    const { result } = renderHook(
      () =>
        useSettingsGoogleDrive({
          addLog,
          checkStorage,
          gdriveClient: mockClient as any
        }),
      { wrapper }
    )

    // Wait for silent authorize on mount
    await waitFor(() => {
      expect(result.current.isSyncEnabled).toBe(true)
    })

    await act(async () => {
      result.current.handleForceRecovery()
    })

    await waitFor(() => {
      expect(mockDownload).toHaveBeenCalledWith(
        "test-token-xyz",
        expect.any(Function),
        expect.any(Function),
        expect.any(Object)
      )
      expect(importDatabase).toHaveBeenCalledWith('{"cards":[]}', "replace")
      expect(checkStorage).toHaveBeenCalled()
    })
  })
})
