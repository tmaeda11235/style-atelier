import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsTab } from "./SettingsTab";
import * as googleDrive from "../../lib/google-drive";

vi.mock("../../lib/google-drive", () => ({
  authorize: vi.fn(),
  clearCachedToken: vi.fn(),
  uploadBackup: vi.fn(),
  downloadBackup: vi.fn(),
  exportDatabase: vi.fn(),
  importDatabase: vi.fn(),
  getBackupMetadata: vi.fn(),
}));

describe("SettingsTab", () => {
  const mockAddLog = vi.fn();
  const mockOnResetDb = vi.fn();
  const originalConfirm = window.confirm;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.confirm = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  it("renders with default state (sync disabled)", () => {
    render(<SettingsTab addLog={mockAddLog} onResetDb={mockOnResetDb} />);

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

    render(<SettingsTab addLog={mockAddLog} onResetDb={mockOnResetDb} />);

    const toggleBtn = screen.getByRole("button", { name: "" }); // Switch button has no name text inside but is a button
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(googleDrive.authorize).toHaveBeenCalledWith(true);
      expect(googleDrive.getBackupMetadata).toHaveBeenCalledWith("mock-token-123");
    });

    // Verify metadata preview is displayed
    await waitFor(() => {
      expect(screen.getByText("Cloud Backup Preview")).toBeDefined();
      expect(screen.getByText(/更新日時: 2026\/6\/3/)).toBeDefined();
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

    render(<SettingsTab addLog={mockAddLog} onResetDb={mockOnResetDb} />);

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
      expect(googleDrive.downloadBackup).toHaveBeenCalledWith("mock-token-123");
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

    render(<SettingsTab addLog={mockAddLog} onResetDb={mockOnResetDb} />);

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
});
