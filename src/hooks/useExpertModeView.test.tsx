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
    global.chrome = {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 123 }]),
        sendMessage: vi.fn().mockResolvedValue({ status: "success" }),
        reload: vi.fn()
      }
    } as any
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
})
