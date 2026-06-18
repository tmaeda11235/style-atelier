import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { OPFSCacheManager } from "../src/lib/ai/opfs-cache-manager"
import { MockStorage } from "../src/mocks/storage-mock"

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
})
