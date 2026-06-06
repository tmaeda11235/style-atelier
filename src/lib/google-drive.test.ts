import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  exportDatabase, 
  importDatabase, 
  authorize, 
  clearCachedToken,
  searchBackupFile, 
  getBackupMetadata,
  uploadBackup, 
  downloadBackup,
  GDriveTimeoutError
} from "./google-drive";
import { db } from "./db";

// Mock Dexie db
vi.mock("./db", () => {
  const mockTable = () => ({
    toArray: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined),
    bulkAdd: vi.fn().mockResolvedValue(undefined),
    bulkPut: vi.fn().mockResolvedValue(undefined)
  });
  return {
    db: {
      styleCards: mockTable(),
      categories: mockTable(),
      userSettings: mockTable(),
      historyItems: mockTable(),
      transaction: vi.fn((mode, tables, cb) => cb())
    }
  };
});

// Mock Chrome APIs
const mockGetAuthToken = vi.fn();
const mockRemoveCachedAuthToken = vi.fn();

global.chrome = {
  identity: {
    getAuthToken: mockGetAuthToken,
    removeCachedAuthToken: mockRemoveCachedAuthToken,
  },
  runtime: {
    lastError: undefined
  }
} as any;

describe("Google Drive Utilities (getAuthToken Flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
  });

  describe("exportDatabase", () => {
    it("should serialize database tables and exclude localImageBlob from historyItems", async () => {
      const mockCards = [{ id: "card1", name: "Card 1" }];
      const mockCategories = [{ id: "cat1", name: "Category 1" }];
      const mockSettings = [{ userId: "user1", isPro: true }];
      const mockHistory = [
        { id: "hist1", fullCommand: "prompt 1", imageUrl: "url1", localImageBlob: new Blob() },
        { id: "hist2", fullCommand: "prompt 2", imageUrl: "url2" }
      ];

      vi.mocked(db.styleCards.toArray).mockResolvedValue(mockCards);
      vi.mocked(db.categories.toArray).mockResolvedValue(mockCategories);
      vi.mocked(db.userSettings.toArray).mockResolvedValue(mockSettings);
      vi.mocked(db.historyItems.toArray).mockResolvedValue(mockHistory);

      const json = await exportDatabase();
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe(1);
      expect(parsed.exportedAt).toBeLessThanOrEqual(Date.now());
      expect(parsed.data.styleCards).toEqual(mockCards);
      expect(parsed.data.categories).toEqual(mockCategories);
      expect(parsed.data.userSettings).toEqual(mockSettings);
      
      // localImageBlob should be excluded
      expect(parsed.data.historyItems).toHaveLength(2);
      expect(parsed.data.historyItems[0]).not.toHaveProperty("localImageBlob");
      expect(parsed.data.historyItems[0].id).toBe("hist1");
      expect(parsed.data.historyItems[1].id).toBe("hist2");
    });

    it("should include slotHistory from localStorage in the exported payload", async () => {
      const mockSlotHistory = {
        subject: ["cat", "dog"],
        style: ["anime"]
      };
      localStorage.setItem("style_atelier_slot_history", JSON.stringify(mockSlotHistory));

      const json = await exportDatabase();
      const parsed = JSON.parse(json);

      expect(parsed.data.slotHistory).toEqual(mockSlotHistory);
    });
  });

  describe("importDatabase", () => {
    it("should merge payload data into tables using bulkPut without clearing", async () => {
      const mockPayload = {
        version: 1,
        exportedAt: 123456,
        data: {
          styleCards: [{ id: "c1", name: "Card C1" }],
          categories: [{ id: "cat1", name: "Category 1" }],
          userSettings: [{ userId: "u1", isPro: false }],
          historyItems: [{ id: "h1", fullCommand: "cmd 1" }]
        }
      };

      await importDatabase(JSON.stringify(mockPayload));

      expect(db.transaction).toHaveBeenCalled();
      expect(db.styleCards.clear).not.toHaveBeenCalled();
      expect(db.styleCards.bulkPut).toHaveBeenCalledWith(mockPayload.data.styleCards);
      expect(db.categories.clear).not.toHaveBeenCalled();
      expect(db.categories.bulkPut).toHaveBeenCalledWith(mockPayload.data.categories);
      expect(db.userSettings.clear).not.toHaveBeenCalled();
      expect(db.userSettings.bulkPut).toHaveBeenCalledWith(mockPayload.data.userSettings);
      expect(db.historyItems.clear).not.toHaveBeenCalled();
      expect(db.historyItems.bulkPut).toHaveBeenCalledWith(mockPayload.data.historyItems);
    });

    it("should restore and merge slotHistory into localStorage, keeping incoming values first, removing duplicates, and limiting to 10 items", async () => {
      const existingHistory = {
        subject: ["existing1", "existing2", "common"],
        style: ["minimalist"]
      };
      localStorage.setItem("style_atelier_slot_history", JSON.stringify(existingHistory));

      const incomingHistory = {
        subject: ["common", "incoming1", "incoming2"],
        style: ["gothic"],
        artist: ["picasso"]
      };

      const mockPayload = {
        version: 1,
        exportedAt: 123456,
        data: {
          styleCards: [],
          categories: [],
          userSettings: [],
          historyItems: [],
          slotHistory: incomingHistory
        }
      };

      await importDatabase(JSON.stringify(mockPayload));

      const restored = JSON.parse(localStorage.getItem("style_atelier_slot_history") || "{}");

      expect(restored.subject).toEqual(["common", "incoming1", "incoming2", "existing1", "existing2"]);
      expect(restored.style).toEqual(["gothic", "minimalist"]);
      expect(restored.artist).toEqual(["picasso"]);
    });

    it("should cap merged slotHistory items at 10 per variable", async () => {
      const existingHistory = {
        subject: ["1", "2", "3", "4", "5", "6", "7", "8"]
      };
      localStorage.setItem("style_atelier_slot_history", JSON.stringify(existingHistory));

      const incomingHistory = {
        subject: ["9", "10", "11", "12", "13"]
      };

      const mockPayload = {
        version: 1,
        exportedAt: 123456,
        data: {
          styleCards: [],
          categories: [],
          userSettings: [],
          historyItems: [],
          slotHistory: incomingHistory
        }
      };

      await importDatabase(JSON.stringify(mockPayload));

      const restored = JSON.parse(localStorage.getItem("style_atelier_slot_history") || "{}");

      expect(restored.subject).toEqual(["9", "10", "11", "12", "13", "1", "2", "3", "4", "5"]);
      expect(restored.subject).toHaveLength(10);
    });

    it("should throw error if payload structure is invalid", async () => {
      const invalidPayload = { foo: "bar" };
      await expect(importDatabase(JSON.stringify(invalidPayload))).rejects.toThrow();
    });
  });

  describe("authorize", () => {
    it("should resolve access token on successful getAuthToken call", async () => {
      mockGetAuthToken.mockImplementation((opts, callback) => {
        callback("mock-token-123");
      });

      const token = await authorize(true);
      expect(token).toBe("mock-token-123");
      expect(mockGetAuthToken).toHaveBeenCalledWith(
        expect.objectContaining({ interactive: true }),
        expect.any(Function)
      );
    });

    it("should reject with error when chrome runtime reports error", async () => {
      const originalLastError = chrome.runtime.lastError;
      (chrome.runtime as any).lastError = { message: "User cancelled authentication" };
      mockGetAuthToken.mockImplementation((opts, callback) => {
        callback(undefined);
      });

      await expect(authorize()).rejects.toThrow("User cancelled authentication");
      
      // cleanup
      (chrome.runtime as any).lastError = originalLastError;
    });
  });

  describe("clearCachedToken", () => {
    it("should call removeCachedAuthToken with correct token", async () => {
      mockRemoveCachedAuthToken.mockImplementation((opts, callback) => {
        callback();
      });

      await clearCachedToken("stale-token");
      expect(mockRemoveCachedAuthToken).toHaveBeenCalledWith(
        { token: "stale-token" },
        expect.any(Function)
      );
    });
  });

  describe("searchBackupFile", () => {
    it("should return file ID if backup file exists", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "drive-file-id-789", name: "style-atelier-backup.json" }]
        })
      });

      const id = await searchBackupFile("token-123");
      expect(id).toBe("drive-file-id-789");
    });

    it("should return null if backup file does not exist", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      });

      const id = await searchBackupFile("token-123");
      expect(id).toBeNull();
    });
  });

  describe("getBackupMetadata", () => {
    it("should return backup metadata if backup file exists", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "drive-file-id-789", name: "style-atelier-backup.json", modifiedTime: "2026-06-03T12:00:00.000Z", size: "102400" }]
        })
      });

      const meta = await getBackupMetadata("token-123");
      expect(meta).toEqual({
        id: "drive-file-id-789",
        modifiedTime: "2026-06-03T12:00:00.000Z",
        size: "102400"
      });
    });

    it("should return null if backup file does not exist", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      });

      const meta = await getBackupMetadata("token-123");
      expect(meta).toBeNull();
    });
  });

  describe("uploadBackup", () => {
    it("should perform PATCH (Update) if backup file already exists", async () => {
      // 1st fetch (search) returns file ID
      // 2nd fetch (PATCH upload) returns success
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            files: [{ id: "existing-file-id", name: "style-atelier-backup.json" }]
          })
        })
        .mockResolvedValueOnce({
          ok: true
        });

      await uploadBackup("token-123", '{"data": "test"}');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenLastCalledWith(
        "https://www.googleapis.com/upload/drive/v3/files/existing-file-id?uploadType=media",
        expect.objectContaining({
          method: "PATCH",
          headers: {
            Authorization: "Bearer token-123",
            "Content-Type": "application/json"
          },
          body: '{"data": "test"}'
        })
      );
    });

    it("should perform POST Multipart (Create) if backup file does not exist", async () => {
      // 1st fetch (search) returns empty files list
      // 2nd fetch (POST upload) returns success
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ files: [] })
        })
        .mockResolvedValueOnce({
          ok: true
        });

      await uploadBackup("token-123", '{"data": "new"}');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenLastCalledWith(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer token-123",
            "Content-Type": expect.stringContaining("multipart/related; boundary=")
          },
          body: expect.stringContaining("style-atelier-backup.json")
        })
      );
    });
  });

  describe("downloadBackup", () => {
    it("should return file contents if file exists", async () => {
      // 1st fetch (search) returns ID
      // 2nd fetch (GET contents) returns backup content
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            files: [{ id: "file-id-456", name: "style-atelier-backup.json" }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue('{"version": 1, "data": {}}')
        });

      const content = await downloadBackup("token-123");
      expect(content).toBe('{"version": 1, "data": {}}');
    });

    it("should return null if file does not exist", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      });

      const content = await downloadBackup("token-123");
      expect(content).toBeNull();
    });
  });

  describe("Timeout and Cancellation", () => {
    it("should throw GDriveTimeoutError when the request times out", async () => {
      global.fetch = vi.fn().mockImplementation((url, init) => new Promise((resolve, reject) => {
        const signal = init?.signal;
        const timer = setTimeout(() => {
          resolve({ ok: true, json: vi.fn().mockResolvedValue({ files: [] }) } as any);
        }, 100);

        if (signal) {
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("The user aborted a request.", "AbortError"));
          });
        }
      }));

      const promise = searchBackupFile("token-123", { timeoutMs: 10 });
      await expect(promise).rejects.toThrow(GDriveTimeoutError);
    });

    it("should throw AbortError when the request is aborted externally", async () => {
      global.fetch = vi.fn().mockImplementation((url, init) => new Promise((resolve, reject) => {
        const signal = init?.signal;
        const timer = setTimeout(() => {
          resolve({ ok: true, json: vi.fn().mockResolvedValue({ files: [] }) } as any);
        }, 100);

        if (signal) {
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("The user aborted a request.", "AbortError"));
          });
          if (signal.aborted) {
            clearTimeout(timer);
            reject(new DOMException("The user aborted a request.", "AbortError"));
          }
        }
      }));

      const controller = new AbortController();
      const promise = searchBackupFile("token-123", { signal: controller.signal });

      setTimeout(() => controller.abort(), 10);

      await expect(promise).rejects.toThrow();
    });
  });
});
