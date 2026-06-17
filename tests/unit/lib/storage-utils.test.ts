import {
  checkAvailableStorage,
  downloadFileWithResume,
  formatBytes,
  getStorageEstimate,
  verifyCacheIntegrity,
  verifyOpfsIntegrity
} from "@/lib/storage-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("storage-utils", () => {
  describe("formatBytes", () => {
    it("should format 0 bytes", () => {
      expect(formatBytes(0)).toBe("0 Bytes")
    })

    it("should format bytes with custom decimals", () => {
      expect(formatBytes(1024)).toBe("1.0 KB")
      expect(formatBytes(1500, 2)).toBe("1.46 KB")
      expect(formatBytes(1500, -1)).toBe("1 KB") // test negative decimals fallback to 0
    })

    it("should handle larger units", () => {
      expect(formatBytes(1024 * 1024)).toBe("1.0 MB")
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB")
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1.0 TB")
    })
  })

  describe("getStorageEstimate", () => {
    const originalNavigator = global.navigator

    beforeEach(() => {
      vi.stubGlobal("window", {})
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
        configurable: true
      })
    })

    it("should return null if navigator is not defined", async () => {
      Object.defineProperty(global, "navigator", {
        value: undefined,
        writable: true,
        configurable: true
      })
      const res = await getStorageEstimate()
      expect(res).toBeNull()
    })

    it("should return null if navigator.storage is not defined", async () => {
      Object.defineProperty(global, "navigator", {
        value: {},
        writable: true,
        configurable: true
      })
      const res = await getStorageEstimate()
      expect(res).toBeNull()
    })

    it("should return null if navigator.storage.estimate is not defined", async () => {
      Object.defineProperty(global, "navigator", {
        value: { storage: {} },
        writable: true,
        configurable: true
      })
      const res = await getStorageEstimate()
      expect(res).toBeNull()
    })

    it("should estimate successfully with default values", async () => {
      const mockEstimate = vi
        .fn()
        .mockResolvedValue({ usage: 1024, quota: 4096 })
      Object.defineProperty(global, "navigator", {
        value: { storage: { estimate: mockEstimate } },
        writable: true,
        configurable: true
      })

      const res = await getStorageEstimate()
      expect(res).toEqual({
        usage: 1024,
        quota: 4096,
        percentage: 25,
        usageFormatted: "1.0 KB",
        quotaFormatted: "4.0 KB"
      })
    })

    it("should estimate successfully in worker context (window undefined)", async () => {
      vi.stubGlobal("window", undefined)
      const mockEstimate = vi
        .fn()
        .mockResolvedValue({ usage: 1024, quota: 4096 })
      Object.defineProperty(global, "navigator", {
        value: { storage: { estimate: mockEstimate } },
        writable: true,
        configurable: true
      })

      const res = await getStorageEstimate()
      expect(res).toEqual({
        usage: 1024,
        quota: 4096,
        percentage: 25,
        usageFormatted: "1.0 KB",
        quotaFormatted: "4.0 KB"
      })
    })

    it("should handle zero or undefined values gracefully", async () => {
      const mockEstimate = vi
        .fn()
        .mockResolvedValue({ usage: undefined, quota: undefined })
      Object.defineProperty(global, "navigator", {
        value: { storage: { estimate: mockEstimate } },
        writable: true,
        configurable: true
      })

      const res = await getStorageEstimate()
      expect(res).toEqual({
        usage: 0,
        quota: 1, // fallback to 1 to avoid division by zero
        percentage: 0,
        usageFormatted: "0 Bytes",
        quotaFormatted: "1.0 Bytes"
      })
    })

    it("should return null and log error if estimate rejects", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      const mockEstimate = vi
        .fn()
        .mockRejectedValue(new Error("Estimate failed"))
      Object.defineProperty(global, "navigator", {
        value: { storage: { estimate: mockEstimate } },
        writable: true,
        configurable: true
      })

      const res = await getStorageEstimate()
      expect(res).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to estimate storage usage:",
        expect.any(Error)
      )
      consoleErrorSpy.mockRestore()
    })
  })

  describe("checkAvailableStorage", () => {
    it("should return true if getStorageEstimate returns null", async () => {
      const mockEstimate = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})
      Object.defineProperty(global, "navigator", {
        value: undefined,
        writable: true,
        configurable: true
      })
      const res = await checkAvailableStorage(1024)
      expect(res).toBe(true)
      mockEstimate.mockRestore()
    })

    it("should return true if available storage is sufficient", async () => {
      const mockEstimate = vi
        .fn()
        .mockResolvedValue({ usage: 1000, quota: 5000 })
      Object.defineProperty(global, "navigator", {
        value: { storage: { estimate: mockEstimate } },
        writable: true,
        configurable: true
      })
      const res = await checkAvailableStorage(3000)
      expect(res).toBe(true)
    })

    it("should return false if available storage is insufficient", async () => {
      const mockEstimate = vi
        .fn()
        .mockResolvedValue({ usage: 4000, quota: 5000 })
      Object.defineProperty(global, "navigator", {
        value: { storage: { estimate: mockEstimate } },
        writable: true,
        configurable: true
      })
      const res = await checkAvailableStorage(2000)
      expect(res).toBe(false)
    })
  })

  describe("verifyCacheIntegrity", () => {
    it("should return true if caches is undefined", async () => {
      vi.stubGlobal("caches", undefined)
      const res = await verifyCacheIntegrity("test-cache", [])
      expect(res).toBe(true)
    })

    it("should return true if all expected files match sizes", async () => {
      const mockBlob = { size: 100 }
      const mockResponse = { blob: vi.fn().mockResolvedValue(mockBlob) }
      const mockCache = {
        match: vi.fn().mockResolvedValue(mockResponse),
        delete: vi.fn()
      }
      const mockCaches = {
        open: vi.fn().mockResolvedValue(mockCache)
      }
      vi.stubGlobal("caches", mockCaches)

      const res = await verifyCacheIntegrity("test-cache", [
        { url: "file1.bin", size: 100 }
      ])
      expect(res).toBe(true)
      expect(mockCache.match).toHaveBeenCalledWith("file1.bin")
      expect(mockCache.delete).not.toHaveBeenCalled()
    })

    it("should verify successfully in worker context (window undefined, caches defined)", async () => {
      vi.stubGlobal("window", undefined)
      const mockBlob = { size: 100 }
      const mockResponse = { blob: vi.fn().mockResolvedValue(mockBlob) }
      const mockCache = {
        match: vi.fn().mockResolvedValue(mockResponse),
        delete: vi.fn()
      }
      const mockCaches = {
        open: vi.fn().mockResolvedValue(mockCache)
      }
      vi.stubGlobal("caches", mockCaches)

      const res = await verifyCacheIntegrity("test-cache", [
        { url: "file1.bin", size: 100 }
      ])
      expect(res).toBe(true)
      expect(mockCache.match).toHaveBeenCalledWith("file1.bin")
      expect(mockCache.delete).not.toHaveBeenCalled()
    })

    it("should return false and delete mismatch files if size does not match", async () => {
      const mockBlob = { size: 50 }
      const mockResponse = { blob: vi.fn().mockResolvedValue(mockBlob) }
      const mockCache = {
        match: vi.fn().mockResolvedValue(mockResponse),
        delete: vi.fn().mockResolvedValue(true)
      }
      const mockCaches = {
        open: vi.fn().mockResolvedValue(mockCache)
      }
      vi.stubGlobal("caches", mockCaches)

      const res = await verifyCacheIntegrity("test-cache", [
        { url: "file1.bin", size: 100 }
      ])
      expect(res).toBe(false)
      expect(mockCache.delete).toHaveBeenCalledWith("file1.bin")
    })

    it("should return false if response is missing", async () => {
      const mockCache = {
        match: vi.fn().mockResolvedValue(null),
        delete: vi.fn()
      }
      const mockCaches = {
        open: vi.fn().mockResolvedValue(mockCache)
      }
      vi.stubGlobal("caches", mockCaches)

      const res = await verifyCacheIntegrity("test-cache", [
        { url: "file1.bin", size: 100 }
      ])
      expect(res).toBe(false)
    })
  })

  describe("verifyOpfsIntegrity", () => {
    it("should return true if navigator.storage.getDirectory is missing", async () => {
      Object.defineProperty(global, "navigator", {
        value: undefined,
        writable: true,
        configurable: true
      })
      const res = await verifyOpfsIntegrity("test-dir", [])
      expect(res).toBe(true)
    })

    it("should return false if directory handle fails to open", async () => {
      const mockGetDirectory = vi.fn().mockResolvedValue({
        getDirectoryHandle: vi.fn().mockRejectedValue(new Error("Not found"))
      })
      Object.defineProperty(global, "navigator", {
        value: { storage: { getDirectory: mockGetDirectory } },
        writable: true,
        configurable: true
      })
      const res = await verifyOpfsIntegrity("test-dir", [
        { name: "file1.bin", size: 100 }
      ])
      expect(res).toBe(false)
    })

    it("should return true if all files match size in OPFS", async () => {
      const mockFile = { size: 100 }
      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile)
      }
      const mockDirHandle = {
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
        removeEntry: vi.fn()
      }
      const mockGetDirectory = vi.fn().mockResolvedValue({
        getDirectoryHandle: vi.fn().mockResolvedValue(mockDirHandle)
      })
      Object.defineProperty(global, "navigator", {
        value: { storage: { getDirectory: mockGetDirectory } },
        writable: true,
        configurable: true
      })

      const res = await verifyOpfsIntegrity("test-dir", [
        { name: "file1.bin", size: 100 }
      ])
      expect(res).toBe(true)
      expect(mockDirHandle.removeEntry).not.toHaveBeenCalled()
    })

    it("should return false and delete file if sizes do not match in OPFS", async () => {
      const mockFile = { size: 50 }
      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue(mockFile)
      }
      const mockDirHandle = {
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
        removeEntry: vi.fn().mockResolvedValue(undefined)
      }
      const mockGetDirectory = vi.fn().mockResolvedValue({
        getDirectoryHandle: vi.fn().mockResolvedValue(mockDirHandle)
      })
      Object.defineProperty(global, "navigator", {
        value: { storage: { getDirectory: mockGetDirectory } },
        writable: true,
        configurable: true
      })

      const res = await verifyOpfsIntegrity("test-dir", [
        { name: "file1.bin", size: 100 }
      ])
      expect(res).toBe(false)
      expect(mockDirHandle.removeEntry).toHaveBeenCalledWith("file1.bin")
    })
  })

  describe("downloadFileWithResume", () => {
    const originalNavigator = global.navigator

    afterEach(() => {
      vi.unstubAllGlobals()
      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
        configurable: true
      })
    })

    it("should throw error if OPFS is not supported", async () => {
      Object.defineProperty(global, "navigator", {
        value: undefined,
        writable: true,
        configurable: true
      })
      await expect(
        downloadFileWithResume(
          "dir",
          "file.bin",
          "http://test.com/file.bin",
          1000
        )
      ).rejects.toThrow("OPFS is not supported in this environment")
    })

    it("should complete immediately if file size matches expectedSize", async () => {
      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({ size: 1000 })
      }
      const mockDirHandle = {
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle)
      }
      const mockGetDirectory = vi.fn().mockResolvedValue({
        getDirectoryHandle: vi.fn().mockResolvedValue(mockDirHandle)
      })
      Object.defineProperty(global, "navigator", {
        value: { storage: { getDirectory: mockGetDirectory } },
        writable: true,
        configurable: true
      })

      const onProgress = vi.fn()
      await downloadFileWithResume(
        "dir",
        "file.bin",
        "http://test.com/file.bin",
        1000,
        onProgress
      )
      expect(onProgress).toHaveBeenCalledWith(100, 0, 0)
    })

    it("should remove file and recreate if currentSize > expectedSize", async () => {
      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({ size: 1500 }), // larger than 1000
        createWritable: vi.fn().mockResolvedValue({
          write: vi.fn(),
          seek: vi.fn(),
          close: vi.fn()
        })
      }
      const mockDirHandle = {
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
        removeEntry: vi.fn().mockResolvedValue(undefined)
      }
      const mockGetDirectory = vi.fn().mockResolvedValue({
        getDirectoryHandle: vi.fn().mockResolvedValue(mockDirHandle)
      })
      Object.defineProperty(global, "navigator", {
        value: { storage: { getDirectory: mockGetDirectory } },
        writable: true,
        configurable: true
      })

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new Uint8Array([1, 2, 3])
          })
          .mockResolvedValueOnce({ done: true, value: undefined })
      }
      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: vi.fn().mockReturnValue(mockReader)
        }
      }
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(mockResponse as any)

      await downloadFileWithResume(
        "dir",
        "file.bin",
        "http://test.com/file.bin",
        1000
      )
      expect(mockDirHandle.removeEntry).toHaveBeenCalledWith("file.bin")
      expect(fetchSpy).toHaveBeenCalled()
      fetchSpy.mockRestore()
    })

    it("should fetch with Range if currentSize < expectedSize and resume", async () => {
      const mockWritable = {
        write: vi.fn().mockResolvedValue(undefined),
        seek: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      }
      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({ size: 500 }),
        createWritable: vi.fn().mockResolvedValue(mockWritable)
      }
      const mockDirHandle = {
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle)
      }
      const mockGetDirectory = vi.fn().mockResolvedValue({
        getDirectoryHandle: vi.fn().mockResolvedValue(mockDirHandle)
      })
      Object.defineProperty(global, "navigator", {
        value: { storage: { getDirectory: mockGetDirectory } },
        writable: true,
        configurable: true
      })

      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array(500) })
          .mockResolvedValueOnce({ done: true, value: undefined })
      }
      const mockResponse = {
        ok: true,
        status: 206, // Partial Content
        body: {
          getReader: vi.fn().mockReturnValue(mockReader)
        }
      }
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(mockResponse as any)

      const onProgress = vi.fn()
      await downloadFileWithResume(
        "dir",
        "file.bin",
        "http://test.com/file.bin",
        1000,
        onProgress
      )

      expect(fetchSpy).toHaveBeenCalledWith(
        "http://test.com/file.bin",
        expect.objectContaining({
          headers: expect.any(Headers)
        })
      )
      const sentHeaders = fetchSpy.mock.calls[0][1]?.headers as Headers
      expect(sentHeaders.get("Range")).toBe("bytes=500-")
      expect(mockWritable.seek).toHaveBeenCalledWith(500)
      expect(onProgress).toHaveBeenCalled()
      fetchSpy.mockRestore()
    })

    it("should throw error if fetch response is not ok", async () => {
      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({ size: 0 })
      }
      const mockDirHandle = {
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle)
      }
      const mockGetDirectory = vi.fn().mockResolvedValue({
        getDirectoryHandle: vi.fn().mockResolvedValue(mockDirHandle)
      })
      Object.defineProperty(global, "navigator", {
        value: { storage: { getDirectory: mockGetDirectory } },
        writable: true,
        configurable: true
      })

      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found"
      }
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(mockResponse as any)

      await expect(
        downloadFileWithResume(
          "dir",
          "file.bin",
          "http://test.com/file.bin",
          1000
        )
      ).rejects.toThrow("Failed to fetch model: 404 Not Found")

      fetchSpy.mockRestore()
    })
  })
})
