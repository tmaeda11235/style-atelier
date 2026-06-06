import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../lib/db"
import { useEasyModeView } from "./useEasyModeView"

vi.mock("../contexts/ConfirmContext", () => ({
  useConfirm: () => (options: any) =>
    Promise.resolve(window.confirm(options.message))
}))

vi.mock("../lib/db", () => ({
  db: {
    styleCards: {
      put: vi.fn().mockResolvedValue("card-id"),
      update: vi.fn().mockResolvedValue(1),
      clear: vi.fn().mockResolvedValue(undefined)
    },
    historyItems: {
      clear: vi.fn().mockResolvedValue(undefined)
    },
    userSettings: {
      clear: vi.fn().mockResolvedValue(undefined)
    },
    categories: {
      clear: vi.fn().mockResolvedValue(undefined)
    },
    deleteStyleCardAndCleanup: vi.fn().mockResolvedValue(undefined)
  },
  seedDefaultCategories: vi.fn().mockResolvedValue(undefined)
}))

const confirmSpy = vi.spyOn(window, "confirm")

describe("useEasyModeView hook", () => {
  const mockOnToggleEasyMode = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    confirmSpy.mockReset()

    // Mock chrome APIs
    global.chrome = {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 123 }]),
        sendMessage: vi.fn().mockResolvedValue({ status: "success" }),
        reload: vi.fn()
      }
    } as any
  })

  it("should initialize with default states", () => {
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    expect(result.current.activeTab).toBe("library")
    expect(result.current.logs).toEqual([])
    expect(result.current.alertType).toBeNull()
    expect(result.current.activeDetailCard).toBeNull()
  })

  it("should switch tab to settings", () => {
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.setActiveTab("settings")
    })

    expect(result.current.activeTab).toBe("settings")
  })

  it("should call onToggleEasyMode and reset tab to library when toggled", () => {
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.setActiveTab("settings")
    })
    expect(result.current.activeTab).toBe("settings")

    act(() => {
      result.current.handleToggleEasyMode(true)
    })

    expect(mockOnToggleEasyMode).toHaveBeenCalledWith(true)
    expect(result.current.activeTab).toBe("library")
  })

  it("should handle saving card details", async () => {
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    const mockCard = { id: "card-123", name: "Test Card" } as any

    await act(async () => {
      await result.current.handleSaveCardDetails(mockCard)
    })

    expect(db.styleCards.put).toHaveBeenCalledWith(mockCard)
    expect(result.current.logs[0]).toContain("updated successfully")
    expect(result.current.activeDetailCard).toBeNull()
  })

  it("should handle deleting a card", async () => {
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleDeleteCard("card-123")
    })

    expect(db.deleteStyleCardAndCleanup).toHaveBeenCalledWith("card-123")
    expect(result.current.logs[0]).toContain("deleted successfully")
  })

  it("should handle injecting prompt successfully", async () => {
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleInjectPrompt("sunset cyberpunk")
    })

    expect(global.chrome.tabs.query).toHaveBeenCalled()
    expect(global.chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
      type: "INJECT_PROMPT",
      prompt: "sunset cyberpunk"
    })
    expect(result.current.logs[0]).toContain("Sent prompt")
  })

  it("should set alertType to no_input if content script returns error for chat input", async () => {
    global.chrome.tabs.sendMessage = vi.fn().mockResolvedValue({
      status: "error",
      message: "Could not find chat input"
    })

    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleInjectPrompt("sunset cyberpunk")
    })

    expect(result.current.alertType).toBe("no_input")
  })

  it("should clear logs", () => {
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.addLog("test log")
    })
    expect(result.current.logs).toHaveLength(1)

    act(() => {
      result.current.handleClearLogs()
    })
    expect(result.current.logs).toEqual([])
  })
})
