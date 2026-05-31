import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  exportDatabase, 
  importDatabase, 
  authorize, 
  fetchUserInfo, 
  searchBackupFile, 
  uploadBackup, 
  downloadBackup,
  getClientId,
  DEFAULT_CLIENT_ID
} from "./google-drive";
import { db } from "./db";

// Mock Dexie db
vi.mock("./db", () => {
  const mockTable = () => ({
    toArray: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined),
    bulkAdd: vi.fn().mockResolvedValue(undefined)
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
const mockLaunchWebAuthFlow = vi.fn();
const mockGetRedirectURL = vi.fn().mockReturnValue("https://mock-extension-id.chromiumapp.org/");

global.chrome = {
  identity: {
    launchWebAuthFlow: mockLaunchWebAuthFlow,
    getRedirectURL: mockGetRedirectURL,
  },
  runtime: {
    lastError: undefined
  }
} as any;

describe("Google Drive Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
  });

  describe("getClientId", () => {
    it("should return default client ID when no custom ID is saved", () => {
      expect(getClientId()).toBe(DEFAULT_CLIENT_ID);
    });

    it("should return custom client ID when saved in localStorage", () => {
      localStorage.setItem("style-atelier-custom-client-id", "my-custom-id");
      expect(getClientId()).toBe("my-custom-id");
    });
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
  });

  describe("importDatabase", () => {
    it("should clear and import payload data into tables", async () => {
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
      expect(db.styleCards.clear).toHaveBeenCalled();
      expect(db.styleCards.bulkAdd).toHaveBeenCalledWith(mockPayload.data.styleCards);
      expect(db.categories.clear).toHaveBeenCalled();
      expect(db.categories.bulkAdd).toHaveBeenCalledWith(mockPayload.data.categories);
      expect(db.userSettings.clear).toHaveBeenCalled();
      expect(db.userSettings.bulkAdd).toHaveBeenCalledWith(mockPayload.data.userSettings);
      expect(db.historyItems.clear).toHaveBeenCalled();
      expect(db.historyItems.bulkAdd).toHaveBeenCalledWith(mockPayload.data.historyItems);
    });

    it("should throw error if payload structure is invalid", async () => {
      const invalidPayload = { foo: "bar" };
      await expect(importDatabase(JSON.stringify(invalidPayload))).rejects.toThrow();
    });
  });

  describe("authorize", () => {
    it("should resolve access token on successful auth flow redirect", async () => {
      mockLaunchWebAuthFlow.mockImplementation((opts, callback) => {
        callback("https://mock-extension-id.chromiumapp.org/#access_token=mock-token-abc&token_type=Bearer");
      });

      const token = await authorize();
      expect(token).toBe("mock-token-abc");
      expect(mockLaunchWebAuthFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          interactive: true,
          url: expect.stringContaining("client_id=" + DEFAULT_CLIENT_ID)
        }),
        expect.any(Function)
      );
    });

    it("should reject with error when chrome runtime reports error", async () => {
      const originalLastError = chrome.runtime.lastError;
      (chrome.runtime as any).lastError = { message: "User cancelled authentication" };
      mockLaunchWebAuthFlow.mockImplementation((opts, callback) => {
        callback(undefined);
      });

      await expect(authorize()).rejects.toThrow("User cancelled authentication");
      
      // cleanup
      (chrome.runtime as any).lastError = originalLastError;
    });
  });

  describe("fetchUserInfo", () => {
    it("should return email from google userinfo API", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ email: "user@example.com" })
      });

      const result = await fetchUserInfo("token-123");
      expect(result.email).toBe("user@example.com");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        expect.objectContaining({
          headers: { Authorization: "Bearer token-123" }
        })
      );
    });

    it("should throw error if userinfo API returns non-ok status", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized"
      });

      await expect(fetchUserInfo("bad-token")).rejects.toThrow("Failed to fetch user info: 401 Unauthorized");
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
});
