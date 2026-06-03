import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { SettingsTab } from "./SettingsTab";
import { exportDatabase, importDatabase } from "../../lib/google-drive";

// Mock Google Drive / DB utils
vi.mock("../../lib/google-drive", () => ({
  authorize: vi.fn(),
  clearCachedToken: vi.fn(),
  uploadBackup: vi.fn(),
  downloadBackup: vi.fn(),
  exportDatabase: vi.fn().mockResolvedValue('{"version": 1, "data": {"styleCards": [], "categories": [], "userSettings": [], "historyItems": []}}'),
  importDatabase: vi.fn().mockResolvedValue(undefined),
}));

describe("SettingsTab - Local File Backup (Offline)", () => {
  const mockAddLog = vi.fn();
  const mockResetDb = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock URL object URL APIs
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock-uuid");
    global.URL.revokeObjectURL = vi.fn();

    // Mock window.confirm
    vi.spyOn(window, "confirm").mockImplementation(() => true);

    // Mock console.error to keep logs clean
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    vi.spyOn(window, "confirm").mockImplementation(() => false);

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
});
