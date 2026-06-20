import {
  setupMigrations,
  upgradeToVersion15,
  upgradeToVersion16
} from "@/lib/db/migrations"
import Dexie from "dexie"
import { beforeEach, describe, expect, it, vi } from "vitest"

describe("setupMigrations", () => {
  it("should setup database versions and stores", () => {
    const mockStores = vi.fn().mockReturnValue({
      upgrade: vi.fn()
    })
    const mockVersion = vi.fn().mockReturnValue({
      stores: mockStores
    })

    const mockDb = {
      version: mockVersion
    } as unknown as Dexie

    setupMigrations(mockDb)

    // Verify versions 5 to 18 are registered
    expect(mockVersion).toHaveBeenCalledWith(5)
    expect(mockVersion).toHaveBeenCalledWith(6)
    expect(mockVersion).toHaveBeenCalledWith(7)
    expect(mockVersion).toHaveBeenCalledWith(8)
    expect(mockVersion).toHaveBeenCalledWith(9)
    expect(mockVersion).toHaveBeenCalledWith(10)
    expect(mockVersion).toHaveBeenCalledWith(11)
    expect(mockVersion).toHaveBeenCalledWith(12)
    expect(mockVersion).toHaveBeenCalledWith(13)
    expect(mockVersion).toHaveBeenCalledWith(14)
    expect(mockVersion).toHaveBeenCalledWith(15)
    expect(mockVersion).toHaveBeenCalledWith(16)
    expect(mockVersion).toHaveBeenCalledWith(17)
    expect(mockVersion).toHaveBeenCalledWith(18)
  })
})

describe("upgradeToVersion15", () => {
  const mockWrite = vi.fn()
  const mockClose = vi.fn()
  const mockRemoveEntry = vi.fn()
  const mockGetFileHandle = vi.fn()
  const mockGetDirectoryHandle = vi.fn()
  const mockGetDirectory = vi.fn()

  const mockCardsTable = {
    toArray: vi.fn(),
    put: vi.fn()
  }
  const mockCategoriesTable = {
    toArray: vi.fn(),
    put: vi.fn()
  }
  const mockTx = {
    table: vi.fn().mockImplementation((name) => {
      if (name === "styleCards") return mockCardsTable
      if (name === "categories") return mockCategoriesTable
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockClose.mockResolvedValue(undefined)
    mockRemoveEntry.mockResolvedValue(undefined)

    mockGetFileHandle.mockImplementation(async () => {
      const fileChunks: any[] = []
      return {
        createWritable: vi.fn().mockResolvedValue({
          write: vi.fn().mockImplementation(async (val) => {
            fileChunks.push(val)
            mockWrite(val)
          }),
          close: mockClose
        }),
        getFile: vi.fn().mockImplementation(async () => {
          return new Blob(fileChunks)
        })
      }
    })

    mockGetDirectoryHandle.mockResolvedValue({
      getFileHandle: mockGetFileHandle,
      getDirectoryHandle: mockGetDirectoryHandle,
      removeEntry: mockRemoveEntry
    })

    mockGetDirectory.mockResolvedValue({
      getDirectoryHandle: mockGetDirectoryHandle,
      removeEntry: mockRemoveEntry
    })

    vi.stubGlobal("navigator", {
      storage: {
        getDirectory: mockGetDirectory
      }
    })
  })

  it("should migrate StyleCards thumbnailData and Categories coverImageUrl to OPFS", async () => {
    const mockCards = [
      {
        id: "card-1",
        thumbnailData:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      },
      {
        id: "card-2",
        thumbnailPath: "images/cards/card-2.png" // already migrated
      }
    ]

    const mockCategories = [
      {
        id: "category-1",
        coverImageUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      },
      {
        id: "category-2",
        coverImagePath: "images/categories/category-2.png" // already migrated
      }
    ]

    mockCardsTable.toArray.mockResolvedValue(mockCards)
    mockCategoriesTable.toArray.mockResolvedValue(mockCategories)

    await upgradeToVersion15(mockTx)

    // Verify OPFS save calls
    expect(mockGetDirectory).toHaveBeenCalled()
    expect(mockGetDirectoryHandle).toHaveBeenCalledWith("images", {
      create: true
    })
    expect(mockGetDirectoryHandle).toHaveBeenCalledWith("cards", {
      create: true
    })
    expect(mockGetDirectoryHandle).toHaveBeenCalledWith("categories", {
      create: true
    })
    expect(mockGetFileHandle).toHaveBeenCalledWith("card-1.png", {
      create: true
    })
    expect(mockGetFileHandle).toHaveBeenCalledWith("category-1.png", {
      create: true
    })

    // Verify database updates
    expect(mockCardsTable.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "card-1",
        thumbnailPath: "images/cards/card-1.png"
      })
    )
    expect(mockCards[0].thumbnailData).toBeUndefined()

    expect(mockCategoriesTable.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "category-1",
        coverImagePath: "images/categories/category-1.png"
      })
    )
    expect(mockCategories[0].coverImageUrl).toBeUndefined()

    // Already migrated items should not be rewritten or put back
    expect(mockCardsTable.put).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: "card-2" })
    )
    expect(mockCategoriesTable.put).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: "category-2" })
    )
  })

  it("should rollback written OPFS files if an error occurs during migration", async () => {
    const mockCards = [
      {
        id: "card-1",
        thumbnailData:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      },
      {
        id: "card-2",
        thumbnailData:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      }
    ]

    mockCardsTable.toArray.mockResolvedValue(mockCards)
    mockCategoriesTable.toArray.mockResolvedValue([])

    // Simulate failure on second write
    mockGetFileHandle.mockImplementation((name: string) => {
      if (name === "card-2.png") {
        throw new Error("Disk Quota Exceeded")
      }
      const fileChunks: any[] = []
      return {
        createWritable: vi.fn().mockResolvedValue({
          write: vi.fn().mockImplementation(async (val) => {
            fileChunks.push(val)
            mockWrite(val)
          }),
          close: mockClose
        }),
        getFile: vi.fn().mockImplementation(async () => {
          return new Blob(fileChunks)
        })
      }
    })

    await expect(upgradeToVersion15(mockTx)).rejects.toThrow(
      "Disk Quota Exceeded"
    )

    // The first file was written before the crash, so it should have been deleted during rollback
    expect(mockRemoveEntry).toHaveBeenCalledWith("card-1.png")
  })
})

describe("upgradeToVersion16", () => {
  const mockSyncStatesTable = {
    bulkAdd: vi.fn().mockResolvedValue(undefined)
  }
  const mockTx = {
    table: vi.fn().mockImplementation((name) => {
      if (name === "imageSyncStates") return mockSyncStatesTable
    })
  }

  it("should populate imageSyncStates table from existing OPFS files", async () => {
    const mockFileHandle1 = {
      name: "card-123.png",
      kind: "file",
      getFile: vi.fn().mockResolvedValue({
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
        lastModified: 1000
      })
    }

    const mockFileHandle2 = {
      name: "category-456.png",
      kind: "file",
      getFile: vi.fn().mockResolvedValue({
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(20)),
        lastModified: 2000
      })
    }

    const mockCardsDir = {
      name: "cards",
      kind: "directory",
      values: async function* () {
        yield mockFileHandle1
      }
    }

    const mockCategoriesDir = {
      name: "categories",
      kind: "directory",
      values: async function* () {
        yield mockFileHandle2
      }
    }

    const mockImagesDir = {
      name: "images",
      kind: "directory",
      getDirectoryHandle: vi.fn().mockImplementation((name) => {
        if (name === "cards") return mockCardsDir
        if (name === "categories") return mockCategoriesDir
      }),
      values: async function* () {
        yield mockCardsDir
        yield mockCategoriesDir
      }
    }

    const mockGetDirectory = vi.fn().mockResolvedValue({
      getDirectoryHandle: vi.fn().mockImplementation((name, _options) => {
        if (name === "images") return mockImagesDir
        throw new Error("Not found")
      })
    })

    vi.stubGlobal("navigator", {
      storage: {
        getDirectory: mockGetDirectory
      }
    })

    await upgradeToVersion16(mockTx)

    expect(mockGetDirectory).toHaveBeenCalled()
    expect(mockSyncStatesTable.bulkAdd).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          filePath: "images/cards/card-123.png",
          cardId: "card-123",
          categoryId: undefined,
          syncStatus: "pending",
          updatedAt: 1000
        }),
        expect.objectContaining({
          filePath: "images/categories/category-456.png",
          cardId: undefined,
          categoryId: "category-456",
          syncStatus: "pending",
          updatedAt: 2000
        })
      ])
    )
  })
})
