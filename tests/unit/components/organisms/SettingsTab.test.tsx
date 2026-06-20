import { SettingsTab } from "@/components/organisms/SettingsTab"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { LicenseProvider } from "@/contexts/LicenseContext"
import { SettingsProvider } from "@/contexts/SettingsContext"
import { WebLlmProvider } from "@/contexts/WebLlmContext"
import * as backupManager from "@/lib/backup-manager"
import { exportDatabase, importDatabase } from "@/lib/backup-manager"
import { db } from "@/lib/db"
import * as googleDrive from "@/lib/google-drive"
import { QueryTestProvider } from "@/test/react-query-helper"
import {
  act,
  configure,
  fireEvent,
  screen,
  render as tlRender,
  waitFor
} from "@testing-library/react"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { i18n } from "../../../../src/lib/i18n"

configure({ asyncUtilTimeout: 5000 })

vi.mock("@/contexts/ConfirmContext", () => ({
  useConfirm: () => (options: any) =>
    Promise.resolve(window.confirm(options.message))
}))

const render = (ui: React.ReactElement, options?: any) => {
  return tlRender(
    <QueryTestProvider>
      <LanguageProvider>
        <LicenseProvider>
          <SettingsProvider>
            <WebLlmProvider>{ui}</WebLlmProvider>
          </SettingsProvider>
        </LicenseProvider>
      </LanguageProvider>
    </QueryTestProvider>,
    options
  )
}

vi.mock("@/lib/google-drive", () => {
  class GDriveTimeoutError extends Error {
    constructor(message = "Google Drive API request timed out.") {
      super(message)
      this.name = "GDriveTimeoutError"
    }
  }
  const authorize = vi.fn()
  const clearCachedToken = vi.fn().mockResolvedValue(undefined)
  const uploadBackup = vi.fn()
  const downloadBackup = vi.fn()
  const getBackupMetadata = vi.fn()
  const defaultGoogleDriveClient = {
    authorize,
    clearCachedToken,
    uploadBackup,
    downloadBackup,
    getBackupMetadata
  }
  return {
    authorize,
    clearCachedToken,
    uploadBackup,
    downloadBackup,
    getBackupMetadata,
    GDriveTimeoutError,
    defaultGoogleDriveClient
  }
})

vi.mock("@/lib/backup-manager", () => ({
  exportDatabase: vi
    .fn()
    .mockResolvedValue(
      '{"version": 1, "data": {"styleCards": [], "categories": [], "userSettings": [], "historyItems": []}}'
    ),
  importDatabase: vi.fn().mockResolvedValue(undefined)
}))

vi.mock("@/lib/auto-sync", () => ({
  setAutoSyncEnabled: vi.fn()
}))

describe("SettingsTab", () => {
  const mockAddLog = vi.fn()
  const mockResetDb = vi.fn()

  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()
    await i18n.changeLanguage("ja")

    // Provide default mock implementations for googleDrive
    vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token-123")
    vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue(null)
    vi.mocked(googleDrive.clearCachedToken).mockResolvedValue(undefined)
    vi.mocked(googleDrive.downloadBackup).mockResolvedValue("mock-backup-data")
    vi.mocked(googleDrive.uploadBackup).mockResolvedValue({
      id: "new-file-123"
    } as any)

    // Reset window.confirm to default true to avoid leakage from other tests
    window.confirm = vi.fn().mockReturnValue(true)

    // Mock console.error to keep logs clean
    vi.spyOn(console, "error").mockImplementation(() => {})

    // Mock navigator.language to default to Japanese for existing tests
    Object.defineProperty(window.navigator, "language", {
      value: "ja-JP",
      configurable: true,
      writable: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // --- Local File Backup Tests (from HEAD) ---

  it("renders Local File Backup card correctly", () => {
    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />)

    expect(screen.getByText("ローカルバックアップ (オフライン)")).toBeDefined()
    expect(screen.getByText("JSONエクスポート")).toBeDefined()
    expect(screen.getByText("JSONインポート")).toBeDefined()
    expect(
      screen.getByText(
        /スタイルカードとバインダーのデータをローカルのJSONファイルにエクスポート/
      )
    ).toBeDefined()
  })

  it("triggers file download when Export JSON is clicked", async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {})
    const appendChildSpy = vi.spyOn(document.body, "appendChild")
    const removeChildSpy = vi.spyOn(document.body, "removeChild")

    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />)

    const exportBtn = screen.getByText("JSONエクスポート")
    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(exportDatabase).toHaveBeenCalled()
    })

    expect(clickSpy).toHaveBeenCalled()
    expect(appendChildSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()

    // Find the anchor element call
    const anchorCall = appendChildSpy.mock.calls.find(
      (call) => call[0] instanceof HTMLElement && call[0].tagName === "A"
    )
    expect(anchorCall).toBeDefined()

    const addedAnchor = anchorCall![0] as HTMLAnchorElement
    expect(addedAnchor.download).toContain("style-atelier-backup-")
    expect(addedAnchor.download).toContain(".json")
    expect(addedAnchor.href).toBe("blob:http://localhost/mock-uuid")

    // Verify it was also removed
    const isRemoved = removeChildSpy.mock.calls.some(
      (call) => call[0] === addedAnchor
    )
    expect(isRemoved).toBe(true)

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(
      "blob:http://localhost/mock-uuid"
    )
    expect(mockAddLog).toHaveBeenCalledWith(
      "Database exported to local JSON file successfully."
    )
  })

  it("handles successful local import from JSON file", async () => {
    const { container } = render(
      <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
    )

    const fileInput = container.querySelector(
      '#local-backup-section input[type="file"]'
    ) as HTMLInputElement
    expect(fileInput).toBeDefined()

    const mockStyleCard = {
      id: "card-123",
      name: "Mock Card",
      createdAt: 123456789,
      updatedAt: 123456789,
      promptSegments: [{ type: "text", value: "test command" }],
      parameters: { ar: "16:9" },
      masking: { isSrefHidden: false, isPHidden: false },
      tier: "Common",
      isFavorite: false,
      isPinned: false,
      usageCount: 0,
      tags: ["test"],
      category: "cat1",
      dominantColor: "#ffffff",
      thumbnailData: "data:image/png;base64,abc",
      frameId: "default",
      genealogy: { generation: 1, parentIds: [] }
    }
    const backupContent = JSON.stringify({
      version: 1,
      exportedAt: 123456789,
      data: {
        styleCards: [mockStyleCard]
      }
    })
    const file = new File([backupContent], "backup.json", {
      type: "application/json"
    })

    // Trigger file change event
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled()
      expect(importDatabase).toHaveBeenCalledWith(backupContent, "merge")
      expect(mockAddLog).toHaveBeenCalledWith(
        "Database restored from local JSON file successfully."
      )
    })
  })

  it("fails to import when file contains invalid backup structure", async () => {
    vi.mocked(importDatabase).mockRejectedValueOnce(
      new Error("Database validation failed: invalid structure")
    )
    const { container } = render(
      <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
    )

    const fileInput = container.querySelector(
      '#local-backup-section input[type="file"]'
    ) as HTMLInputElement
    const invalidContent = '{"foo": "bar"}'
    const file = new File([invalidContent], "backup.json", {
      type: "application/json"
    })

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled()
      expect(mockAddLog).toHaveBeenCalledWith(
        expect.stringContaining("Import failed:")
      )
    })

    expect(importDatabase).toHaveBeenCalledWith(invalidContent, "merge")
  })

  it("cancels import if user rejects confirmation", async () => {
    // Override window.confirm to return false
    window.confirm = vi.fn().mockReturnValue(false)

    const { container } = render(
      <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
    )

    const fileInput = container.querySelector(
      '#local-backup-section input[type="file"]'
    ) as HTMLInputElement
    const backupContent = '{"version": 1, "data": {"styleCards": []}}'
    const file = new File([backupContent], "backup.json", {
      type: "application/json"
    })

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled()
    })

    expect(fileInput.value).toBe("")
    expect(importDatabase).not.toHaveBeenCalled()
    expect(mockAddLog).not.toHaveBeenCalled()
  })

  // --- Google Drive Cloud Sync Tests (from main) ---

  it("renders with default state (sync disabled)", () => {
    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />)

    expect(screen.getByText("Google Drive クラウド同期")).toBeDefined()

    // Sync button should be disabled
    const syncBtn = screen.getByRole("button", { name: /Google Driveと同期/i })
    expect(syncBtn).toBeDisabled()
  })

  it("enabling sync performs authorization and fetches backup metadata", async () => {
    vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token-123")
    vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue({
      id: "file-123",
      modifiedTime: "2026-06-03T12:00:00.000Z",
      size: "153600" // 150 KB
    })

    const { container } = render(
      <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
    )

    const toggleBtn = container.querySelector("#google-drive-toggle-btn")!
    fireEvent.click(toggleBtn)

    await waitFor(() => {
      expect(googleDrive.authorize).toHaveBeenCalledWith(true)
      expect(googleDrive.getBackupMetadata).toHaveBeenCalledWith(
        "mock-token-123",
        expect.any(Function)
      )
    })

    // Verify metadata preview is displayed
    await waitFor(() => {
      expect(screen.getByText("クラウドバックアップのプレビュー")).toBeDefined()
      expect(
        screen.getByText(/更新日時: (2026\/6\/3|6\/3\/2026)/)
      ).toBeDefined()
      expect(screen.getByText(/サイズ: 150\.0 KB/)).toBeDefined()
    })
  })

  it("always shows confirmation dialog on Force Recovery, even if checked multiple times", async () => {
    vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token-123")
    vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue({
      id: "file-123",
      modifiedTime: "2026-06-03T12:00:00.000Z",
      size: "153600"
    })
    vi.mocked(googleDrive.downloadBackup).mockResolvedValue("mock-backup-data")
    vi.mocked(backupManager.importDatabase).mockResolvedValue(undefined)

    const { container } = render(
      <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
    )

    // Enable sync
    const toggleBtn = container.querySelector("#google-drive-toggle-btn")!
    fireEvent.click(toggleBtn)

    // Wait for sync to be enabled
    await waitFor(
      () => {
        expect(
          screen.getByText("クラウドバックアップのプレビュー")
        ).toBeDefined()
      },
      { timeout: 5000 }
    )

    const restoreBtn = screen.getByRole("button", {
      name: /Google Driveから強制リカバリ/i
    })
    expect(restoreBtn).not.toBeDisabled()

    // First restore attempt
    fireEvent.click(restoreBtn)
    await waitFor(
      () => {
        expect(window.confirm).toHaveBeenCalledTimes(1)
      },
      { timeout: 5000 }
    )
    expect(vi.mocked(window.confirm).mock.calls[0][0]).toContain(
      "クラウド上のバックアップ情報"
    )
    expect(vi.mocked(window.confirm).mock.calls[0][0]).toContain("150.0 KB")

    await waitFor(
      () => {
        expect(googleDrive.downloadBackup).toHaveBeenCalledWith(
          "mock-token-123",
          expect.any(Function),
          expect.any(Function),
          expect.any(Object)
        )
        expect(backupManager.importDatabase).toHaveBeenCalledWith(
          "mock-backup-data",
          "replace"
        )
      },
      { timeout: 5000 }
    )

    // Reset confirm mock calls
    vi.mocked(window.confirm).mockClear()

    // Second restore attempt - should still prompt confirmation
    fireEvent.click(restoreBtn)
    await waitFor(
      () => {
        expect(window.confirm).toHaveBeenCalledTimes(1)
      },
      { timeout: 5000 }
    )
  })

  it("shows confirmation dialog in English when language is English", async () => {
    localStorage.setItem("style-atelier-language", "en")
    await i18n.changeLanguage("en")
    // Override navigator.language to English
    Object.defineProperty(window.navigator, "language", {
      value: "en-US",
      configurable: true,
      writable: true
    })

    vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token-123")
    vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue({
      id: "file-123",
      modifiedTime: "2026-06-03T12:00:00.000Z",
      size: "153600"
    })
    vi.mocked(googleDrive.downloadBackup).mockResolvedValue("mock-backup-data")
    vi.mocked(backupManager.importDatabase).mockResolvedValue(undefined)

    const { container } = render(
      <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
    )

    // Enable sync
    const toggleBtn = container.querySelector("#google-drive-toggle-btn")!
    fireEvent.click(toggleBtn)

    await waitFor(
      () => {
        expect(screen.getByText(/Cloud Backup/i)).toBeDefined()
      },
      { timeout: 10000 }
    )

    const restoreBtn = screen.getByRole("button", {
      name: /Force Restore from Google Drive/i
    })
    expect(restoreBtn).not.toBeDisabled()

    fireEvent.click(restoreBtn)
    await waitFor(
      () => {
        expect(window.confirm).toHaveBeenCalledTimes(1)
      },
      { timeout: 5000 }
    )
    expect(vi.mocked(window.confirm).mock.calls[0][0]).toContain(
      "[Cloud Backup Information]"
    )
    expect(vi.mocked(window.confirm).mock.calls[0][0]).toContain("150.0 KB")
  })

  it("aborts force recovery if user cancels confirmation dialog", async () => {
    window.confirm = vi.fn().mockReturnValue(false) // User clicks Cancel
    vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token-123")
    vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue(null)

    const { container } = render(
      <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
    )

    // Enable sync
    const toggleBtn = container.querySelector("#google-drive-toggle-btn")!
    fireEvent.click(toggleBtn)

    await waitFor(
      () => {
        const restoreBtn = screen.getByRole("button", {
          name: /Google Driveから強制リカバリ/i
        })
        expect(restoreBtn).not.toBeDisabled()
      },
      { timeout: 5000 }
    )

    const restoreBtn = screen.getByRole("button", {
      name: /Google Driveから強制リカバリ/i
    })
    fireEvent.click(restoreBtn)

    await waitFor(
      () => {
        expect(window.confirm).toHaveBeenCalledTimes(1)
      },
      { timeout: 5000 }
    )
    expect(googleDrive.downloadBackup).not.toHaveBeenCalled()
    expect(backupManager.importDatabase).not.toHaveBeenCalled()
  })

  describe("Google Drive Timeout and Cancel UI behavior", () => {
    beforeEach(() => {
      vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token-123")
      vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue(null)
    })

    it("displays Cancel button during sync and handles manual cancellation", async () => {
      let triggerAbort: (() => void) | undefined
      const pendingPromise = new Promise<string>((resolve, reject) => {
        triggerAbort = () => {
          const err = new DOMException(
            "The user aborted a request.",
            "AbortError"
          )
          reject(err)
        }
      })
      vi.mocked(googleDrive.downloadBackup).mockReturnValue(pendingPromise)
      vi.mocked(googleDrive.uploadBackup).mockReturnValue(pendingPromise as any)

      const { container } = render(
        <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
      )

      // Enable sync
      const toggleBtn = container.querySelector("#google-drive-toggle-btn")!
      fireEvent.click(toggleBtn)

      await waitFor(
        () => {
          const syncBtn = screen.getByRole("button", {
            name: /Google Driveと同期/i
          })
          expect(syncBtn).not.toBeDisabled()
        },
        { timeout: 5000 }
      )

      const syncBtn = screen.getByRole("button", {
        name: /Google Driveと同期/i
      })
      fireEvent.click(syncBtn)

      // Verify Cancel button is displayed
      await waitFor(
        () => {
          expect(screen.getByText("キャンセル")).toBeDefined()
        },
        { timeout: 5000 }
      )

      // Click Cancel
      const cancelBtn = screen.getByText("キャンセル")
      fireEvent.click(cancelBtn)

      if (triggerAbort) triggerAbort()

      // Verify log and status message reflect cancellation
      await waitFor(
        () => {
          expect(mockAddLog).toHaveBeenCalledWith("Sync cancelled by user.")
          expect(screen.getByText("同期がキャンセルされました")).toBeDefined()
        },
        { timeout: 5000 }
      )
    })

    it("handles connection timeout error gracefully", async () => {
      vi.mocked(googleDrive.downloadBackup).mockRejectedValue(
        new googleDrive.GDriveTimeoutError()
      )

      const { container } = render(
        <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
      )

      // Enable sync
      const toggleBtn = container.querySelector("#google-drive-toggle-btn")!
      fireEvent.click(toggleBtn)

      await waitFor(
        () => {
          const syncBtn = screen.getByRole("button", {
            name: /Google Driveと同期/i
          })
          expect(syncBtn).not.toBeDisabled()
        },
        { timeout: 5000 }
      )

      const syncBtn = screen.getByRole("button", {
        name: /Google Driveと同期/i
      })
      fireEvent.click(syncBtn)

      // Verify log and status message reflect timeout
      await waitFor(
        () => {
          expect(mockAddLog).toHaveBeenCalledWith(
            "Sync failed: Connection timed out."
          )
          expect(
            screen.getByText(
              "同期がタイムアウトしました。ネットワーク接続を確認してください。"
            )
          ).toBeDefined()
        },
        { timeout: 5000 }
      )
    })
  })

  // --- Storage Management Tests ---

  it("renders Storage Management card correctly with normal usage", async () => {
    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />)

    expect(screen.getByText("ストレージ管理")).toBeDefined()

    // Wait for the estimate to resolve
    await waitFor(
      () => {
        expect(screen.getByText(/使用量: 5.0 MB \/ 100.0 MB/)).toBeDefined()
        expect(screen.getByText("5%")).toBeDefined()
      },
      { timeout: 5000 }
    )

    // Check that warning alerts do not render
    expect(screen.queryByText(/注意: 空き容量が少なくなっています/)).toBeNull()
    expect(screen.queryByText(/警告: 容量制限に近いです/)).toBeNull()
  })

  it("displays warning message when storage usage is between 80% and 90%", async () => {
    vi.mocked(window.navigator.storage.estimate).mockResolvedValue({
      usage: 1024 * 1024 * 85, // 85 MB
      quota: 1024 * 1024 * 100 // 100 MB
    })

    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />)

    await waitFor(
      () => {
        expect(screen.getByText(/使用量: 85.0 MB \/ 100.0 MB/)).toBeDefined()
        expect(screen.getByText("85%")).toBeDefined()
        expect(
          screen.getByText(/注意: 空き容量が少なくなっています/)
        ).toBeDefined()
      },
      { timeout: 5000 }
    )

    expect(screen.queryByText(/警告: 容量制限に近いです/)).toBeNull()
  })

  it("displays danger warning message when storage usage is 90% or above", async () => {
    vi.mocked(window.navigator.storage.estimate).mockResolvedValue({
      usage: 1024 * 1024 * 95, // 95 MB
      quota: 1024 * 1024 * 100 // 100 MB
    })

    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />)

    await waitFor(
      () => {
        expect(screen.getByText(/使用量: 95.0 MB \/ 100.0 MB/)).toBeDefined()
        expect(screen.getByText("95%")).toBeDefined()
        expect(screen.getByText(/警告: 容量制限に近いです/)).toBeDefined()
      },
      { timeout: 5000 }
    )

    expect(screen.queryByText(/注意: 空き容量が少なくなっています/)).toBeNull()
  })

  it("handles prompt history clearing successfully", async () => {
    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />)

    await waitFor(() => {
      expect(screen.getByText("ストレージ管理")).toBeDefined()
    })

    const clearBtn = screen.getByRole("button", { name: /履歴をクリア/i })
    fireEvent.click(clearBtn)

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => {
      expect(db.historyItems.clear).toHaveBeenCalled()
      expect(mockAddLog).toHaveBeenCalledWith(
        "Prompt history cleared successfully."
      )
    })
  })

  it("displays progress percentage and progress bar during sync", async () => {
    let progressCallback: any = null
    vi.mocked(googleDrive.downloadBackup).mockImplementation(
      async (token, onTokenUpdated, onProgress, _options) => {
        if (onProgress) progressCallback = onProgress
        return new Promise(() => {})
      }
    )

    const { container } = render(
      <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
    )

    // Enable sync
    const toggleBtn = container.querySelector("#google-drive-toggle-btn")!
    fireEvent.click(toggleBtn)

    // Wait for sync to be enabled
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Google Driveと同期/i })
      ).not.toBeDisabled()
    })

    const syncBtn = screen.getByRole("button", { name: /Google Driveと同期/i })
    fireEvent.click(syncBtn)

    await waitFor(() => {
      expect(googleDrive.downloadBackup).toHaveBeenCalled()
    })

    expect(progressCallback).not.toBeNull()

    // Trigger 50% download progress (maps to 25% overall progress)
    act(() => {
      progressCallback(50)
    })

    // Check button text changes
    expect(screen.getByText("同期中... 25%")).toBeDefined()
    // Check status message displays progress
    expect(screen.getByText("データをダウンロード中 (50%)...")).toBeDefined()
  })

  it("displays progress percentage and progress bar during force recovery", async () => {
    let progressCallback: any = null
    vi.mocked(googleDrive.downloadBackup).mockImplementation(
      async (token, onTokenUpdated, onProgress, _context, _options) => {
        if (onProgress) progressCallback = onProgress
        return new Promise(() => {})
      }
    )

    const { container } = render(
      <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
    )

    // Enable sync
    const toggleBtn = container.querySelector("#google-drive-toggle-btn")!
    fireEvent.click(toggleBtn)

    // Wait for sync to be enabled
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Google Driveから強制リカバリ/i })
      ).not.toBeDisabled()
    })

    const restoreBtn = screen.getByRole("button", {
      name: /Google Driveから強制リカバリ/i
    })
    fireEvent.click(restoreBtn)

    await waitFor(() => {
      expect(googleDrive.downloadBackup).toHaveBeenCalled()
    })

    expect(progressCallback).not.toBeNull()

    // Trigger 60% progress
    act(() => {
      progressCallback(60)
    })

    // Check status message displays progress
    expect(screen.getByText("データをダウンロード中 (60%)...")).toBeDefined()
  })

  // --- Easy Mode Tests ---

  it("renders Interface Mode Settings card correctly", () => {
    render(
      <SettingsTab
        addLog={mockAddLog}
        onResetDb={mockResetDb}
        isEasyMode={false}
      />
    )

    expect(screen.getByText("かんたんモード (Easy Mode)")).toBeDefined()
    expect(screen.getByText("かんたんモードを有効にする")).toBeDefined()
  })

  it("calls onToggleEasyMode when the toggle button is clicked", () => {
    const mockToggleEasyMode = vi.fn()
    const { container } = render(
      <SettingsTab
        addLog={mockAddLog}
        onResetDb={mockResetDb}
        isEasyMode={false}
        onToggleEasyMode={mockToggleEasyMode}
      />
    )

    const toggleBtn = container.querySelector("#easy-mode-toggle-btn")
    expect(toggleBtn).not.toBeNull()

    if (toggleBtn) {
      fireEvent.click(toggleBtn)
    }

    expect(mockToggleEasyMode).toHaveBeenCalledWith(true)
  })

  it("renders Expert Features card and allows toggling individual features", () => {
    const { container } = render(
      <SettingsTab
        addLog={mockAddLog}
        onResetDb={mockResetDb}
        isEasyMode={false}
      />
    )

    // Verify Title exists
    expect(screen.getByText("エキスパート機能の個別設定")).toBeDefined()

    // Verify all toggle buttons are rendered
    const features = [
      "stack",
      "slot",
      "rarity",
      "tags",
      "categories",
      "multicard",
      "cardediting",
      "multiimage"
    ]
    features.forEach((feat) => {
      const btn = container.querySelector(`#expert-feature-${feat}-btn`)
      expect(btn).not.toBeNull()
    })

    // Test toggling one of them
    const slotToggleBtn = container.querySelector("#expert-feature-slot-btn")
    expect(slotToggleBtn).not.toBeNull()

    if (slotToggleBtn) {
      fireEvent.click(slotToggleBtn)
    }
  })

  describe("Auto Sync Settings", () => {
    it("renders auto-sync toggle when sync is enabled", async () => {
      vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token-123")
      vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue(null)

      const { container } = render(
        <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
      )

      // Initially auto-sync toggle shouldn't be rendered because isSyncEnabled is false
      expect(container.querySelector("#google-drive-auto-sync-btn")).toBeNull()

      // Enable main sync
      const toggleBtn = container.querySelector("#google-drive-toggle-btn")!
      fireEvent.click(toggleBtn)

      await waitFor(() => {
        expect(
          container.querySelector("#google-drive-auto-sync-btn")
        ).not.toBeNull()
      })

      // Toggle auto-sync
      const autoSyncBtn = container.querySelector(
        "#google-drive-auto-sync-btn"
      )!
      fireEvent.click(autoSyncBtn)

      const { setAutoSyncEnabled } = await import("@/lib/auto-sync")
      expect(setAutoSyncEnabled).toHaveBeenCalledWith(true)
    })

    it("disables auto-sync if main sync is disabled", async () => {
      vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token-123")
      vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue(null)

      localStorage.setItem("style-atelier-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-enabled", "true")

      const { container } = render(
        <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
      )

      // Ensure both are enabled on mount
      await waitFor(() => {
        expect(
          container.querySelector("#google-drive-auto-sync-btn")
        ).not.toBeNull()
      })

      // Disable main sync
      const toggleBtn = container.querySelector("#google-drive-toggle-btn")!
      fireEvent.click(toggleBtn)

      const { setAutoSyncEnabled } = await import("@/lib/auto-sync")
      // Main sync turning off should call setAutoSyncEnabled(false)
      await waitFor(() => {
        expect(setAutoSyncEnabled).toHaveBeenCalledWith(false)
        expect(
          container.querySelector("#google-drive-auto-sync-btn")
        ).toBeNull()
      })
    })
  })

  describe("Auto Sync Age Suspension UX", () => {
    it("renders auto-sync suspended warning banner when autoSyncSuspendedByAge is true", async () => {
      vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token-123")
      vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue(null)

      localStorage.setItem("style-atelier-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-suspended-by-age", "true")

      const { container } = render(
        <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
      )

      await waitFor(() => {
        expect(
          container.querySelector("#auto-sync-suspended-banner")
        ).not.toBeNull()
      })

      expect(
        screen.getByText(/最後の同期から60日以上経過したため/i)
      ).toBeDefined()
    })

    it("triggers sync when the warning banner sync button is clicked", async () => {
      vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token-123")
      vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue(null)

      localStorage.setItem("style-atelier-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-enabled", "true")
      localStorage.setItem("style-atelier-auto-sync-suspended-by-age", "true")
      localStorage.setItem(
        "style-atelier-last-backup",
        (Date.now() - 61 * 24 * 60 * 60 * 1000).toString()
      )

      const { container } = render(
        <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
      )

      await waitFor(() => {
        expect(
          container.querySelector("#suspended-banner-sync-btn")
        ).not.toBeNull()
      })

      const bannerSyncBtn = container.querySelector(
        "#suspended-banner-sync-btn"
      )!
      fireEvent.click(bannerSyncBtn)

      await waitFor(() => {
        expect(screen.getByText(/マージ戦略を選択してください/i)).toBeDefined()
      })
    })
  })

  describe("Tips Bar Settings", () => {
    it("renders Tips Bar toggle switch correctly", () => {
      const { container } = render(
        <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
      )
      expect(screen.getAllByText("Tipsバーを表示する").length).toBeGreaterThan(
        0
      )
      expect(container.querySelector("#tips-bar-toggle-btn")).not.toBeNull()
    })

    it("toggles showTipsBar state on click", async () => {
      const { container } = render(
        <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
      )
      const toggleBtn = container.querySelector("#tips-bar-toggle-btn")!

      // Default should be true (saved in local storage after interaction)
      fireEvent.click(toggleBtn)
      expect(localStorage.getItem("style-atelier-show-tips-bar")).toBe("false")

      fireEvent.click(toggleBtn)
      expect(localStorage.getItem("style-atelier-show-tips-bar")).toBe("true")
    })
  })

  describe("Accordion Settings", () => {
    it("collapses and expands sections on accordion header clicks", async () => {
      const { container } = render(
        <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
      )

      // In test env, cloud section is open by default. Verify we can find its toggle button.
      expect(container.querySelector("#google-drive-toggle-btn")).not.toBeNull()

      // Click to collapse
      const cloudHeader = container.querySelector("#settings-accordion-cloud")!
      fireEvent.click(cloudHeader)

      // Verify it's collapsed (element is removed from DOM)
      expect(container.querySelector("#google-drive-toggle-btn")).toBeNull()

      // Click to expand again
      fireEvent.click(cloudHeader)

      // Verify it's expanded again
      expect(container.querySelector("#google-drive-toggle-btn")).not.toBeNull()
    })
  })

  describe("Interactive Tutorial Replay Settings", () => {
    it("renders Tutorial Replay section correctly", () => {
      const { container } = render(
        <SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />
      )
      expect(
        screen.getAllByText("インタラクティブチュートリアル").length
      ).toBeGreaterThan(0)
      expect(
        container.querySelector("#settings-replay-tutorial-btn")
      ).not.toBeNull()
    })

    it("triggers onReplayTutorial callback on button click", async () => {
      const mockReplayTutorial = vi.fn()
      const { container } = render(
        <SettingsTab
          addLog={mockAddLog}
          onResetDb={mockResetDb}
          onReplayTutorial={mockReplayTutorial}
        />
      )

      const replayBtn = container.querySelector(
        "#settings-replay-tutorial-btn"
      )!
      fireEvent.click(replayBtn)
      expect(mockReplayTutorial).toHaveBeenCalled()
    })
  })
})
