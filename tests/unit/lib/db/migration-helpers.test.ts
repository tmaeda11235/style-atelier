import {
  computeHash,
  decodeBase64,
  deleteOpfsFile,
  listOpfsFiles,
  readBlobFromOpfs,
  saveBase64ToOpfs
} from "@/shared/lib/db/migration-helpers"
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
  kind = "directory" as const
  name: string
  files = new Map<string, MockFileHandle>()
  dirs = new Map<string, MockDirectoryHandle>()
  supportFileMove = true

  constructor(name = "") {
    this.name = name
  }

  getDirectoryHandle = vi
    .fn()
    .mockImplementation(
      async (name: string, options?: { create?: boolean }) => {
        if (!this.dirs.has(name)) {
          if (options?.create) {
            const newDir = new MockDirectoryHandle(name)
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

  // Mock async iterator for .values()
  values = vi.fn().mockImplementation(() => {
    const allEntries = [...this.dirs.values(), ...this.files.values()]
    let index = 0
    return {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            if (index < allEntries.length) {
              const value = allEntries[index++]
              const kind =
                (value as any).files !== undefined ? "directory" : "file"
              ;(value as any).kind = kind
              return { value, done: false }
            }
            return { done: true }
          }
        }
      }
    } as any
  })
}

describe("migration-helpers", () => {
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

  describe("decodeBase64", () => {
    it("should successfully decode standard base64 data url", () => {
      // "test" in base64 is dGVzdA==
      const base64 = "data:image/png;base64,dGVzdA=="
      const blob = decodeBase64(base64)
      expect(blob.type).toBe("image/png")
    })

    it("should throw error for invalid base64 data", () => {
      expect(() => decodeBase64("!!!invalid base64!!!")).toThrow()
    })
  })

  describe("OPFS Storage Operations", () => {
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

    describe("saveBase64ToOpfs", () => {
      it("should write image atomically using move (rename)", async () => {
        const base64 = "data:image/png;base64,dGVzdA==" // "test"
        await saveBase64ToOpfs("images/cards/card-1.png", base64)

        const imagesDir = await rootDir.getDirectoryHandle("images")
        const cardsDir = await imagesDir.getDirectoryHandle("cards")

        expect(cardsDir.files.has("card-1.png")).toBe(true)
        expect(cardsDir.files.has("card-1.png.tmp")).toBe(false)
      })

      it("should use copy fallback if move is unsupported", async () => {
        rootDir.supportFileMove = false // Disable move
        const base64 = "data:image/png;base64,dGVzdA==" // "test"
        await saveBase64ToOpfs("images/cards/card-2.png", base64)

        const imagesDir = await rootDir.getDirectoryHandle("images")
        const cardsDir = await imagesDir.getDirectoryHandle("cards")

        expect(cardsDir.files.has("card-2.png")).toBe(true)
        expect(cardsDir.files.has("card-2.png.tmp")).toBe(false)
      })
    })

    describe("deleteOpfsFile", () => {
      it("should delete existing file from OPFS", async () => {
        const base64 = "data:image/png;base64,dGVzdA=="
        await saveBase64ToOpfs("images/cards/card-3.png", base64)

        const imagesDir = await rootDir.getDirectoryHandle("images")
        const cardsDir = await imagesDir.getDirectoryHandle("cards")
        expect(cardsDir.files.has("card-3.png")).toBe(true)

        await deleteOpfsFile("images/cards/card-3.png")
        expect(cardsDir.files.has("card-3.png")).toBe(false)
      })

      it("should not throw error if deleting non-existent file", async () => {
        await expect(
          deleteOpfsFile("images/cards/non-existent.png")
        ).resolves.not.toThrow()
      })
    })

    describe("readBlobFromOpfs", () => {
      it("should read blob from OPFS path", async () => {
        const base64 = "data:image/png;base64,dGVzdA=="
        await saveBase64ToOpfs("images/cards/card-4.png", base64)

        const blob = await readBlobFromOpfs("images/cards/card-4.png")
        expect(blob).toBeInstanceOf(Blob)
      })
    })

    describe("listOpfsFiles", () => {
      it("should recursively list all files in directory", async () => {
        const base64 = "data:image/png;base64,dGVzdA=="
        await saveBase64ToOpfs("images/cards/card-5.png", base64)
        await saveBase64ToOpfs("images/categories/cat-5.png", base64)

        const imagesDir = await rootDir.getDirectoryHandle("images")
        const fileList = await listOpfsFiles(imagesDir)

        const paths = fileList.map((f) => f.filePath)
        expect(paths).toContain("cards/card-5.png")
        expect(paths).toContain("categories/cat-5.png")
      })
    })

    describe("computeHash", () => {
      it("should compute consistent hash for ArrayBuffer", async () => {
        const buffer1 = new TextEncoder().encode("hello").buffer
        const buffer2 = new TextEncoder().encode("hello").buffer
        const buffer3 = new TextEncoder().encode("world").buffer

        const hash1 = await computeHash(buffer1)
        const hash2 = await computeHash(buffer2)
        const hash3 = await computeHash(buffer3)

        expect(hash1).toBe(hash2)
        expect(hash1).not.toBe(hash3)
      })
    })
  })
})
