import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { db, seedDefaultCategories } from "../lib/db"
import { useDragAndDrop } from "./useDragAndDrop"
import { useEasyModeView } from "./useEasyModeView"
import { useMinting } from "./useMinting"

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
    deleteStyleCardAndCleanup: vi.fn().mockResolvedValue(undefined),
    getCardByJobId: vi.fn().mockResolvedValue(null)
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

describe("useEasyModeView hook", () => {
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

  let mintingCallback: (tab: string) => void
  const mockMinting = {
    handleStartMinting: vi.fn(),
    isMinting: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    confirmSpy.mockReset()

    vi.mocked(useDragAndDrop).mockReturnValue(mockDragDrop)
    vi.mocked(useMinting).mockImplementation((addLog, onMintFinished) => {
      mintingCallback = onMintFinished
      return mockMinting as any
    })

    // Mock chrome APIs
    vi.mocked(chrome.tabs.query).mockResolvedValue([{ id: 123 }] as any)
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({ status: "success" })
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

  it("should not switch tab to library if handleToggleEasyMode is called with false", () => {
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.setActiveTab("settings")
    })

    act(() => {
      result.current.handleToggleEasyMode(false)
    })

    expect(mockOnToggleEasyMode).toHaveBeenCalledWith(false)
    expect(result.current.activeTab).toBe("settings")
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

  it("should handle error when saving card details fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})
    vi.mocked(db.styleCards.put).mockRejectedValue(new Error("DB Error"))
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleSaveCardDetails({ id: "1" } as any)
    })

    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(result.current.logs[0]).toContain(
      "Error: Failed to save style card updates."
    )
    consoleErrorSpy.mockRestore()
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

  it("should handle error when deleting card fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})
    vi.mocked(db.deleteStyleCardAndCleanup).mockRejectedValue(
      new Error("DB Error")
    )
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleDeleteCard("1")
    })

    expect(consoleErrorSpy).toHaveBeenCalled()
    expect(result.current.logs[0]).toContain(
      "Error: Failed to delete style card."
    )
    consoleErrorSpy.mockRestore()
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

  it("should set alertType to disconnected if content script returns error other than chat input", async () => {
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({
      status: "error",
      message: "Some other error"
    })

    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
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
      useEasyModeView({
        isEasyMode: true,
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
    expect(result.current.logs[0]).toContain("Sent prompt")
  })

  it("should log console error when update usage count fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})
    vi.mocked(db.styleCards.update).mockRejectedValue(new Error("Update Error"))
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
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
      useEasyModeView({
        isEasyMode: true,
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
      useEasyModeView({
        isEasyMode: true,
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

  it("should handle handleDrop with non-import and existing card", async () => {
    const mockDropEvent = { preventDefault: vi.fn() } as any
    mockDragDrop.handleDrop.mockResolvedValue({
      isImport: false,
      id: "job-123"
    })
    vi.mocked(db.getCardByJobId).mockResolvedValue({ id: "card-123" } as any)

    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleDrop(mockDropEvent)
    })

    expect(db.getCardByJobId).toHaveBeenCalledWith("job-123")
    expect(mockMinting.handleStartMinting).not.toHaveBeenCalled()
  })

  it("should handle handleDrop with non-import and non-existing card", async () => {
    const mockDropEvent = { preventDefault: vi.fn() } as any
    mockDragDrop.handleDrop.mockResolvedValue({
      isImport: false,
      id: "job-123"
    })
    vi.mocked(db.getCardByJobId).mockResolvedValue(null)

    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleDrop(mockDropEvent)
    })

    expect(db.getCardByJobId).toHaveBeenCalledWith("job-123")
    expect(mockMinting.handleStartMinting).toHaveBeenCalledWith({
      isImport: false,
      id: "job-123"
    })
  })

  it("should do nothing in handleDrop if rawHandleDrop returns null", async () => {
    const mockDropEvent = { preventDefault: vi.fn() } as any
    mockDragDrop.handleDrop.mockResolvedValue(null)

    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    await act(async () => {
      await result.current.handleDrop(mockDropEvent)
    })

    expect(db.getCardByJobId).not.toHaveBeenCalled()
  })

  it("should handle minting finish callback and update activeTab when tab is library", () => {
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
      mintingCallback("library")
    })
    expect(result.current.activeTab).toBe("library")
  })

  it("should not change activeTab when minting finish callback is called with other than library", () => {
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )

    act(() => {
      result.current.setActiveTab("settings")
    })
    act(() => {
      mintingCallback("settings")
    })
    expect(result.current.activeTab).toBe("settings")
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

  it("should handle Reset DB when confirmed", async () => {
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )
    confirmSpy.mockReturnValue(true)

    await act(async () => {
      await result.current.handleResetDb()
    })

    expect(db.styleCards.clear).toHaveBeenCalled()
    expect(db.historyItems.clear).toHaveBeenCalled()
    expect(result.current.logs[0]).toContain("All data cleared")
  })

  it("should handle Reset DB when cancelled", async () => {
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
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
      useEasyModeView({
        isEasyMode: true,
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
      useEasyModeView({
        isEasyMode: true,
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

  it("should set alertType to disconnected when active tab query returns empty list", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([] as any)
    const { result } = renderHook(() =>
      useEasyModeView({
        isEasyMode: true,
        onToggleEasyMode: mockOnToggleEasyMode
      })
    )
    await act(async () => {
      await result.current.handleInjectPrompt("sunset")
    })
    expect(result.current.alertType).toBe("disconnected")
  })
})
