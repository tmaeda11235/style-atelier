import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { db, seedDefaultCategories } from "../lib/db"
import { useDragAndDrop } from "./useDragAndDrop"
import { useExpertModeView } from "./useExpertModeView"
import { useMinting } from "./useMinting"

const mockStartTutorial = vi.fn()
const mockAdvanceIfStep = vi.fn()

vi.mock("../contexts/TutorialContext", () => ({
  useTutorial: () => ({
    startTutorial: mockStartTutorial,
    advanceIfStep: mockAdvanceIfStep
  })
}))

vi.mock("../contexts/ConfirmContext", () => ({
  useConfirm: () => (options: any) =>
    Promise.resolve(window.confirm(options.message))
}))

vi.mock("../lib/db", () => ({
  db: {
    styleCards: {
      put: vi.fn().mockResolvedValue("card-id"),
      update: vi.fn().mockResolvedValue(1),
      clear: vi.fn().mockResolvedValue(undefined),
      filter: vi.fn()
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
    deleteStyleCardAndCleanup: vi.fn().mockResolvedValue(undefined),
    updateCard: vi.fn().mockResolvedValue(1)
  },
  seedDefaultCategories: vi.fn().mockResolvedValue(undefined)
}))

vi.mock("./useDragAndDrop", () => ({
  useDragAndDrop: vi.fn()
}))

vi.mock("./useMinting", () => ({
  useMinting: vi.fn()
}))

const confirmSpy = vi.spyOn(window, "confirm")

describe("useExpertModeView hook", () => {
  const mockOnToggleEasyMode = vi.fn()
  const mockDragDrop = {
    isDragging: false,
    isDraggingFile: false,
    isImporting: false,
    droppedItem: null,
    handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDrop: vi.fn()
  }

  const mockMinting = {
    handleStartMinting: vi.fn(),
    isMinting: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    confirmSpy.mockReset()
    localStorage.clear()

    vi.mocked(useDragAndDrop).mockReturnValue(mockDragDrop)
    vi.mocked(useMinting).mockReturnValue(mockMinting as any)

    // Mock chrome APIs
    vi.mocked(chrome.tabs.query).mockResolvedValue([{ id: 123 }] as any)
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({ status: "success" })
  })

  it("should initialize with default states and check onboarding status if not seen", () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    expect(result.current.activeTab).toBe("history")
    expect(result.current.logs).toEqual([])
    expect(result.current.alertType).toBeNull()
    expect(result.current.activeDetailCard).toBeNull()
    expect(result.current.showWelcome).toBe(true)
  })

  it("should initialize and not show welcome if onboarding seen", () => {
    localStorage.setItem("style-atelier-onboarding-seen", "true")
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )
    expect(result.current.showWelcome).toBe(false)
  })

  it("should start tutorial and transition tab to history", () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.handleStartTutorial()
    })

    expect(localStorage.getItem("style-atelier-onboarding-seen")).toBe("true")
    expect(result.current.showWelcome).toBe(false)
    expect(result.current.activeTab).toBe("history")
    expect(mockStartTutorial).toHaveBeenCalled()
  })

  it("should skip tutorial and save seen status", () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.handleSkipTutorial()
    })

    expect(localStorage.getItem("style-atelier-onboarding-seen")).toBe("true")
    expect(result.current.showWelcome).toBe(false)
  })

  it("should handle toggling Easy Mode to true", () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.handleToggleEasyMode(true)
    })

    expect(mockOnToggleEasyMode).toHaveBeenCalledWith(true)
    expect(result.current.activeTab).toBe("library")
  })

  it("should handle toggling Easy Mode to false", () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.setActiveTab("workbench")
    })

    act(() => {
      result.current.handleToggleEasyMode(false)
    })

    expect(mockOnToggleEasyMode).toHaveBeenCalledWith(false)
    expect(result.current.activeTab).toBe("workbench")
  })

  it("should handle starting tutorial via guide", () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.handleOpenGuide()
    })

    expect(result.current.activeTab).toBe("history")
    expect(mockStartTutorial).toHaveBeenCalled()
  })

  it("should handle saving card details successfully", async () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
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

  it("should handle error when saving card details fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})
    vi.mocked(db.styleCards.put).mockRejectedValue(new Error("DB error"))
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )
    const mockCard = { id: "card-123", name: "Test Card" } as any

    await act(async () => {
      await result.current.handleSaveCardDetails(mockCard)
    })

    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(result.current.logs[0]).toContain(
      "Error: Failed to save style card updates."
    )
    consoleErrorSpy.mockRestore()
  })

  it("should handle deleting a card successfully", async () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleDeleteCard("card-123")
    })

    expect(db.deleteStyleCardAndCleanup).toHaveBeenCalledWith("card-123")
    expect(result.current.logs[0]).toContain("deleted successfully")
    expect(result.current.activeDetailCard).toBeNull()
  })

  it("should handle error when deleting card fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})
    vi.mocked(db.deleteStyleCardAndCleanup).mockRejectedValue(
      new Error("Delete error")
    )
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleDeleteCard("card-123")
    })

    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(result.current.logs[0]).toContain(
      "Error: Failed to delete style card."
    )
    consoleErrorSpy.mockRestore()
  })

  it("should handle sending to workbench when card is already pinned", async () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    const mockCard = { id: "card-123", isPinned: true } as any
    await act(async () => {
      await result.current.handleSendToWorkbench(mockCard)
    })

    expect(result.current.activeDetailCard).toBeNull()
    expect(result.current.activeTab).toBe("workbench")
    expect(db.updateCard).not.toHaveBeenCalled()
  })

  it("should handle sending to workbench when hand is full (>= 5 pinned)", async () => {
    const mockCount = vi.fn().mockResolvedValue(5)
    db.styleCards.filter = vi.fn().mockReturnValue({ count: mockCount })

    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    const mockCard = { id: "card-123", isPinned: false } as any
    await act(async () => {
      await result.current.handleSendToWorkbench(mockCard)
    })

    expect(result.current.alertType).toBe("hand_full")
    expect(db.updateCard).not.toHaveBeenCalled()
  })

  it("should handle sending to workbench successfully (< 5 pinned)", async () => {
    const mockCount = vi.fn().mockResolvedValue(2)
    db.styleCards.filter = vi.fn().mockReturnValue({ count: mockCount })

    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    const mockCard = {
      id: "card-123",
      name: "Cyberpunk",
      isPinned: false,
      usageCount: 2
    } as any
    await act(async () => {
      await result.current.handleSendToWorkbench(mockCard)
    })

    expect(db.updateCard).toHaveBeenCalledWith("card-123", {
      isPinned: true,
      usageCount: 3
    })
    expect(result.current.logs[0]).toContain("Added Cyberpunk to Workbench.")
    expect(result.current.activeDetailCard).toBeNull()
    expect(result.current.activeTab).toBe("workbench")
  })

  it("should handle error when updating card for workbench fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})
    const mockCount = vi.fn().mockResolvedValue(2)
    db.styleCards.filter = vi.fn().mockReturnValue({ count: mockCount })
    vi.mocked(db.updateCard).mockRejectedValue(new Error("Update fails"))

    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    const mockCard = { id: "card-123", isPinned: false } as any
    await act(async () => {
      await result.current.handleSendToWorkbench(mockCard)
    })

    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(result.current.logs[0]).toContain(
      "Error: Failed to send card to workbench."
    )
    consoleErrorSpy.mockRestore()
  })

  it("should handle injecting prompt successfully", async () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleInjectPrompt("sunset cyberpunk")
    })

    expect(chrome.tabs.query).toHaveBeenCalled()
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
      type: "INJECT_PROMPT",
      prompt: "sunset cyberpunk"
    })
    expect(result.current.logs[0]).toContain("Sent prompt")
  })

  it("should set alertType to no_input if content script returns error for chat input", async () => {
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({
      status: "error",
      message: "Could not find chat input"
    })

    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleInjectPrompt("sunset cyberpunk")
    })

    expect(result.current.alertType).toBe("no_input")
  })

  it("should set alertType to disconnected if content script returns error other than chat input", async () => {
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({
      status: "error",
      message: "Some other error"
    })

    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleInjectPrompt("sunset")
    })

    expect(result.current.alertType).toBe("disconnected")
  })

  it("should handle inject prompt successfully with activeDetailCard and update usage count", async () => {
    vi.mocked(db.styleCards.update).mockResolvedValue(1)
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.setActiveDetailCard({
        id: "card-123",
        usageCount: 5
      } as any)
    })

    await act(async () => {
      await result.current.handleInjectPrompt("sunset")
    })

    expect(db.styleCards.update).toHaveBeenCalledWith("card-123", {
      usageCount: 6
    })
  })

  it("should log console error when update usage count fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})
    vi.mocked(db.styleCards.update).mockRejectedValue(new Error("Update Error"))
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.setActiveDetailCard({
        id: "card-123",
        usageCount: 5
      } as any)
    })

    await act(async () => {
      await result.current.handleInjectPrompt("sunset")
    })

    // Wait for async update catch
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to update usage count on details inject:",
      expect.any(Error)
    )
    consoleErrorSpy.mockRestore()
  })

  it("should handle inject prompt error (e.g. query fails)", async () => {
    vi.mocked(chrome.tabs.query).mockRejectedValue(new Error("Connection fail"))
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )
    await act(async () => {
      await result.current.handleInjectPrompt("sunset")
    })
    expect(result.current.alertType).toBe("disconnected")
  })

  it("should handle handleDrop with import", async () => {
    const mockDropEvent = { preventDefault: vi.fn() } as any
    mockDragDrop.handleDrop.mockResolvedValue({ isImport: true })

    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.setActiveTab("settings")
    })

    await act(async () => {
      await result.current.handleDrop(mockDropEvent)
    })

    expect(mockDragDrop.handleDrop).toHaveBeenCalledWith(mockDropEvent)
    expect(result.current.activeTab).toBe("library")
  })

  it("should handle handleDrop with non-import", async () => {
    const mockDropEvent = { preventDefault: vi.fn() } as any
    mockDragDrop.handleDrop.mockResolvedValue({ isImport: false })

    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleDrop(mockDropEvent)
    })

    expect(mockAdvanceIfStep).toHaveBeenCalledWith("drop-history")
  })

  it("should do nothing in handleDrop if rawHandleDrop returns null", async () => {
    const mockDropEvent = { preventDefault: vi.fn() } as any
    mockDragDrop.handleDrop.mockResolvedValue(null)

    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleDrop(mockDropEvent)
    })

    expect(mockAdvanceIfStep).not.toHaveBeenCalled()
  })

  it("should handle start minting", () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.handleStartMinting({ id: "item-123" })
    })

    expect(mockMinting.handleStartMinting).toHaveBeenCalledWith({
      id: "item-123"
    })
    expect(mockAdvanceIfStep).toHaveBeenCalledWith("mint-button")
  })

  it("should clear logs", () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
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

  it("should handle Reset DB when confirmed", async () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )
    confirmSpy.mockReturnValue(true)

    await act(async () => {
      await result.current.handleResetDb()
    })

    expect(db.styleCards.clear).toHaveBeenCalled()
    expect(db.historyItems.clear).toHaveBeenCalled()
    expect(seedDefaultCategories).toHaveBeenCalled()
    expect(localStorage.getItem("style-atelier-onboarding-seen")).toBeNull()
    expect(result.current.logs[0]).toContain("All data cleared")
  })

  it("should handle Reset DB when cancelled", async () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )
    confirmSpy.mockReturnValue(false)

    await act(async () => {
      await result.current.handleResetDb()
    })

    expect(db.styleCards.clear).not.toHaveBeenCalled()
  })

  it("should handle retry connection", () => {
    vi.mocked(chrome.tabs.reload).mockImplementation(() => undefined)
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )
    act(() => {
      result.current.setAlertType("disconnected")
    })
    expect(result.current.alertType).toBe("disconnected")
    act(() => {
      result.current.handleRetryConnection()
    })
    expect(chrome.tabs.reload).toHaveBeenCalled()
    expect(result.current.alertType).toBeNull()
  })

  it("should dismiss alert", () => {
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )
    act(() => {
      result.current.setAlertType("disconnected")
    })
    expect(result.current.alertType).toBe("disconnected")
    act(() => {
      result.current.handleDismissAlert()
    })
    expect(result.current.alertType).toBeNull()
  })

  it("should handle open Midjourney tab query fails or empty", () => {
    const windowOpenSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null)
    const originalChrome = global.chrome
    // Temporarily delete chrome.tabs to fallback
    global.chrome = { ...originalChrome, tabs: undefined } as any

    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.handleOpenMidjourney()
    })

    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://www.midjourney.com/imagine",
      "_blank"
    )
    global.chrome = originalChrome
    windowOpenSpy.mockRestore()
  })

  it("should handle open Midjourney with chrome tabs successfully", () => {
    vi.mocked(chrome.tabs.query).mockImplementation(((
      queryObj: any,
      callback: any
    ) => {
      callback([{ id: 123 }])
    }) as any)

    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.handleOpenMidjourney()
    })

    expect(chrome.tabs.update).toHaveBeenCalledWith(123, {
      url: "https://www.midjourney.com/imagine"
    })
  })

  it("should do nothing in open Midjourney if tabs list is empty", () => {
    vi.mocked(chrome.tabs.query).mockImplementation(((
      queryObj: any,
      callback: any
    ) => {
      callback([])
    }) as any)

    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.handleOpenMidjourney()
    })

    expect(chrome.tabs.update).not.toHaveBeenCalled()
  })

  it("should set alertType to disconnected when active tab query returns empty list", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([] as any)
    const { result } = renderHook(() =>
      useExpertModeView({
        isEasyMode: false,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )
    await act(async () => {
      await result.current.handleInjectPrompt("sunset")
    })
    expect(result.current.alertType).toBe("disconnected")
  })
})
