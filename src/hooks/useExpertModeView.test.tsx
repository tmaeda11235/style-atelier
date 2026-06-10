import { act, renderHook } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TutorialProvider } from "../contexts/TutorialContext"
import { db } from "../lib/db"
import { useExpertModeView } from "./useExpertModeView"

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

describe("useExpertModeView hook", () => {
  const mockOnToggleEasyMode = vi.fn()
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TutorialProvider>{children}</TutorialProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
    confirmSpy.mockReset()
    localStorage.clear()

    // Mock chrome APIs
    vi.mocked(chrome.tabs.query).mockResolvedValue([{ id: 123 }] as any)
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({ status: "success" })
  })

  it("should initialize with default states and check onboarding status", () => {
    const { result } = renderHook(
      () =>
        useExpertModeView({
          isEasyMode: false,
          onToggleEasyMode: mockOnToggleEasyMode
        }),
      { wrapper }
    )

    expect(result.current.activeTab).toBe("history")
    expect(result.current.logs).toEqual([])
    expect(result.current.alertType).toBeNull()
    expect(result.current.activeDetailCard).toBeNull()
    expect(result.current.showWelcome).toBe(true)
  })

  it("should start tutorial and transition tab to history", () => {
    const { result } = renderHook(
      () =>
        useExpertModeView({
          isEasyMode: false,
          onToggleEasyMode: mockOnToggleEasyMode
        }),
      { wrapper }
    )

    act(() => {
      result.current.handleStartTutorial()
    })

    expect(localStorage.getItem("style-atelier-onboarding-seen")).toBe("true")
    expect(result.current.showWelcome).toBe(false)
    expect(result.current.activeTab).toBe("history")
  })

  it("should skip tutorial and save seen status", () => {
    const { result } = renderHook(
      () =>
        useExpertModeView({
          isEasyMode: false,
          onToggleEasyMode: mockOnToggleEasyMode
        }),
      { wrapper }
    )

    act(() => {
      result.current.handleSkipTutorial()
    })

    expect(localStorage.getItem("style-atelier-onboarding-seen")).toBe("true")
    expect(result.current.showWelcome).toBe(false)
  })

  it("should handle toggling Easy Mode", () => {
    const { result } = renderHook(
      () =>
        useExpertModeView({
          isEasyMode: false,
          onToggleEasyMode: mockOnToggleEasyMode
        }),
      { wrapper }
    )

    act(() => {
      result.current.handleToggleEasyMode(true)
    })

    expect(mockOnToggleEasyMode).toHaveBeenCalledWith(true)
  })

  it("should handle starting tutorial via guide", () => {
    const { result } = renderHook(
      () =>
        useExpertModeView({
          isEasyMode: false,
          onToggleEasyMode: mockOnToggleEasyMode
        }),
      { wrapper }
    )

    act(() => {
      result.current.handleOpenGuide()
    })

    expect(result.current.activeTab).toBe("history")
  })

  it("should handle saving card details", async () => {
    const { result } = renderHook(
      () =>
        useExpertModeView({
          isEasyMode: false,
          onToggleEasyMode: mockOnToggleEasyMode
        }),
      { wrapper }
    )
    const mockCard = { id: "card-123", name: "Test Card" } as any

    await act(async () => {
      await result.current.handleSaveCardDetails(mockCard)
    })

    expect(db.styleCards.put).toHaveBeenCalledWith(mockCard)
    expect(result.current.logs[0]).toContain("updated successfully")
  })

  it("should handle deleting a card", async () => {
    const { result } = renderHook(
      () =>
        useExpertModeView({
          isEasyMode: false,
          onToggleEasyMode: mockOnToggleEasyMode
        }),
      { wrapper }
    )

    await act(async () => {
      await result.current.handleDeleteCard("card-123")
    })

    expect(db.deleteStyleCardAndCleanup).toHaveBeenCalledWith("card-123")
    expect(result.current.logs[0]).toContain("deleted successfully")
  })

  it("should clear logs", () => {
    const { result } = renderHook(
      () =>
        useExpertModeView({
          isEasyMode: false,
          onToggleEasyMode: mockOnToggleEasyMode
        }),
      { wrapper }
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
    const { result } = renderHook(
      () =>
        useExpertModeView({
          isEasyMode: false,
          onToggleEasyMode: mockOnToggleEasyMode
        }),
      { wrapper }
    )
    confirmSpy.mockReturnValue(true)

    await act(async () => {
      await result.current.handleResetDb()
    })

    expect(db.styleCards.clear).toHaveBeenCalled()
    expect(result.current.logs[0]).toContain("All data cleared")
  })

  it("should handle retry connection", () => {
    vi.mocked(chrome.tabs.reload).mockImplementation(() => undefined)
    const { result } = renderHook(
      () =>
        useExpertModeView({
          isEasyMode: false,
          onToggleEasyMode: mockOnToggleEasyMode
        }),
      { wrapper }
    )
    act(() => {
      result.current.setAlertType("disconnected")
    })
    act(() => {
      result.current.handleRetryConnection()
    })
    expect(chrome.tabs.reload).toHaveBeenCalled()
    expect(result.current.alertType).toBeNull()
  })

  it("should dismiss alert", () => {
    const { result } = renderHook(
      () =>
        useExpertModeView({
          isEasyMode: false,
          onToggleEasyMode: mockOnToggleEasyMode
        }),
      { wrapper }
    )
    act(() => {
      result.current.setAlertType("disconnected")
    })
    act(() => {
      result.current.handleDismissAlert()
    })
    expect(result.current.alertType).toBeNull()
  })

  it("should handle inject prompt successfully", async () => {
    const { result } = renderHook(
      () =>
        useExpertModeView({
          isEasyMode: false,
          onToggleEasyMode: mockOnToggleEasyMode
        }),
      { wrapper }
    )
    await act(async () => {
      await result.current.handleInjectPrompt("sunset")
    })
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
      type: "INJECT_PROMPT",
      prompt: "sunset"
    })
  })

  it("should handle handleDrop with import", async () => {
    const { result } = renderHook(
      () =>
        useExpertModeView({
          isEasyMode: false,
          onToggleEasyMode: mockOnToggleEasyMode
        }),
      { wrapper }
    )
    await act(async () => {
      const e = { preventDefault: vi.fn(), dataTransfer: { files: [] } } as any
    })
  })
})
