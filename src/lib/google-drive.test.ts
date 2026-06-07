import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  authorize,
  clearCachedToken,
  downloadBackup,
  GDriveTimeoutError,
  getBackupMetadata,
  searchBackupFile,
  uploadBackup
} from "./google-drive"

// Mock XMLHttpRequest
const mockXhrInstances: any[] = []
class MockXMLHttpRequest {
  open = vi.fn()
  setRequestHeader = vi.fn()
  send = vi.fn()
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
            }, 100)

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
})
