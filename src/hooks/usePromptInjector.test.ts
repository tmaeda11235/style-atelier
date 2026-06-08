import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { StyleCard } from "../lib/db-schema"
import { usePromptInjector } from "./usePromptInjector"

describe("usePromptInjector", () => {
  const mockSetAlertType = vi.fn()
  const mockAddLog = vi.fn()
  const mockSaveSlotHistory = vi.fn().mockResolvedValue(undefined)
  const mockIncrementCardUsage = vi.fn().mockResolvedValue(undefined)

  const mockCard: StyleCard = {
    id: "card-1",
    name: "Photo Card",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [
      { type: "text", value: "a photo of" },
      { type: "slot", label: "Subject", default: "cat" }
    ],
    parameters: { ar: "16:9" },
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Common",
    isFavorite: false,
    isPinned: true,
    usageCount: 0,
    tags: ["photo"],
    dominantColor: "#ffffff",
    thumbnailData: "",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("injects prompt successfully, increments usage, and saves history", async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([{ id: 1 }] as any)
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({ status: "success" })

    const { result } = renderHook(() =>
      usePromptInjector({
        workbenchCards: [mockCard],
        slotHistory: {},
        saveSlotHistory: mockSaveSlotHistory,
        incrementCardUsage: mockIncrementCardUsage,
        setAlertType: mockSetAlertType,
        addLog: mockAddLog
      })
    )

    let injectPromise!: Promise<void>
    act(() => {
      injectPromise = result.current.injectPrompt(
        mockCard.promptSegments,
        mockCard.parameters,
        { Subject: "neon cat" }
      )
    })

    expect(result.current.isInjecting).toBe(true)

    await act(async () => {
      await injectPromise
    })

    expect(result.current.isInjecting).toBe(false)
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: "INJECT_PROMPT",
      prompt: "a photo of, neon cat --ar 16:9"
    })
    expect(mockIncrementCardUsage).toHaveBeenCalledWith("card-1")
    expect(mockSaveSlotHistory).toHaveBeenCalledWith("Subject", ["neon cat"])
    expect(mockAddLog).toHaveBeenCalledWith("Prompt injected successfully!")
  })

  it("sets alert to disconnected if tab querying fails", async () => {
    vi.mocked(chrome.tabs.query).mockRejectedValue(new Error("query failed"))

    const { result } = renderHook(() =>
      usePromptInjector({
        workbenchCards: [mockCard],
        slotHistory: {},
        saveSlotHistory: mockSaveSlotHistory,
        incrementCardUsage: mockIncrementCardUsage,
        setAlertType: mockSetAlertType,
        addLog: mockAddLog
      })
    )

    await act(async () => {
      await result.current.injectPrompt(
        mockCard.promptSegments,
        mockCard.parameters,
        { Subject: "neon cat" }
      )
    })

    expect(mockSetAlertType).toHaveBeenCalledWith("disconnected")
  })
})
