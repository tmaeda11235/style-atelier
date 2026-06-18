import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { OPFSCacheManager } from "../src/lib/ai/opfs-cache-manager"
import { MockStorage } from "./mocks/storage-mock"

describe("OPFSCacheManager", () => {
  const TEST_FILENAME = "test-model.litertlm"
  const TEST_URL = "https://example.com/test-model.litertlm"
  const TEST_CONTENT = "mock model data"
  const TEST_SIZE = TEST_CONTENT.length
  const TEST_HASH =
    "5dbbe3869b484fc6a9e44a8d0697d458c8413332294039d65f1f3a0a862ccb3a"

  beforeEach(() => {
    MockStorage.setup()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should detect if a file is cached", async () => {
    // Arrange
    const isCachedInitial = await OPFSCacheManager.isCached(
      TEST_FILENAME,
      TEST_SIZE
    )
    expect(isCachedInitial).toBe(false)

    // Act & Assert
    // Write fake data to mock storage
    const dir = await MockStorage.rootDir.getDirectoryHandle("litert_models", {
      create: true
    })
    const fileHandle = await dir.getFileHandle(TEST_FILENAME, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(new TextEncoder().encode(TEST_CONTENT))
    await writable.close()

    const isCachedAfter = await OPFSCacheManager.isCached(
      TEST_FILENAME,
      TEST_SIZE
    )
    expect(isCachedAfter).toBe(true)

    const isCachedWrongSize = await OPFSCacheManager.isCached(
      TEST_FILENAME,
      TEST_SIZE + 10
    )
    expect(isCachedWrongSize).toBe(false)
  })

  it("should verify integrity by size and hash", async () => {
    // Arrange
    const dir = await MockStorage.rootDir.getDirectoryHandle("litert_models", {
      create: true
    })
    const fileHandle = await dir.getFileHandle(TEST_FILENAME, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(new TextEncoder().encode(TEST_CONTENT))
    await writable.close()

    // Act & Assert
    const sizeValid = await OPFSCacheManager.verifyIntegrity(
      TEST_FILENAME,
      TEST_SIZE
    )
    expect(sizeValid).toBe(true)

    const sizeInvalid = await OPFSCacheManager.verifyIntegrity(
      TEST_FILENAME,
      TEST_SIZE + 5
    )
    expect(sizeInvalid).toBe(false)

    const hashValid = await OPFSCacheManager.verifyIntegrity(
      TEST_FILENAME,
      TEST_SIZE,
      TEST_HASH
    )
    expect(hashValid).toBe(true)

    const hashInvalid = await OPFSCacheManager.verifyIntegrity(
      TEST_FILENAME,
      TEST_SIZE,
      "wrong-hash"
    )
    expect(hashInvalid).toBe(false)
  })

  it("should download and cache a model file successfully", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => TEST_SIZE.toString()
      },
      body: {
        getReader: () => {
          let readCount = 0
          return {
            read: async () => {
              if (readCount === 0) {
                readCount++
                return {
                  done: false,
                  value: new TextEncoder().encode(TEST_CONTENT)
                }
              }
              return { done: true, value: undefined }
            }
          }
        }
      }
    })
    vi.stubGlobal("fetch", fetchMock)

    // Act
    const progressCalls: number[] = []
    await OPFSCacheManager.downloadAndCache(TEST_URL, TEST_FILENAME, {
      expectedSize: TEST_SIZE,
      expectedHash: TEST_HASH,
      onProgress: (progress) => {
        progressCalls.push(progress)
      }
    })

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(TEST_URL)
    const isCached = await OPFSCacheManager.isCached(TEST_FILENAME, TEST_SIZE)
    expect(isCached).toBe(true)
    expect(progressCalls.length).toBeGreaterThan(0)
  })

  it("should trigger QuotaExceededError if disk space is insufficient", async () => {
    // Arrange
    MockStorage.setQuota(100) // Small quota
    MockStorage.setUsage(95) // High usage, only 5 bytes left

    // Act & Assert
    await expect(
      OPFSCacheManager.ensureSpace(10, TEST_FILENAME)
    ).rejects.toThrow("QuotaExceededError")
  })

  it("should clean up old cache files when space is needed", async () => {
    // Arrange
    MockStorage.setQuota(20)
    MockStorage.setUsage(15) // 5 bytes left

    const dir = await MockStorage.rootDir.getDirectoryHandle("litert_models", {
      create: true
    })

    // Create an old cache file that should be deleted
    const oldFile = await dir.getFileHandle("old-model.litertlm", {
      create: true
    })
    const oldWritable = await oldFile.createWritable()
    await oldWritable.write(new TextEncoder().encode("olddata")) // 7 bytes
    await oldWritable.close()

    // Mock storage usage decrease after deletion
    vi.spyOn(navigator.storage, "estimate").mockImplementation(async () => {
      let hasOld = false
      try {
        await dir.getFileHandle("old-model.litertlm")
        hasOld = true
      } catch {
        // file does not exist
      }

      return {
        usage: hasOld ? 15 : 8,
        quota: 20
      }
    })

    // Act
    await OPFSCacheManager.ensureSpace(10, TEST_FILENAME)

    // Assert
    await expect(dir.getFileHandle("old-model.litertlm")).rejects.toThrow(
      "NotFoundError"
    )
  })

  it("should clean up corrupted cache if integrity check fails after download", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => TEST_SIZE.toString()
      },
      body: {
        getReader: () => {
          let readCount = 0
          return {
            read: async () => {
              if (readCount === 0) {
                readCount++
                return {
                  done: false,
                  value: new TextEncoder().encode("corrupt data")
                }
              }
              return { done: true, value: undefined }
            }
          }
        }
      }
    })
    vi.stubGlobal("fetch", fetchMock)

    // Act & Assert
    await expect(
      OPFSCacheManager.downloadAndCache(TEST_URL, TEST_FILENAME, {
        expectedSize: TEST_SIZE,
        expectedHash: TEST_HASH
      })
    ).rejects.toThrow("Integrity check failed")

    // File should have been cleaned up
    const isCached = await OPFSCacheManager.isCached(TEST_FILENAME, TEST_SIZE)
    expect(isCached).toBe(false)
  })

  it("should retrieve a cached file successfully", async () => {
    // Arrange
    const dir = await MockStorage.rootDir.getDirectoryHandle("litert_models", {
      create: true
    })
    const fileHandle = await dir.getFileHandle(TEST_FILENAME, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(new TextEncoder().encode(TEST_CONTENT))
    await writable.close()

    // Act
    const file = await OPFSCacheManager.getFile(TEST_FILENAME)

    // Assert
    expect(file).toBeDefined()
    expect(file.size).toBe(TEST_SIZE)
    const text = await file.text()
    expect(text).toBe(TEST_CONTENT)
  })

  it("should delete a cached file successfully", async () => {
    // Arrange
    const dir = await MockStorage.rootDir.getDirectoryHandle("litert_models", {
      create: true
    })
    const fileHandle = await dir.getFileHandle(TEST_FILENAME, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(new TextEncoder().encode(TEST_CONTENT))
    await writable.close()

    const existsBefore = await OPFSCacheManager.isCached(
      TEST_FILENAME,
      TEST_SIZE
    )
    expect(existsBefore).toBe(true)

    // Act
    await OPFSCacheManager.deleteCache(TEST_FILENAME)

    // Assert
    const existsAfter = await OPFSCacheManager.isCached(
      TEST_FILENAME,
      TEST_SIZE
    )
    expect(existsAfter).toBe(false)
  })

  it("should handle error gracefully when deleting a non-existent cache file", async () => {
    // Act & Assert
    await expect(
      OPFSCacheManager.deleteCache("non-existent.litertlm")
    ).resolves.not.toThrow()
  })

  it("should return false if verifyIntegrity encounters an error", async () => {
    // Arrange
    vi.spyOn(OPFSCacheManager as any, "getDirectoryHandle").mockRejectedValue(
      new Error("OPFS error")
    )

    // Act
    const isValid = await OPFSCacheManager.verifyIntegrity(
      TEST_FILENAME,
      TEST_SIZE
    )

    // Assert
    expect(isValid).toBe(false)
  })

  it("should throw an error if downloadAndCache receives a non-ok HTTP response", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Not Found"
    })
    vi.stubGlobal("fetch", fetchMock)

    // Act & Assert
    await expect(
      OPFSCacheManager.downloadAndCache(TEST_URL, TEST_FILENAME, {
        expectedSize: TEST_SIZE
      })
    ).rejects.toThrow("Failed to fetch model")
  })

  it("should ignore directory entries during cleanup and handle removeEntry error gracefully", async () => {
    // Arrange
    MockStorage.setQuota(20)
    MockStorage.setUsage(15)

    const dir = await MockStorage.rootDir.getDirectoryHandle("litert_models", {
      create: true
    })

    await dir.getDirectoryHandle("sub-directory", { create: true })

    const stickyFile = await dir.getFileHandle("sticky-file.litertlm", {
      create: true
    })
    const stickyWritable = await stickyFile.createWritable()
    await stickyWritable.write(new TextEncoder().encode("data"))
    await stickyWritable.close()

    vi.spyOn(dir, "removeEntry").mockRejectedValue(new Error("Cannot delete"))

    let callCount = 0
    vi.spyOn(navigator.storage, "estimate").mockImplementation(async () => {
      if (callCount === 0) {
        callCount++
        return { usage: 15, quota: 20 }
      }
      return { usage: 8, quota: 20 }
    })

    // Act & Assert
    await expect(
      OPFSCacheManager.ensureSpace(10, TEST_FILENAME)
    ).resolves.not.toThrow()
  })

  it("should propagate non-quota errors during stream creation", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => TEST_SIZE.toString() },
      body: {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined })
        })
      }
    })
    vi.stubGlobal("fetch", fetchMock)

    const dir = await MockStorage.rootDir.getDirectoryHandle("litert_models", {
      create: true
    })
    const fileHandle = await dir.getFileHandle(TEST_FILENAME, { create: true })
    vi.spyOn(fileHandle, "createWritable").mockRejectedValue(
      new Error("Generic write error")
    )

    // Act & Assert
    await expect(
      OPFSCacheManager.downloadAndCache(TEST_URL, TEST_FILENAME, {
        expectedSize: TEST_SIZE
      })
    ).rejects.toThrow("Generic write error")
  })
})
