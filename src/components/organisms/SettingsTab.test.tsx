import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";
import { SettingsTab } from "./SettingsTab";
import * as googleDrive from "../../lib/google-drive";
import { exportDatabase, importDatabase } from "../../lib/google-drive";
import { db } from "../../lib/db";

vi.mock("../../lib/google-drive", () => ({
  authorize: vi.fn(),
  clearCachedToken: vi.fn(),
  uploadBackup: vi.fn(),
  downloadBackup: vi.fn(),
  exportDatabase: vi.fn().mockResolvedValue('{"version": 1, "data": {"styleCards": [], "categories": [], "userSettings": [], "historyItems": []}}'),
  importDatabase: vi.fn().mockImplementation(async (jsonData: string) => {
    const { validateBackupPayload } = await import("../../lib/backup-validator");
    let payload: any;
    try {
      payload = JSON.parse(jsonData);
    } catch (e) {
      throw new Error("Invalid JSON format. Failed to parse backup file.");
    }
    const validation = validateBackupPayload(payload);
    if (!validation.isValid) {
      throw new Error(`Database validation failed: ${validation.error}`);
    }
  }),
  getBackupMetadata: vi.fn(),
}));

vi.mock("../../lib/db", () => ({
  db: {
    historyItems: {
      clear: vi.fn().mockResolvedValue(undefined),
    },
    styleCards: {
      clear: vi.fn().mockResolvedValue(undefined),
    },
    userSettings: {
      clear: vi.fn().mockResolvedValue(undefined),
    },
    categories: {
      clear: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

describe("SettingsTab", () => {
  const mockAddLog = vi.fn();
  const mockResetDb = vi.fn();
  const originalConfirm = window.confirm;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock URL object URL APIs
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock-uuid");
    global.URL.revokeObjectURL = vi.fn();

    // Mock window.confirm
    window.confirm = vi.fn().mockReturnValue(true);

    // Mock console.error to keep logs clean
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock navigator.storage.estimate
    Object.defineProperty(window.navigator, "storage", {
      value: {
        estimate: vi.fn().mockResolvedValue({
          usage: 1024 * 1024 * 5, // 5 MB
          quota: 1024 * 1024 * 100 // 100 MB
        })
      },
      configurable: true,
      writable: true
    });
  });

  afterEach(() => {
    window.confirm = originalConfirm;
    vi.restoreAllMocks();
  });

  // --- Local File Backup Tests (from HEAD) ---

  it("renders Local File Backup card correctly", () => {
    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    expect(screen.getByText("Local File Backup (Offline)")).toBeDefined();
    expect(screen.getByText("Export JSON")).toBeDefined();
    expect(screen.getByText("Import JSON")).toBeDefined();
    expect(screen.getByText(/Export your style cards and binders to a local JSON file/)).toBeDefined();
  });

  it("triggers file download when Export JSON is clicked", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const appendChildSpy = vi.spyOn(document.body, "appendChild");
    const removeChildSpy = vi.spyOn(document.body, "removeChild");

    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    const exportBtn = screen.getByText("Export JSON");
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(exportDatabase).toHaveBeenCalled();
    });

    expect(clickSpy).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    // Find the anchor element call
    const anchorCall = appendChildSpy.mock.calls.find(
      (call) => call[0] instanceof HTMLElement && call[0].tagName === "A"
    );
    expect(anchorCall).toBeDefined();
    
    const addedAnchor = anchorCall![0] as HTMLAnchorElement;
    expect(addedAnchor.download).toContain("style-atelier-backup-");
    expect(addedAnchor.download).toContain(".json");
    expect(addedAnchor.href).toBe("blob:http://localhost/mock-uuid");

    // Verify it was also removed
    const isRemoved = removeChildSpy.mock.calls.some((call) => call[0] === addedAnchor);
    expect(isRemoved).toBe(true);

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/mock-uuid");
    expect(mockAddLog).toHaveBeenCalledWith("Database exported to local JSON file successfully.");
  });

  it("handles successful local import from JSON file", async () => {
    const { container } = render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();

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
    };
    const backupContent = JSON.stringify({
      version: 1,
      exportedAt: 123456789,
      data: {
        styleCards: [mockStyleCard]
      }
    });
    const file = new File([backupContent], "backup.json", { type: "application/json" });

    // Trigger file change event
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(importDatabase).toHaveBeenCalledWith(backupContent);
      expect(mockAddLog).toHaveBeenCalledWith("Database restored from local JSON file successfully.");
    });
  });

  it("fails to import when file contains invalid backup structure", async () => {
    const { container } = render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidContent = '{"foo": "bar"}';
    const file = new File([invalidContent], "backup.json", { type: "application/json" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining("Import failed:"));
    });

    expect(importDatabase).toHaveBeenCalledWith(invalidContent);
  });

  it("cancels import if user rejects confirmation", async () => {
    // Override window.confirm to return false
    window.confirm = vi.fn().mockReturnValue(false);

    const { container } = render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const backupContent = '{"version": 1, "data": {"styleCards": []}}';
    const file = new File([backupContent], "backup.json", { type: "application/json" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
    });

    expect(fileInput.value).toBe("");
    expect(importDatabase).not.toHaveBeenCalled();
    expect(mockAddLog).not.toHaveBeenCalled();
  });

  // --- Google Drive Cloud Sync Tests (from main) ---

  it("renders with default state (sync disabled)", () => {
    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    expect(screen.getByText("Google Drive Cloud Sync")).toBeDefined();
    
    // Backup and Restore buttons should be disabled
    const backupBtn = screen.getByRole("button", { name: /Backup Data/i });
    const restoreBtn = screen.getByRole("button", { name: /Restore Data/i });
    expect(backupBtn).toBeDisabled();
    expect(restoreBtn).toBeDisabled();
  });

  it("enabling sync performs authorization and fetches backup metadata", async () => {
    vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token-123");
    vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue({
      id: "file-123",
      modifiedTime: "2026-06-03T12:00:00.000Z",
      size: "153600", // 150 KB
    });

    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    const toggleBtn = screen.getByRole("button", { name: "" }); // Switch button has no name text inside but is a button
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(googleDrive.authorize).toHaveBeenCalledWith(true);
      expect(googleDrive.getBackupMetadata).toHaveBeenCalledWith("mock-token-123", expect.any(Function));
    });

    // Verify metadata preview is displayed
    await waitFor(() => {
      expect(screen.getByText("Cloud Backup Preview")).toBeDefined();
      expect(screen.getByText(/更新日時: (2026\/6\/3|6\/3\/2026)/)).toBeDefined();
      expect(screen.getByText(/サイズ: 150\.0 KB/)).toBeDefined();
    });
  });

  it("always shows confirmation dialog on Restore, even if checked multiple times", async () => {
    vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token-123");
    vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue({
      id: "file-123",
      modifiedTime: "2026-06-03T12:00:00.000Z",
      size: "153600",
    });
    vi.mocked(googleDrive.downloadBackup).mockResolvedValue("mock-backup-data");
    vi.mocked(googleDrive.importDatabase).mockResolvedValue(undefined);

    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    // Enable sync
    const toggleBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(toggleBtn);

    // Wait for sync to be enabled
    await waitFor(() => {
      expect(screen.getByText("Cloud Backup Preview")).toBeDefined();
    });

    const restoreBtn = screen.getByRole("button", { name: /Restore Data/i });
    expect(restoreBtn).not.toBeDisabled();

    // First restore attempt
    fireEvent.click(restoreBtn);
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(vi.mocked(window.confirm).mock.calls[0][0]).toContain("クラウド上のバックアップ情報");
    expect(vi.mocked(window.confirm).mock.calls[0][0]).toContain("150.0 KB");

    await waitFor(() => {
      expect(googleDrive.downloadBackup).toHaveBeenCalledWith("mock-token-123", expect.any(Function), expect.any(Function));
      expect(googleDrive.importDatabase).toHaveBeenCalledWith("mock-backup-data");
    });

    // Reset confirm mock calls
    vi.mocked(window.confirm).mockClear();

    // Second restore attempt - should still prompt confirmation (Skipping should be disabled, issue #146)
    fireEvent.click(restoreBtn);
    expect(window.confirm).toHaveBeenCalledTimes(1);
  });

  it("aborts restore if user cancels confirmation dialog", async () => {
    window.confirm = vi.fn().mockReturnValue(false); // User clicks Cancel
    vi.mocked(googleDrive.authorize).mockResolvedValue("mock-token-123");
    vi.mocked(googleDrive.getBackupMetadata).mockResolvedValue(null);

    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    // Enable sync
    const toggleBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      const restoreBtn = screen.getByRole("button", { name: /Restore Data/i });
      expect(restoreBtn).not.toBeDisabled();
    });

    const restoreBtn = screen.getByRole("button", { name: /Restore Data/i });
    fireEvent.click(restoreBtn);

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(googleDrive.downloadBackup).not.toHaveBeenCalled();
    expect(googleDrive.importDatabase).not.toHaveBeenCalled();
  });

  // --- Storage Management Tests ---

  it("renders Storage Management card correctly with normal usage", async () => {
    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    expect(screen.getByText("Storage Management")).toBeDefined();
    
    // Wait for the estimate to resolve
    await waitFor(() => {
      expect(screen.getByText(/使用量: 5.0 MB \/ 100.0 MB/)).toBeDefined();
      expect(screen.getByText("5%")).toBeDefined();
    });

    // Check that warning alerts do not render
    expect(screen.queryByText(/注意: 空き容量が少なくなっています/)).toBeNull();
    expect(screen.queryByText(/警告: 容量制限に近いです/)).toBeNull();
  });

  it("displays warning message when storage usage is between 80% and 90%", async () => {
    vi.mocked(window.navigator.storage.estimate).mockResolvedValue({
      usage: 1024 * 1024 * 85, // 85 MB
      quota: 1024 * 1024 * 100 // 100 MB
    });

    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    await waitFor(() => {
      expect(screen.getByText(/使用量: 85.0 MB \/ 100.0 MB/)).toBeDefined();
      expect(screen.getByText("85%")).toBeDefined();
      expect(screen.getByText(/注意: 空き容量が少なくなっています/)).toBeDefined();
    });
    
    expect(screen.queryByText(/警告: 容量制限に近いです/)).toBeNull();
  });

  it("displays danger warning message when storage usage is 90% or above", async () => {
    vi.mocked(window.navigator.storage.estimate).mockResolvedValue({
      usage: 1024 * 1024 * 95, // 95 MB
      quota: 1024 * 1024 * 100 // 100 MB
    });

    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    await waitFor(() => {
      expect(screen.getByText(/使用量: 95.0 MB \/ 100.0 MB/)).toBeDefined();
      expect(screen.getByText("95%")).toBeDefined();
      expect(screen.getByText(/警告: 容量制限に近いです/)).toBeDefined();
    });

    expect(screen.queryByText(/注意: 空き容量が少なくなっています/)).toBeNull();
  });

  it("handles prompt history clearing successfully", async () => {
    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    await waitFor(() => {
      expect(screen.getByText("Storage Management")).toBeDefined();
    });

    const clearBtn = screen.getByRole("button", { name: /Clear History/i });
    fireEvent.click(clearBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(db.historyItems.clear).toHaveBeenCalled();
      expect(mockAddLog).toHaveBeenCalledWith("Prompt history cleared successfully.");
    });
  });

  it("displays progress percentage and progress bar during backup", async () => {
    let progressCallback: any = null;
    vi.mocked(googleDrive.uploadBackup).mockImplementation(
      async (token, jsonData, onTokenUpdated, onProgress) => {
        if (onProgress) progressCallback = onProgress;
        return new Promise(() => {});
      }
    );

    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    // Enable sync
    const toggleBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(toggleBtn);

    // Wait for sync to be enabled
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Backup Data/i })).not.toBeDisabled();
    });

    const backupBtn = screen.getByRole("button", { name: /Backup Data/i });
    fireEvent.click(backupBtn);

    await waitFor(() => {
      expect(googleDrive.uploadBackup).toHaveBeenCalled();
    });

    expect(progressCallback).not.toBeNull();

    // Trigger 45% progress
    act(() => {
      progressCallback(45);
    });

    // Check button text changes
    expect(screen.getByText("Backing up... 45%")).toBeDefined();
    // Check status message displays progress
    expect(screen.getByText("Creating backup and uploading (45%)...")).toBeDefined();
  });

  it("displays progress percentage and progress bar during restore", async () => {
    let progressCallback: any = null;
    vi.mocked(googleDrive.downloadBackup).mockImplementation(
      async (token, onTokenUpdated, onProgress) => {
        if (onProgress) progressCallback = onProgress;
        return new Promise(() => {});
      }
    );

    render(<SettingsTab addLog={mockAddLog} onResetDb={mockResetDb} />);

    // Enable sync
    const toggleBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(toggleBtn);

    // Wait for sync to be enabled
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Restore Data/i })).not.toBeDisabled();
    });

    const restoreBtn = screen.getByRole("button", { name: /Restore Data/i });
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(googleDrive.downloadBackup).toHaveBeenCalled();
    });

    expect(progressCallback).not.toBeNull();

    // Trigger 60% progress
    act(() => {
      progressCallback(60);
    });

    // Check button text changes
    expect(screen.getByText("Restoring... 60%")).toBeDefined();
    // Check status message displays progress
    expect(screen.getByText("Downloading backup from Google Drive (60%)...")).toBeDefined();
  });
});
