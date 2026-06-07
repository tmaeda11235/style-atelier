import { renderHook } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ConfirmProvider } from "../contexts/ConfirmContext"
import { LanguageProvider } from "../contexts/LanguageContext"
import { useSettingsGoogleDrive } from "./useSettingsGoogleDrive"

// Mock auto-sync
vi.mock("../lib/auto-sync", () => ({
  setAutoSyncEnabled: vi.fn()
}))

// Mock google-drive library
vi.mock("../lib/google-drive", () => ({
  authorize: vi.fn().mockResolvedValue("mock-token"),
  clearCachedToken: vi.fn(),
  downloadBackup: vi.fn(),
  GDriveTimeoutError: class extends Error {},
  getBackupMetadata: vi.fn().mockResolvedValue(null),
  uploadBackup: vi.fn()
}))

vi.mock("../lib/backup-manager", () => ({
  exportDatabase: vi.fn(),
  importDatabase: vi.fn()
}))

describe("useSettingsGoogleDrive", () => {
  const addLog = vi.fn()
  const checkStorage = vi.fn()

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <LanguageProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
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
})
