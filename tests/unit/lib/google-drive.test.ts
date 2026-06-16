import {
  authorize,
  clearCachedToken,
  createFolder,
  defaultGoogleDriveClient,
  deleteFile,
  deleteImageFile,
  downloadBackup,
  downloadTempSharedCards,
  findFolder,
  GDriveTimeoutError,
  getBackupMetadata,
  searchBackupFile,
  searchTempSharedCardsFile,
  uploadBackup,
  uploadImageFile
} from "@/lib/google-drive"
import {
  fetchWithTimeout,
  handleResponseError,
  parseXhrErrorStatus
} from "@/lib/google-drive/http-client"
import {
  GDriveQuotaError,
  GDriveRateLimitError
} from "@/lib/google-drive/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock XMLHttpRequest
const mockXhrInstances: any[] = []
class MockXMLHttpRequest {
  open = vi.fn()
  setRequestHeader = vi.fn()
  send = vi.fn()
  abort = vi.fn()
  onload = null as any
  onerror = null as any
  onprogress = null as any
  status = 200
  statusText = "OK"
  responseText = ""
  upload = {
    onprogress: null as any
  }

  constructor() {
    mockXhrInstances.push(this)
  }
}
;(global as any).XMLHttpRequest = MockXMLHttpRequest

describe("Google Drive Utilities (getAuthToken Flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    global.fetch = vi.fn()
    mockXhrInstances.length = 0
  })

  describe("authorize", () => {
    it("should resolve access token on successful getAuthToken call", async () => {
      vi.mocked(chrome.identity.getAuthToken).mockImplementation(
        (opts, callback) => {
          callback("mock-token-123")
        }
      )

      const token = await authorize(true)
      expect(token).toBe("mock-token-123")
      expect(chrome.identity.getAuthToken).toHaveBeenCalledWith(
        expect.objectContaining({ interactive: true }),
        expect.any(Function)
      )
    })

    it("should reject with error when chrome runtime reports error", async () => {
      const originalLastError = chrome.runtime.lastError
      ;(chrome.runtime as any).lastError = {
        message: "User cancelled authentication"
      }
      vi.mocked(chrome.identity.getAuthToken).mockImplementation(
        (opts, callback) => {
          callback(undefined)
        }
      )

      await expect(authorize()).rejects.toThrow("User cancelled authentication")

      // cleanup
      ;(chrome.runtime as any).lastError = originalLastError
    })
  })

  describe("clearCachedToken", () => {
    it("should call removeCachedAuthToken with correct token", async () => {
      vi.mocked(chrome.identity.removeCachedAuthToken).mockImplementation(
        (opts, callback) => {
          callback()
        }
      )

      await clearCachedToken("stale-token")
      expect(chrome.identity.removeCachedAuthToken).toHaveBeenCalledWith(
        { token: "stale-token" },
        expect.any(Function)
      )
    })
  })

  describe("searchBackupFile", () => {
    it("should return file ID if backup file exists", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [
            { id: "drive-file-id-789", name: "style-atelier-backup.json" }
          ]
        })
      })

      const id = await searchBackupFile("token-123")
      expect(id).toBe("drive-file-id-789")
    })

    it("should return null if backup file does not exist", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      })

      const id = await searchBackupFile("token-123")
      expect(id).toBeNull()
    })
  })

  describe("getBackupMetadata", () => {
    it("should return backup metadata if backup file exists", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [
            {
              id: "drive-file-id-789",
              name: "style-atelier-backup.json",
              modifiedTime: "2026-06-03T12:00:00.000Z",
              size: "102400"
            }
          ]
        })
      })

      const meta = await getBackupMetadata("token-123")
      expect(meta).toEqual({
        id: "drive-file-id-789",
        modifiedTime: "2026-06-03T12:00:00.000Z",
        size: "102400"
      })
    })

    it("should return null if backup file does not exist", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      })

      const meta = await getBackupMetadata("token-123")
      expect(meta).toBeNull()
    })
  })

  describe("uploadBackup", () => {
    it("should perform PATCH (Update) if backup file already exists (under 2MB)", async () => {
      // 1st fetch (search) returns file ID
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "existing-file-id", name: "style-atelier-backup.json" }]
        })
      })

      const onProgress = vi.fn()
      const uploadPromise = uploadBackup(
        "token-123",
        '{"data": "test"}',
        onProgress
      )

      // Wait a tick for async searchBackupFile
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      expect(xhr.open).toHaveBeenCalledWith(
        "PATCH",
        "https://www.googleapis.com/upload/drive/v3/files/existing-file-id?uploadType=media",
        true
      )
      expect(xhr.setRequestHeader).toHaveBeenCalledWith(
        "Authorization",
        "Bearer token-123"
      )
      expect(xhr.setRequestHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/json"
      )

      // Trigger progress
      if (xhr.upload.onprogress) {
        xhr.upload.onprogress({
          lengthComputable: true,
          loaded: 50,
          total: 100
        } as any)
        expect(onProgress).toHaveBeenCalledWith(50)
      }

      // Complete request
      xhr.status = 200
      xhr.onload()

      await expect(uploadPromise).resolves.toBeUndefined()
    })

    it("should perform POST Multipart (Create) if backup file does not exist (under 2MB)", async () => {
      // 1st fetch (search) returns empty files list
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      })

      const onProgress = vi.fn()
      const uploadPromise = uploadBackup(
        "token-123",
        '{"data": "new"}',
        onProgress
      )

      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      expect(xhr.open).toHaveBeenCalledWith(
        "POST",
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        true
      )
      expect(xhr.setRequestHeader).toHaveBeenCalledWith(
        "Authorization",
        "Bearer token-123"
      )
      expect(xhr.setRequestHeader).toHaveBeenCalledWith(
        "Content-Type",
        expect.stringContaining("multipart/related; boundary=")
      )

      // Complete request
      xhr.status = 200
      xhr.onload()

      await expect(uploadPromise).resolves.toBeUndefined()
    })

    it("should perform Resumable Upload (PATCH) if backup file already exists and size >= 2MB", async () => {
      // 1st fetch (search) returns file ID
      // 2nd fetch (init Resumable) returns 200 with Location header
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            files: [
              { id: "existing-file-id", name: "style-atelier-backup.json" }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (name: string) =>
              name === "Location" ? "https://resumable-session-url" : null
          }
        })

      // Generate a string that exceeds 2MB threshold
      const largeData = "a".repeat(2 * 1024 * 1024 + 10)
      const onProgress = vi.fn()
      const uploadPromise = uploadBackup("token-123", largeData, onProgress)

      await new Promise((resolve) => setTimeout(resolve, 0)) // wait searchBackupFile
      await new Promise((resolve) => setTimeout(resolve, 0)) // wait init resumable fetch

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(global.fetch).toHaveBeenLastCalledWith(
        "https://www.googleapis.com/upload/drive/v3/files/existing-file-id?uploadType=resumable",
        expect.objectContaining({
          method: "PATCH",
          headers: {
            Authorization: "Bearer token-123",
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "application/json",
            "X-Upload-Content-Length": expect.any(String)
          }
        })
      )

      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      expect(xhr.open).toHaveBeenCalledWith(
        "PUT",
        "https://resumable-session-url",
        true
      )
      expect(xhr.setRequestHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/json"
      )

      // Trigger progress
      if (xhr.upload.onprogress) {
        xhr.upload.onprogress({
          lengthComputable: true,
          loaded: 75,
          total: 100
        } as any)
        expect(onProgress).toHaveBeenCalledWith(75)
      }

      // Complete request
      xhr.status = 200
      xhr.onload()

      await expect(uploadPromise).resolves.toBeUndefined()
    })
  })

  describe("downloadBackup", () => {
    it("should return file contents if file exists", async () => {
      // 1st fetch (search) returns ID
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "file-id-456", name: "style-atelier-backup.json" }]
        })
      })

      const onProgress = vi.fn()
      const downloadPromise = downloadBackup("token-123", onProgress)

      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      expect(xhr.open).toHaveBeenCalledWith(
        "GET",
        "https://www.googleapis.com/drive/v3/files/file-id-456?alt=media",
        true
      )
      expect(xhr.setRequestHeader).toHaveBeenCalledWith(
        "Authorization",
        "Bearer token-123"
      )

      // Trigger progress
      if (xhr.onprogress) {
        xhr.onprogress({
          lengthComputable: true,
          loaded: 40,
          total: 100
        } as any)
        expect(onProgress).toHaveBeenCalledWith(40)
      }

      // Complete request
      xhr.status = 200
      xhr.responseText = '{"version": 1, "data": {}}'
      xhr.onload()

      const content = await downloadPromise
      expect(content).toBe('{"version": 1, "data": {}}')
    })

    it("should return null if file does not exist", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      })

      const content = await downloadBackup("token-123")
      expect(content).toBeNull()
    })
  })

  describe("Timeout and Cancellation", () => {
    it("should throw GDriveTimeoutError when the request times out", async () => {
      global.fetch = vi.fn().mockImplementation(
        (url, init) =>
          new Promise((resolve, reject) => {
            const signal = init?.signal
            const timer = setTimeout(() => {
              resolve({
                ok: true,
                json: vi.fn().mockResolvedValue({ files: [] })
              } as any)
            }, 5000)

            if (signal) {
              signal.addEventListener("abort", () => {
                clearTimeout(timer)
                reject(
                  new DOMException("The user aborted a request.", "AbortError")
                )
              })
            }
          })
      )

      const promise = searchBackupFile("token-123", undefined, undefined, {
        timeoutMs: 10
      })
      await expect(promise).rejects.toThrow(GDriveTimeoutError)
    })

    it("should throw AbortError when the request is aborted externally", async () => {
      global.fetch = vi.fn().mockImplementation(
        (url, init) =>
          new Promise((resolve, reject) => {
            const signal = init?.signal
            const timer = setTimeout(() => {
              resolve({
                ok: true,
                json: vi.fn().mockResolvedValue({ files: [] })
              } as any)
            }, 100)

            if (signal) {
              signal.addEventListener("abort", () => {
                clearTimeout(timer)
                reject(
                  new DOMException("The user aborted a request.", "AbortError")
                )
              })
              if (signal.aborted) {
                clearTimeout(timer)
                reject(
                  new DOMException("The user aborted a request.", "AbortError")
                )
              }
            }
          })
      )

      const controller = new AbortController()
      const promise = searchBackupFile("token-123", undefined, undefined, {
        signal: controller.signal
      })

      setTimeout(() => controller.abort(), 10)

      await expect(promise).rejects.toThrow()
    })
  })

  describe("Automatic Re-authorization on 401", () => {
    it("should clear cached token, request new token silently, and retry searchBackupFile successfully on 401", async () => {
      // Mock fetch: 1st returns 401, 2nd returns success (file exists)
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 401,
          ok: false,
          statusText: "Unauthorized"
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            files: [
              { id: "drive-file-id-reauth", name: "style-atelier-backup.json" }
            ]
          })
        })

      // Mock authorize for silent flow
      vi.mocked(chrome.identity.getAuthToken).mockImplementation(
        (opts, callback) => {
          expect(opts.interactive).toBe(false)
          callback("fresh-token-456")
        }
      )

      vi.mocked(chrome.identity.removeCachedAuthToken).mockImplementation(
        (opts, callback) => {
          expect(opts.token).toBe("stale-token-123")
          callback()
        }
      )

      const onTokenUpdated = vi.fn()

      const id = await searchBackupFile("stale-token-123", onTokenUpdated)

      expect(id).toBe("drive-file-id-reauth")
      expect(chrome.identity.removeCachedAuthToken).toHaveBeenCalledWith(
        { token: "stale-token-123" },
        expect.any(Function)
      )
      expect(chrome.identity.getAuthToken).toHaveBeenCalledWith(
        { interactive: false },
        expect.any(Function)
      )
      expect(onTokenUpdated).toHaveBeenCalledWith("fresh-token-456")

      // Verify fetch calls
      expect(global.fetch).toHaveBeenCalledTimes(2)
      // First call has stale token
      expect(vi.mocked(global.fetch).mock.calls[0][1]?.headers).toMatchObject({
        Authorization: "Bearer stale-token-123"
      })
      // Second call has fresh token
      expect(vi.mocked(global.fetch).mock.calls[1][1]?.headers).toMatchObject({
        Authorization: "Bearer fresh-token-456"
      })
    })

    it("should throw an error if silent re-authorization fails", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        statusText: "Unauthorized"
      })

      // Mock authorize to fail
      const originalLastError = chrome.runtime.lastError
      ;(chrome.runtime as any).lastError = { message: "Silent reauth failed" }
      vi.mocked(chrome.identity.getAuthToken).mockImplementation(
        (opts, callback) => {
          callback(undefined)
        }
      )

      await expect(searchBackupFile("stale-token-123")).rejects.toThrow(
        "Google Drive authentication expired: Silent reauth failed"
      )

      // cleanup
      ;(chrome.runtime as any).lastError = originalLastError
    })
  })

  describe("defaultGoogleDriveClient", () => {
    it("should authorize, clear token, and upload correctly using defaultGoogleDriveClient", async () => {
      vi.mocked(chrome.identity.getAuthToken).mockImplementation(
        (opts, callback) => {
          callback("default-token")
        }
      )
      const token = await defaultGoogleDriveClient.authorize(true)
      expect(token).toBe("default-token")

      vi.mocked(chrome.identity.removeCachedAuthToken).mockImplementation(
        (opts, callback) => {
          callback()
        }
      )
      await defaultGoogleDriveClient.clearCachedToken("default-token")
      expect(chrome.identity.removeCachedAuthToken).toHaveBeenCalledWith(
        { token: "default-token" },
        expect.any(Function)
      )
    })

    it("should proxy getBackupMetadata and downloadBackup correctly", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [
            {
              id: "file-id-xyz",
              name: "style-atelier-backup.json",
              modifiedTime: "2026-06-08T12:00:00.000Z",
              size: "500"
            }
          ]
        })
      })

      const meta = await defaultGoogleDriveClient.getBackupMetadata("tok")
      expect(meta).toEqual({
        id: "file-id-xyz",
        modifiedTime: "2026-06-08T12:00:00.000Z",
        size: "500"
      })

      const promise = defaultGoogleDriveClient.downloadBackup("tok")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.status = 200
      xhr.responseText = "downloaded-data"
      xhr.onload()

      const text = await promise
      expect(text).toBe("downloaded-data")
    })
  })

  describe("getBackupMetadata", () => {
    it("should return null if file does not exist", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      })
      const meta = await getBackupMetadata("tok")
      expect(meta).toBeNull()
    })

    it("should throw error if getBackupMetadata request fails", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Error"
      })
      await expect(getBackupMetadata("tok")).rejects.toThrow(
        "Failed to get backup metadata: 500 Internal Error"
      )
    })
  })

  describe("downloadBackup", () => {
    it("should return null if no file found", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      })
      const res = await downloadBackup("tok")
      expect(res).toBeNull()
    })

    it("should handle download progress", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "file-id" }]
        })
      })

      const onProgress = vi.fn()
      const promise = downloadBackup("tok", undefined, onProgress)
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]

      xhr.onprogress({
        lengthComputable: true,
        loaded: 50,
        total: 100
      })
      expect(onProgress).toHaveBeenCalledWith(50)

      xhr.status = 200
      xhr.responseText = "data"
      xhr.onload()
      await promise
    })

    it("should throw timeout error when download times out", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "file-id" }]
        })
      })

      const promise = downloadBackup("tok")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.ontimeout()

      await expect(promise).rejects.toThrow(GDriveTimeoutError)
    })

    it("should throw error when download fails with network error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "file-id" }]
        })
      })

      const promise = downloadBackup("tok")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.onerror()

      await expect(promise).rejects.toThrow("Network error during download.")
    })

    it("should handle 401 re-authorization and retry download successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "file-id" }]
        })
      })

      vi.mocked(chrome.identity.getAuthToken).mockImplementation(
        (opts, callback) => {
          callback("fresh-download-token")
        }
      )

      vi.mocked(chrome.identity.removeCachedAuthToken).mockImplementation(
        (opts, callback) => {
          callback()
        }
      )

      const onTokenUpdated = vi.fn()
      const downloadPromise = downloadBackup("stale-token", onTokenUpdated)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      let xhr = mockXhrInstances[0]
      xhr.status = 401
      xhr.onload()

      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(2)
      xhr = mockXhrInstances[1]
      xhr.status = 200
      xhr.responseText = "freshly-downloaded-data"
      xhr.onload()

      const text = await downloadPromise
      expect(text).toBe("freshly-downloaded-data")
      expect(onTokenUpdated).toHaveBeenCalledWith("fresh-download-token")
    })

    it("should throw abort error when download is aborted by signal", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "file-id" }]
        })
      })

      const controller = new AbortController()
      const promise = downloadBackup("tok", undefined, undefined, undefined, {
        signal: controller.signal
      })
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      controller.abort()
      await expect(promise).rejects.toThrow("Download aborted by user")
    })

    it("should throw error when download status is not 2xx", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "file-id" }]
        })
      })

      const promise = downloadBackup("tok")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.status = 500
      xhr.onload()

      await expect(promise).rejects.toThrow(
        "Failed to download backup file: status 500"
      )
    })
  })

  describe("uploadBackup (Simple and Resumable)", () => {
    // 1. Simple upload PATCH (File exists)
    it("should handle simple upload PATCH successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "existing-id" }]
        })
      })

      const onProgress = vi.fn()
      const promise = uploadBackup("tok", "small-json", undefined, onProgress)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.upload.onprogress({
        lengthComputable: true,
        loaded: 50,
        total: 100
      })
      expect(onProgress).toHaveBeenCalledWith(50)

      xhr.status = 200
      xhr.onload()
      await promise
    })

    it("should throw timeout error when simple upload PATCH times out", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "existing-id" }]
        })
      })

      const promise = uploadBackup("tok", "small-json")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.ontimeout()

      await expect(promise).rejects.toThrow(GDriveTimeoutError)
    })

    it("should handle 401 re-authorization and retry simple upload PATCH successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "existing-id" }]
        })
      })

      vi.mocked(chrome.identity.getAuthToken).mockImplementation(
        (opts, callback) => {
          callback("fresh-patch-token")
        }
      )

      vi.mocked(chrome.identity.removeCachedAuthToken).mockImplementation(
        (opts, callback) => {
          callback()
        }
      )

      const onTokenUpdated = vi.fn()
      const promise = uploadBackup("stale-token", "small-json", onTokenUpdated)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      let xhr = mockXhrInstances[0]
      xhr.status = 401
      xhr.onload()

      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(2)
      xhr = mockXhrInstances[1]
      xhr.status = 200
      xhr.onload()

      await promise
      expect(onTokenUpdated).toHaveBeenCalledWith("fresh-patch-token")
    })

    it("should throw abort error when simple upload PATCH is aborted by signal", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "existing-id" }]
        })
      })

      const controller = new AbortController()
      const promise = uploadBackup("tok", "small-json", undefined, undefined, {
        signal: controller.signal
      })
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      controller.abort()
      await expect(promise).rejects.toThrow("Upload aborted by user")
    })

    it("should throw error when simple upload PATCH fails with network error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "existing-id" }]
        })
      })

      const promise = uploadBackup("tok", "small-json")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.onerror()

      await expect(promise).rejects.toThrow(
        "Network error during simple update."
      )
    })

    it("should throw error when simple upload PATCH status is not 2xx", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          files: [{ id: "existing-id" }]
        })
      })

      const promise = uploadBackup("tok", "small-json")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.status = 500
      xhr.onload()

      await expect(promise).rejects.toThrow(
        "Failed to update backup file: status 500"
      )
    })

    // 2. Simple upload POST (File does not exist)
    it("should handle simple upload POST successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      })

      const onProgress = vi.fn()
      const promise = uploadBackup("tok", "small-json", undefined, onProgress)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.upload.onprogress({
        lengthComputable: true,
        loaded: 30,
        total: 100
      })
      expect(onProgress).toHaveBeenCalledWith(30)

      xhr.status = 200
      xhr.onload()
      await promise
    })

    it("should throw timeout error when simple upload POST times out", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      })

      const promise = uploadBackup("tok", "small-json")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.ontimeout()

      await expect(promise).rejects.toThrow(GDriveTimeoutError)
    })

    it("should throw error when simple upload POST fails with network error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      })

      const promise = uploadBackup("tok", "small-json")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.onerror()

      await expect(promise).rejects.toThrow(
        "Network error during simple creation."
      )
    })

    it("should handle 401 re-authorization and retry simple upload POST successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      })

      vi.mocked(chrome.identity.getAuthToken).mockImplementation(
        (opts, callback) => {
          callback("fresh-post-token")
        }
      )

      vi.mocked(chrome.identity.removeCachedAuthToken).mockImplementation(
        (opts, callback) => {
          callback()
        }
      )

      const onTokenUpdated = vi.fn()
      const promise = uploadBackup("stale-token", "small-json", onTokenUpdated)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      let xhr = mockXhrInstances[0]
      xhr.status = 401
      xhr.onload()

      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(2)
      xhr = mockXhrInstances[1]
      xhr.status = 200
      xhr.onload()

      await promise
      expect(onTokenUpdated).toHaveBeenCalledWith("fresh-post-token")
    })

    it("should throw abort error when simple upload POST is aborted by signal", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      })

      const controller = new AbortController()
      const promise = uploadBackup("tok", "small-json", undefined, undefined, {
        signal: controller.signal
      })
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      controller.abort()
      await expect(promise).rejects.toThrow("Upload aborted by user")
    })

    it("should throw error when simple upload POST status is not 2xx", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ files: [] })
      })

      const promise = uploadBackup("tok", "small-json")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.status = 500
      xhr.onload()

      await expect(promise).rejects.toThrow(
        "Failed to create backup file: status 500"
      )
    })

    // 3. Resumable upload (Large data payload >= 2MB)
    it("should handle resumable upload POST successfully", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ files: [] }) // file does not exist
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (name: string) =>
              name === "Location" ? "https://resumable.upload.url" : null
          }
        })

      const onProgress = vi.fn()
      const largeData = "a".repeat(2 * 1024 * 1024 + 10)
      const promise = uploadBackup("tok", largeData, undefined, onProgress)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.upload.onprogress({
        lengthComputable: true,
        loaded: 75,
        total: 100
      })
      expect(onProgress).toHaveBeenCalledWith(75)

      xhr.status = 200
      xhr.onload()
      await promise
    })

    it("should throw error when resumable upload Location header is missing", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            files: [{ id: "existing-id" }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: () => null
          }
        })

      const largeData = "a".repeat(2 * 1024 * 1024 + 10)
      await expect(uploadBackup("tok", largeData)).rejects.toThrow(
        "Failed to get resumable upload session URL (Location header missing)"
      )
    })

    it("should handle 401 re-authorization on resumable upload PUT and retry successfully", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ files: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (name: string) =>
              name === "Location" ? "https://resumable.upload.url" : null
          }
        })

      vi.mocked(chrome.identity.getAuthToken).mockImplementation(
        (opts, callback) => {
          callback("fresh-resumable-token")
        }
      )

      vi.mocked(chrome.identity.removeCachedAuthToken).mockImplementation(
        (opts, callback) => {
          callback()
        }
      )

      const onTokenUpdated = vi.fn()
      const largeData = "a".repeat(2 * 1024 * 1024 + 10)
      const promise = uploadBackup("stale-token", largeData, onTokenUpdated)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      let xhr = mockXhrInstances[0]
      xhr.status = 401
      xhr.onload()

      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(2)
      xhr = mockXhrInstances[1]
      xhr.status = 200
      xhr.onload()

      await promise
      expect(onTokenUpdated).toHaveBeenCalledWith("fresh-resumable-token")
    })

    it("should throw timeout error when resumable upload times out", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ files: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (name: string) =>
              name === "Location" ? "https://resumable.upload.url" : null
          }
        })

      const largeData = "a".repeat(2 * 1024 * 1024 + 10)
      const promise = uploadBackup("tok", largeData)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.ontimeout()

      await expect(promise).rejects.toThrow(GDriveTimeoutError)
    })

    it("should throw error when resumable upload fails with network error", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ files: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (name: string) =>
              name === "Location" ? "https://resumable.upload.url" : null
          }
        })

      const largeData = "a".repeat(2 * 1024 * 1024 + 10)
      const promise = uploadBackup("tok", largeData)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.onerror()

      await expect(promise).rejects.toThrow(
        "Network error during resumable upload."
      )
    })

    it("should throw abort error when resumable upload is aborted by signal", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ files: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: {
            get: (name: string) =>
              name === "Location" ? "https://resumable.upload.url" : null
          }
        })

      const controller = new AbortController()
      const largeData = "a".repeat(2 * 1024 * 1024 + 10)
      const promise = uploadBackup("tok", largeData, undefined, undefined, {
        signal: controller.signal
      })
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockXhrInstances).toHaveLength(1)
      controller.abort()
      await expect(promise).rejects.toThrow("Upload aborted by user")
    })
  })

  describe("http-client error parsing and coverage helpers", () => {
    it("should parse 429 as GDriveRateLimitError", () => {
      const err = parseXhrErrorStatus(429, "custom msg")
      expect(err).toBeInstanceOf(GDriveRateLimitError)
      expect(err.message).toBe("Google Drive API rate limit exceeded.")
    })

    it("should parse 507 as GDriveQuotaError", () => {
      const err = parseXhrErrorStatus(507, "custom msg")
      expect(err).toBeInstanceOf(GDriveQuotaError)
      expect(err.message).toBe("Google Drive storage quota exceeded.")
    })

    it("should parse 403 with rateLimitExceeded as GDriveRateLimitError", () => {
      const responseText = JSON.stringify({
        error: {
          errors: [
            { reason: "rateLimitExceeded", message: "Too many requests" }
          ]
        }
      })
      const err = parseXhrErrorStatus(403, "custom msg", responseText)
      expect(err).toBeInstanceOf(GDriveRateLimitError)
      expect(err.message).toBe("Too many requests")
    })

    it("should parse 403 with userRateLimitExceeded as GDriveRateLimitError", () => {
      const responseText = JSON.stringify({
        error: {
          errors: [{ reason: "userRateLimitExceeded" }]
        }
      })
      const err = parseXhrErrorStatus(403, "custom msg", responseText)
      expect(err).toBeInstanceOf(GDriveRateLimitError)
      expect(err.message).toBe("Google Drive API rate limit exceeded.")
    })

    it("should parse 403 with quotaExceeded as GDriveQuotaError", () => {
      const responseText = JSON.stringify({
        error: {
          errors: [{ reason: "quotaExceeded", message: "Disk full" }]
        }
      })
      const err = parseXhrErrorStatus(403, "custom msg", responseText)
      expect(err).toBeInstanceOf(GDriveQuotaError)
      expect(err.message).toBe("Disk full")
    })

    it("should parse 403 with storageQuotaExceeded as GDriveQuotaError", () => {
      const responseText = JSON.stringify({
        error: {
          errors: [{ reason: "storageQuotaExceeded" }]
        }
      })
      const err = parseXhrErrorStatus(403, "custom msg", responseText)
      expect(err).toBeInstanceOf(GDriveQuotaError)
      expect(err.message).toBe("Google Drive storage quota exceeded.")
    })

    it("should fallback to generic error on non-matching 403 reason", () => {
      const responseText = JSON.stringify({
        error: {
          errors: [{ reason: "otherReason" }]
        }
      })
      const err = parseXhrErrorStatus(403, "custom msg", responseText)
      expect(err).not.toBeInstanceOf(GDriveQuotaError)
      expect(err.message).toBe("custom msg: status 403")
    })

    it("should handle invalid JSON responseText in parseXhrErrorStatus gracefully", () => {
      const err = parseXhrErrorStatus(403, "custom msg", "invalid-json")
      expect(err.message).toBe("custom msg: status 403")
    })

    it("should throw GDriveRateLimitError on 429 Response", async () => {
      const res = {
        status: 429,
        json: async () => ({})
      } as Response
      await expect(handleResponseError(res, "failed")).rejects.toThrow(
        GDriveRateLimitError
      )
    })

    it("should throw GDriveQuotaError on 507 Response", async () => {
      const res = {
        status: 507,
        json: async () => ({})
      } as Response
      await expect(handleResponseError(res, "failed")).rejects.toThrow(
        GDriveQuotaError
      )
    })

    it("should throw GDriveRateLimitError on 403 Response with userRateLimitExceeded", async () => {
      const res = {
        status: 403,
        json: async () => ({
          error: {
            errors: [
              { reason: "userRateLimitExceeded", message: "Rate limit hit" }
            ]
          }
        })
      } as Response
      await expect(handleResponseError(res, "failed")).rejects.toThrow(
        "Rate limit hit"
      )
    })

    it("should throw GDriveQuotaError on 403 Response with storageQuotaExceeded", async () => {
      const res = {
        status: 403,
        json: async () => ({
          error: {
            errors: [{ reason: "storageQuotaExceeded", message: "Quota hit" }]
          }
        })
      } as Response
      await expect(handleResponseError(res, "failed")).rejects.toThrow(
        "Quota hit"
      )
    })

    it("should throw standard error on other 403 reasons", async () => {
      const res = {
        status: 403,
        statusText: "Forbidden",
        json: async () => ({
          error: {
            errors: [{ reason: "otherReason" }]
          }
        })
      } as Response
      await expect(handleResponseError(res, "failed")).rejects.toThrow(
        "failed: 403 Forbidden"
      )
    })

    it("should handle response json parse failure in handleResponseError", async () => {
      const res = {
        status: 403,
        statusText: "Forbidden",
        json: async () => {
          throw new Error("JSON parse fail")
        }
      } as Response
      await expect(handleResponseError(res, "failed")).rejects.toThrow(
        "failed: 403 Forbidden"
      )
    })

    it("should throw GDriveTimeoutError on AbortError if signal is not aborted", async () => {
      const controller = new AbortController()

      const originalFetch = global.fetch
      global.fetch = vi.fn().mockImplementation(() => {
        const err = new Error("aborted")
        err.name = "AbortError"
        throw err
      })

      try {
        await expect(
          fetchWithTimeout("http://test.com", {
            timeoutMs: 100,
            signal: controller.signal
          })
        ).rejects.toThrow(GDriveTimeoutError)
      } finally {
        global.fetch = originalFetch
      }
    })

    it("should throw AbortError on AbortError if signal is aborted", async () => {
      const controller = new AbortController()

      const originalFetch = global.fetch
      global.fetch = vi.fn().mockImplementation(() => {
        const err = new Error("The user aborted a request.")
        err.name = "AbortError"
        throw err
      })

      controller.abort()

      try {
        await expect(
          fetchWithTimeout("http://test.com", {
            timeoutMs: 100,
            signal: controller.signal
          })
        ).rejects.toThrow("aborted")
      } finally {
        global.fetch = originalFetch
      }
    })
  })

  describe("file-ops: searchTempSharedCardsFile and deleteFile coverage", () => {
    it("should handle error in searchBackupFile if response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({})
      })
      await expect(searchBackupFile("token")).rejects.toThrow(
        "Failed to search backup file"
      )
    })

    it("should search temp shared cards file successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          files: [{ id: "temp-file-id" }]
        })
      })
      const res = await searchTempSharedCardsFile("token")
      expect(res).toBe("temp-file-id")
    })

    it("should return null in searchTempSharedCardsFile if no files found", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ files: [] })
      })
      const res = await searchTempSharedCardsFile("token")
      expect(res).toBeNull()
    })

    it("should handle error in searchTempSharedCardsFile if response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Error",
        json: async () => ({})
      })
      await expect(searchTempSharedCardsFile("token")).rejects.toThrow(
        "Failed to search temp shared cards file"
      )
    })

    it("should delete file successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true
      })
      await expect(deleteFile("token", "file-id")).resolves.not.toThrow()
    })

    it("should handle error in deleteFile if response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Error",
        json: async () => ({})
      })
      await expect(deleteFile("token", "file-id")).rejects.toThrow(
        "Failed to delete file"
      )
    })

    it("should find folder successfully if it exists", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          files: [{ id: "folder-id-123" }]
        })
      })
      const res = await findFolder("token", "MyFolder")
      expect(res).toBe("folder-id-123")
    })

    it("should return null in findFolder if folder not found", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ files: [] })
      })
      const res = await findFolder("token", "MyFolder", "parent-id")
      expect(res).toBeNull()
    })

    it("should handle error in findFolder if response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Error"
      })
      await expect(findFolder("token", "MyFolder")).rejects.toThrow(
        "Failed to find folder"
      )
    })

    it("should create folder successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "new-folder-id" })
      })
      const res = await createFolder("token", "NewFolder", "parent-id")
      expect(res).toBe("new-folder-id")
    })

    it("should handle error in createFolder if response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Error"
      })
      await expect(createFolder("token", "NewFolder")).rejects.toThrow(
        "Failed to create folder"
      )
    })

    it("should upload image file by updating existing file if fileId provided", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "existing-file-id" })
      })
      const blob = new Blob(["image-content"], { type: "image/png" })
      const res = await uploadImageFile(
        "token",
        "folder-id",
        "test.png",
        blob,
        "existing-file-id"
      )
      expect(res).toBe("existing-file-id")
    })

    it("should upload image file by creating new file if fileId is null", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "new-file-id" })
      })
      const blob = new Blob(["image-content"], { type: "image/png" })
      const res = await uploadImageFile(
        "token",
        "folder-id",
        "test.png",
        blob,
        null
      )
      expect(res).toBe("new-file-id")
    })

    it("should handle error in uploadImageFile (update) if response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Error"
      })
      const blob = new Blob(["image-content"], { type: "image/png" })
      await expect(
        uploadImageFile(
          "token",
          "folder-id",
          "test.png",
          blob,
          "existing-file-id"
        )
      ).rejects.toThrow("Failed to update image file")
    })

    it("should handle error in uploadImageFile (create) if response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Error"
      })
      const blob = new Blob(["image-content"], { type: "image/png" })
      await expect(
        uploadImageFile("token", "folder-id", "test.png", blob, null)
      ).rejects.toThrow("Failed to create image file")
    })

    it("should delete image file successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true
      })
      await expect(deleteImageFile("token", "file-id")).resolves.not.toThrow()
    })

    it("should ignore 404 error in deleteImageFile", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found"
      })
      await expect(deleteImageFile("token", "file-id")).resolves.not.toThrow()
    })

    it("should throw error in deleteImageFile for other failures", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Error"
      })
      await expect(deleteImageFile("token", "file-id")).rejects.toThrow(
        "Failed to delete image file"
      )
    })
  })

  describe("defaultGoogleDriveClient wrapper methods coverage", () => {
    it("should call downloadTempSharedCards through client", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          files: [{ id: "temp-file-id" }]
        })
      })

      const promise = defaultGoogleDriveClient.downloadTempSharedCards("token")
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(mockXhrInstances).toHaveLength(1)
      const xhr = mockXhrInstances[0]
      xhr.status = 200
      xhr.responseText = "mock-temp-cards-data"
      xhr.onload()

      const res = await promise
      expect(res).toBe("mock-temp-cards-data")
    })

    it("should call deleteFile through client", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true
      })
      await expect(
        defaultGoogleDriveClient.deleteFile("token", "file-id")
      ).resolves.not.toThrow()
    })

    it("should call searchTempSharedCardsFile through client", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          files: [{ id: "temp-file-id" }]
        })
      })
      const res =
        await defaultGoogleDriveClient.searchTempSharedCardsFile("token")
      expect(res).toBe("temp-file-id")
    })
  })
})
