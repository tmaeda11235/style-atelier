import { act, renderHook } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../lib/db"
import { useCategoryManager } from "./useCategoryManager"

// Mock dexie-react-hooks
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: any) => fn()
}))

// Mock DB
vi.mock("../lib/db", () => ({
  db: {
    getAllCategories: vi.fn().mockReturnValue([]),
    getAllCards: vi.fn().mockResolvedValue([]),
    getCategory: vi.fn(),
    addCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn()
  }
}))

// Mock ConfirmContext
let mockConfirmResult = true
vi.mock("../contexts/ConfirmContext", () => ({
  useConfirm: () => vi.fn().mockImplementation(async () => mockConfirmResult),
  ConfirmProvider: ({ children }: any) => children
}))

// Mock LanguageContext
vi.mock("../contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: {
      categoryManager: {
        deleteTooltip: "Delete",
        confirmDelete: "Are you sure you want to delete {name}?",
        cancel: "Cancel",
        logDeleted: "Deleted {name}",
        errDeleteFailed: "Failed to delete",
        logUpdated: "Updated {name}",
        errUpdateFailed: "Failed to update",
        alertEnterName: "Please enter a name",
        alertAlreadyExists: "Category already exists",
        logCreated: "Created {name}",
        errAddFailed: "Failed to add"
      }
    }
  }),
  LanguageProvider: ({ children }: any) => children
}))

describe("useCategoryManager", () => {
  const onClose = vi.fn()
  const addLog = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockConfirmResult = true
    vi.mocked(db.getAllCategories).mockReturnValue([])
    vi.mocked(db.getAllCards).mockResolvedValue([])
    vi.mocked(db.getCategory).mockResolvedValue(undefined)
    vi.mocked(db.addCategory).mockResolvedValue("mock-id")
    vi.mocked(db.updateCategory).mockResolvedValue(1)
    vi.mocked(db.deleteCategory).mockResolvedValue(undefined)
  })

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useCategoryManager({ onClose, addLog }))
    expect(result.current.activeTab).toBe("create")
    expect(result.current.name).toBe("")
    expect(result.current.parentId).toBe("")
    expect(result.current.emoji).toBe("")
    expect(result.current.iconUrl).toBe("")
    expect(result.current.isSelectingCard).toBe(false)
  })

  describe("handleEmojiChange", () => {
    it("should handle emoji change and trim to first grapheme", () => {
      const { result } = renderHook(() =>
        useCategoryManager({ onClose, addLog })
      )

      act(() => {
        result.current.handleEmojiChange("🧙‍♂️🚀")
      })
      expect(result.current.emoji).toBe("🧙‍♂️")

      act(() => {
        result.current.handleEmojiChange("")
      })
      expect(result.current.emoji).toBe("")
    })

    it("should fall back to Array.from when Intl.Segmenter is not available", () => {
      const originalSegmenter = Intl.Segmenter
      // Force error in Intl.Segmenter block by deleting it
      Object.defineProperty(global, "Intl", {
        value: { Segmenter: undefined },
        writable: true,
        configurable: true
      })

      try {
        const { result } = renderHook(() =>
          useCategoryManager({ onClose, addLog })
        )

        act(() => {
          result.current.handleEmojiChange("🧙‍♂️🚀")
        })
        // Array.from("🧙‍♂️🚀")[0] will be the first code point (🧙)
        expect(result.current.emoji).toBe("🧙")

        act(() => {
          result.current.handleEmojiChange("")
        })
        expect(result.current.emoji).toBe("")
      } finally {
        Object.defineProperty(global, "Intl", {
          value: { Segmenter: originalSegmenter },
          writable: true,
          configurable: true
        })
      }
    })
  })

  it("should update select card state on handleSelectCard", () => {
    const { result } = renderHook(() => useCategoryManager({ onClose, addLog }))

    act(() => {
      result.current.handleSelectCard("card-123", "thumb-url")
    })

    expect(result.current.iconCardId).toBe("card-123")
    expect(result.current.iconUrl).toBe("thumb-url")
    expect(result.current.isSelectingCard).toBe(false)
  })

  it("should cancel editing and reset state", () => {
    const { result } = renderHook(() => useCategoryManager({ onClose, addLog }))

    const mockCat = {
      id: "test",
      name: "Test Cat",
      iconEmoji: "🎮",
      parentId: "parent-1"
    }
    act(() => {
      result.current.handleStartEdit(mockCat)
    })
    expect(result.current.editingCategory).toEqual(mockCat)
    expect(result.current.name).toBe("Test Cat")
    expect(result.current.parentId).toBe("parent-1")
    expect(result.current.emoji).toBe("🎮")

    act(() => {
      result.current.handleCancelEdit()
    })
    expect(result.current.editingCategory).toBeNull()
    expect(result.current.name).toBe("")
    expect(result.current.parentId).toBe("")
    expect(result.current.emoji).toBe("")
  })

  describe("handleDelete", () => {
    it("should do nothing if confirm is cancelled", async () => {
      mockConfirmResult = false
      const { result } = renderHook(() =>
        useCategoryManager({ onClose, addLog })
      )

      await act(async () => {
        await result.current.handleDelete("cat-1", "My Category")
      })

      expect(db.deleteCategory).not.toHaveBeenCalled()
      expect(addLog).not.toHaveBeenCalled()
    })

    it("should delete category if confirmed", async () => {
      mockConfirmResult = true
      const { result } = renderHook(() =>
        useCategoryManager({ onClose, addLog })
      )

      await act(async () => {
        await result.current.handleDelete("cat-1", "My Category")
      })

      expect(db.deleteCategory).toHaveBeenCalledWith("cat-1")
      expect(addLog).toHaveBeenCalledWith("Deleted My Category")
    })

    it("should alert on error during delete", async () => {
      mockConfirmResult = true
      vi.mocked(db.deleteCategory).mockRejectedValueOnce(
        new Error("Delete failed")
      )
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const { result } = renderHook(() =>
        useCategoryManager({ onClose, addLog })
      )

      await act(async () => {
        await result.current.handleDelete("cat-1", "My Category")
      })

      expect(alertSpy).toHaveBeenCalledWith("Failed to delete")
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to delete category:",
        expect.any(Error)
      )

      alertSpy.mockRestore()
      consoleSpy.mockRestore()
    })
  })

  describe("handleSave", () => {
    it("should alert if name is empty", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})
      const { result } = renderHook(() =>
        useCategoryManager({ onClose, addLog })
      )

      await act(async () => {
        await result.current.handleSave({ preventDefault: vi.fn() } as any)
      })

      expect(alertSpy).toHaveBeenCalledWith("Please enter a name")
      alertSpy.mockRestore()
    })

    describe("new category", () => {
      it("should alert if category already exists", async () => {
        vi.mocked(db.getCategory).mockResolvedValueOnce({
          id: "my-category",
          name: "Existing"
        })
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})

        const { result } = renderHook(() =>
          useCategoryManager({ onClose, addLog })
        )

        act(() => {
          result.current.setName("My Category")
        })

        await act(async () => {
          await result.current.handleSave({ preventDefault: vi.fn() } as any)
        })

        expect(db.getCategory).toHaveBeenCalledWith("my-category")
        expect(alertSpy).toHaveBeenCalledWith("Category already exists")
        alertSpy.mockRestore()
      })

      it("should add category successfully", async () => {
        const { result } = renderHook(() =>
          useCategoryManager({ onClose, addLog })
        )

        act(() => {
          result.current.setName("My Category")
          result.current.setParentId("parent-1")
          result.current.handleEmojiChange("🎨")
        })

        await act(async () => {
          await result.current.handleSave({ preventDefault: vi.fn() } as any)
        })

        expect(db.addCategory).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "my-category",
            name: "My Category",
            iconEmoji: "🎨",
            parentId: "parent-1"
          })
        )
        expect(addLog).toHaveBeenCalledWith("Created My Category")
        expect(onClose).toHaveBeenCalled()
      })

      it("should alert on add category error", async () => {
        vi.mocked(db.addCategory).mockRejectedValueOnce(new Error("Add failed"))
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})
        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {})

        const { result } = renderHook(() =>
          useCategoryManager({ onClose, addLog })
        )

        act(() => {
          result.current.setName("My Category")
        })

        await act(async () => {
          await result.current.handleSave({ preventDefault: vi.fn() } as any)
        })

        expect(alertSpy).toHaveBeenCalledWith("Failed to add")
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to add category:",
          expect.any(Error)
        )

        alertSpy.mockRestore()
        consoleSpy.mockRestore()
      })
    })

    describe("edit category", () => {
      it("should alert if edited ID clashes with another existing category", async () => {
        vi.mocked(db.getCategory).mockResolvedValueOnce({
          id: "other-cat",
          name: "Other"
        })
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})

        const { result } = renderHook(() =>
          useCategoryManager({ onClose, addLog })
        )

        act(() => {
          result.current.handleStartEdit({ id: "my-cat", name: "My Cat" })
          result.current.setName("Other Cat")
        })

        await act(async () => {
          await result.current.handleSave({ preventDefault: vi.fn() } as any)
        })

        expect(db.getCategory).toHaveBeenCalledWith("other-cat")
        expect(alertSpy).toHaveBeenCalledWith("Category already exists")
        alertSpy.mockRestore()
      })

      it("should edit category successfully", async () => {
        const { result } = renderHook(() =>
          useCategoryManager({ onClose, addLog })
        )

        act(() => {
          result.current.handleStartEdit({
            id: "my-cat",
            name: "My Cat",
            parentId: "parent-old"
          })
          result.current.setName("Updated Cat")
          result.current.setParentId("parent-new")
        })

        await act(async () => {
          await result.current.handleSave({ preventDefault: vi.fn() } as any)
        })

        expect(db.updateCategory).toHaveBeenCalledWith("my-cat", {
          name: "Updated Cat",
          iconEmoji: undefined,
          iconUrl: undefined,
          iconCardId: undefined,
          parentId: "parent-new"
        })
        expect(addLog).toHaveBeenCalledWith("Updated Updated Cat")
        expect(result.current.editingCategory).toBeNull()
        expect(result.current.activeTab).toBe("manage")
      })

      it("should alert on edit category error", async () => {
        vi.mocked(db.updateCategory).mockRejectedValueOnce(
          new Error("Update failed")
        )
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})
        const consoleSpy = vi
          .spyOn(console, "error")
          .mockImplementation(() => {})

        const { result } = renderHook(() =>
          useCategoryManager({ onClose, addLog })
        )

        act(() => {
          result.current.handleStartEdit({ id: "my-cat", name: "My Cat" })
          result.current.setName("Updated Cat")
        })

        await act(async () => {
          await result.current.handleSave({ preventDefault: vi.fn() } as any)
        })

        expect(alertSpy).toHaveBeenCalledWith("Failed to update")
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to update category:",
          expect.any(Error)
        )

        alertSpy.mockRestore()
        consoleSpy.mockRestore()
      })
    })
  })
})
