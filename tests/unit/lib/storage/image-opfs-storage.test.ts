import {
  deleteImageFromOpfs,
  readImageFromOpfs,
  writeImageToOpfs
} from "@/lib/storage/image-opfs-storage"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ==========================================
// OPFS Mock Classes for Testing
// ==========================================

class MockWritable {
  data: any[] = []
  closed = false
  write = vi.fn().mockImplementation(async (val) => {
    if (this.closed) throw new Error("Writable closed")
    this.data.push(val)
  })
  close = vi.fn().mockImplementation(async () => {
    this.closed = true
  })
}

class MockFileHandle {
  name: string
  data: any = null
  writableInstance: MockWritable | null = null
  move: any

  constructor(name: string, parentDir?: MockDirectoryHandle) {
    this.name = name
    if (parentDir) {
      this.move = vi.fn().mockImplementation(async (newName: string) => {
        if (parentDir.files.has(this.name)) {
          parentDir.files.delete(this.name)
        }
        this.name = newName
        parentDir.files.set(newName, this)
      })
    } else {
      this.move = undefined
    }
  }

  createWritable = vi.fn().mockImplementation(async () => {
    this.writableInstance = new MockWritable()
    return this.writableInstance
  })

  getFile = vi.fn().mockImplementation(async () => {
    const blobData = this.writableInstance
      ? this.writableInstance.data
      : [this.data]
    return new Blob(blobData)
  })
}

class MockDirectoryHandle {
  files = new Map<string, MockFileHandle>()
  dirs = new Map<string, MockDirectoryHandle>()
  supportFileMove = true

  getDirectoryHandle = vi
    .fn()
    .mockImplementation(
      async (name: string, options?: { create?: boolean }) => {
        if (!this.dirs.has(name)) {
          if (options?.create) {
            const newDir = new MockDirectoryHandle()
            newDir.supportFileMove = this.supportFileMove
            this.dirs.set(name, newDir)
          } else {
            const err = new Error("Directory not found")
            err.name = "NotFoundError"
            throw err
          }
        }
        return this.dirs.get(name)!
      }
    )

  getFileHandle = vi
    .fn()
    .mockImplementation(
      async (name: string, options?: { create?: boolean }) => {
        if (!this.files.has(name)) {
          if (options?.create) {
            this.files.set(
              name,
              new MockFileHandle(name, this.supportFileMove ? this : undefined)
            )
          } else {
            const err = new Error("File not found")
            err.name = "NotFoundError"
            throw err
          }
        }
        return this.files.get(name)!
      }
    )

  removeEntry = vi.fn().mockImplementation(async (name: string) => {
    if (!this.files.has(name) && !this.dirs.has(name)) {
      const err = new Error("Entry not found")
      err.name = "NotFoundError"
      throw err
    }
    this.files.delete(name)
    this.dirs.delete(name)
  })
}

// ==========================================
// Tests
// ==========================================

describe("image-opfs-storage", () => {
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

  describe("Environment Support Guardrails", () => {
    it("should throw error if navigator is not defined", async () => {
      Object.defineProperty(global, "navigator", {
        value: undefined,
        writable: true,
        configurable: true
      })

      await expect(writeImageToOpfs("test", new Blob([]))).rejects.toThrow(
        "OPFS is not supported in this environment"
      )
      await expect(readImageFromOpfs("test")).rejects.toThrow(
        "OPFS is not supported in this environment"
      )
      await expect(deleteImageFromOpfs("test")).rejects.toThrow(
        "OPFS is not supported in this environment"
      )
    })

    it("should throw error if navigator.storage is missing", async () => {
      Object.defineProperty(global, "navigator", {
        value: {},
        writable: true,
        configurable: true
      })

      await expect(writeImageToOpfs("test", new Blob([]))).rejects.toThrow(
        "OPFS is not supported in this environment"
      )
    })

    it("should throw error if navigator.storage.getDirectory is missing", async () => {
      Object.defineProperty(global, "navigator", {
        value: { storage: {} },
        writable: true,
        configurable: true
      })

      await expect(writeImageToOpfs("test", new Blob([]))).rejects.toThrow(
        "OPFS is not supported in this environment"
      )
    })
  })

  describe("writeImageToOpfs", () => {
    let rootDir: MockDirectoryHandle

    beforeEach(() => {
      rootDir = new MockDirectoryHandle()
      const mockGetDirectory = vi.fn().mockResolvedValue(rootDir)
      Object.defineProperty(global, "navigator", {
        value: { storage: { getDirectory: mockGetDirectory } },
        writable: true,
        configurable: true
      })
    })

    it("should write image atomically using move (rename)", async () => {
      const blob = new Blob(["image-content"], { type: "image/png" })
      const path = await writeImageToOpfs("card-1234", blob)

      expect(path).toBe("card-images/card-1234.png")

      const dir = await rootDir.getDirectoryHandle("card-images")
      // The final file should exist
      expect(dir.files.has("card-1234.png")).toBe(true)
      // The temp file should be renamed (so not exist anymore)
      expect(dir.files.has("card-1234.png.tmp")).toBe(false)

      const fileHandle = await dir.getFileHandle("card-1234.png")
      const savedBlob = await fileHandle.getFile()
      const text = await savedBlob.text()
      expect(text).toBe("image-content")
    })

    it("should strip folder prefixes and Enforce consistent extensions", async () => {
      const blob = new Blob(["content"])

      // Test with folder prefix
      const path1 = await writeImageToOpfs("card-images/card-1", blob)
      expect(path1).toBe("card-images/card-1.png")

      // Test with extensions
      const path2 = await writeImageToOpfs("card-2.jpg", blob)
      expect(path2).toBe("card-images/card-2.png")

      const path3 = await writeImageToOpfs("card-3.JPEG", blob)
      expect(path3).toBe("card-images/card-3.png")

      const path4 = await writeImageToOpfs("card-4.png", blob)
      expect(path4).toBe("card-images/card-4.png")
    })

    it("should write image using copy fallback if move is unsupported", async () => {
      rootDir.supportFileMove = false // Disable move mock

      const blob = new Blob(["image-content-fallback"], { type: "image/png" })
      const path = await writeImageToOpfs("card-fallback", blob)

      expect(path).toBe("card-images/card-fallback.png")

      const dir = await rootDir.getDirectoryHandle("card-images")
      expect(dir.files.has("card-fallback.png")).toBe(true)
      expect(dir.files.has("card-fallback.png.tmp")).toBe(false) // Cleaned up

      const fileHandle = await dir.getFileHandle("card-fallback.png")
      const savedBlob = await fileHandle.getFile()
      const text = await savedBlob.text()
      expect(text).toBe("image-content-fallback")
    })

    it("should clean up temp file and propagate error if writing fails", async () => {
      const badBlob = new Blob(["content"])

      // Setup directory handle to reject getFileHandle on final rename (fallback mode)
      // or make write throw error.
      // We will mock createWritable to reject or throw error.
      const dir = await rootDir.getDirectoryHandle("card-images", {
        create: true
      })
      const originalGetFileHandle = dir.getFileHandle

      dir.getFileHandle = vi
        .fn()
        .mockImplementation(async (name: string, options?: any) => {
          const handle = await originalGetFileHandle.call(dir, name, options)
          if (name.endsWith(".tmp")) {
            handle.createWritable = vi
              .fn()
              .mockRejectedValue(new Error("Disk Full"))
          }
          return handle
        })

      await expect(writeImageToOpfs("card-error", badBlob)).rejects.toThrow(
        "Disk Full"
      )

      // Temporary file should be deleted on error
      expect(dir.files.has("card-error.png.tmp")).toBe(false)
      expect(dir.files.has("card-error.png")).toBe(false)
    })
  })

  describe("readImageFromOpfs", () => {
    let rootDir: MockDirectoryHandle

    beforeEach(async () => {
      rootDir = new MockDirectoryHandle()
      const mockGetDirectory = vi.fn().mockResolvedValue(rootDir)
      Object.defineProperty(global, "navigator", {
        value: { storage: { getDirectory: mockGetDirectory } },
        writable: true,
        configurable: true
      })

      // Seed mock data
      const dir = await rootDir.getDirectoryHandle("card-images", {
        create: true
      })
      const fileHandle = await dir.getFileHandle("card-exist.png", {
        create: true
      })
      const writable = await fileHandle.createWritable()
      await writable.write("seeded-data")
      await writable.close()
    })

    it("should read existing file successfully", async () => {
      const blob = await readImageFromOpfs("card-exist")
      const text = await blob.text()
      expect(text).toBe("seeded-data")
    })

    it("should read existing file using relative path successfully", async () => {
      const blob = await readImageFromOpfs("card-images/card-exist.png")
      const text = await blob.text()
      expect(text).toBe("seeded-data")
    })

    it("should propagate NotFoundError if file does not exist", async () => {
      await expect(readImageFromOpfs("card-not-exist")).rejects.toThrow()
    })
  })

  describe("deleteImageFromOpfs", () => {
    let rootDir: MockDirectoryHandle

    beforeEach(async () => {
      rootDir = new MockDirectoryHandle()
      const mockGetDirectory = vi.fn().mockResolvedValue(rootDir)
      Object.defineProperty(global, "navigator", {
        value: { storage: { getDirectory: mockGetDirectory } },
        writable: true,
        configurable: true
      })

      // Seed mock data
      const dir = await rootDir.getDirectoryHandle("card-images", {
        create: true
      })
      const fileHandle = await dir.getFileHandle("card-to-delete.png", {
        create: true
      })
      const writable = await fileHandle.createWritable()
      await writable.write("content")
      await writable.close()
    })

    it("should delete existing file successfully", async () => {
      const dir = await rootDir.getDirectoryHandle("card-images")
      expect(dir.files.has("card-to-delete.png")).toBe(true)

      await deleteImageFromOpfs("card-to-delete")
      expect(dir.files.has("card-to-delete.png")).toBe(false)
    })

    it("should be idempotent and not throw if file does not exist", async () => {
      await expect(deleteImageFromOpfs("card-not-exist")).resolves.not.toThrow()
    })

    it("should propagate non-NotFoundError errors", async () => {
      const dir = await rootDir.getDirectoryHandle("card-images")
      dir.removeEntry = vi
        .fn()
        .mockRejectedValue(new Error("Permission Denied"))

      await expect(deleteImageFromOpfs("card-to-delete")).rejects.toThrow(
        "Permission Denied"
      )
    })
  })
})
