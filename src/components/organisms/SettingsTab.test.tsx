import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { SettingsTab } from "./SettingsTab";
import * as googleDrive from "../../lib/google-drive";
import { exportDatabase, importDatabase } from "../../lib/google-drive";

vi.mock("../../lib/google-drive", () => ({
  authorize: vi.fn(),
  clearCachedToken: vi.fn(),
  uploadBackup: vi.fn(),
  downloadBackup: vi.fn(),
  exportDatabase: vi.fn().mockResolvedValue('{"version": 1, "data": {"styleCards": [], "categories": [], "userSettings": [], "historyItems": []}}'),
  importDatabase: vi.fn().mockResolvedValue(undefined),
  getBackupMetadata: vi.fn(),
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

    const backupContent = '{"version": 1, "data": {"styleCards": [{"id": "c1", "name": "Card C1"}]}}';
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

    expect(importDatabase).not.toHaveBeenCalled();
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
      expect(googleDrive.getBackupMetadata).toHaveBeenCalledWith("mock-token-123");
    });

    // Verify metadata preview is displayed
    await waitFor(() => {
      expect(screen.getByText("Cloud Backup Preview")).toBeDefined();
      const expectedDate = new Date("2026-06-03T12:00:00.000Z").toLocaleString();
      expect(screen.getByText(`更新日時: ${expectedDate}`, { exact: false })).toBeDefined();
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
});
