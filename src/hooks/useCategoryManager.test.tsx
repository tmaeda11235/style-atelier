import { act, renderHook } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ConfirmProvider } from "../contexts/ConfirmContext"
import { LanguageProvider } from "../contexts/LanguageContext"
import { db } from "../lib/db"
import { useCategoryManager } from "./useCategoryManager"

// Mock dexie-react-hooks
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: any) => fn()
}))

// Mock DB
vi.mock("../lib/db", () => ({
  db: {
    getAllCategories: vi.fn(() => []),
    getAllCards: vi.fn(() => []),
    getCategory: vi.fn(),
    addCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn()
  }
}))

describe("useCategoryManager", () => {
  const onClose = vi.fn()
  const addLog = vi.fn()

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <LanguageProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </LanguageProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.getAllCategories).mockReturnValue([])
    vi.mocked(db.getAllCards).mockResolvedValue([])
  })

  it("should initialize with default values", () => {
    const { result } = renderHook(
      () => useCategoryManager({ onClose, addLog }),
      { wrapper }
    )
    expect(result.current.activeTab).toBe("create")
    expect(result.current.name).toBe("")
    expect(result.current.emoji).toBe("")
    expect(result.current.iconUrl).toBe("")
    expect(result.current.isSelectingCard).toBe(false)
  })

  it("should handle emoji change and trim to first grapheme", () => {
    const { result } = renderHook(
      () => useCategoryManager({ onClose, addLog }),
      { wrapper }
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

  it("should cancel editing and reset state", () => {
    const { result } = renderHook(
      () => useCategoryManager({ onClose, addLog }),
      { wrapper }
    )

    const mockCat = { id: "test", name: "Test Cat", iconEmoji: "🎮" }
    act(() => {
      result.current.handleStartEdit(mockCat)
    })
    expect(result.current.editingCategory).toEqual(mockCat)
    expect(result.current.name).toBe("Test Cat")
    expect(result.current.emoji).toBe("🎮")

    act(() => {
      result.current.handleCancelEdit()
    })
    expect(result.current.editingCategory).toBeNull()
    expect(result.current.name).toBe("")
    expect(result.current.emoji).toBe("")
  })
})
