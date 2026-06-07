import {
  fireEvent,
  screen,
  render as tlRender,
  waitFor
} from "@testing-library/react"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SettingsProvider } from "../../contexts/SettingsContext"
import { useEvolution } from "../../hooks/useEvolution"
import { useWorkbench } from "../../hooks/useWorkbench"
import { db } from "../../lib/db"
import type { StyleCard } from "../../lib/db-schema"
import { Workbench } from "./Workbench"

const render = (ui: React.ReactElement, options?: any) => {
  return tlRender(ui, { wrapper: SettingsProvider, ...options })
}

vi.mock("../../hooks/useWorkbench", () => ({
  useWorkbench: vi.fn()
}))

vi.mock("../../hooks/useEvolution", () => ({
  useEvolution: vi.fn()
}))

vi.mock("../../lib/db", () => ({
  db: {
    styleCards: {
      add: vi.fn(),
      update: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
      toArray: vi.fn().mockResolvedValue([])
    },
    categories: {
      toArray: vi.fn().mockResolvedValue([])
    },
    addCard: vi.fn(),
    updateCard: vi.fn().mockResolvedValue(1),
    deleteCard: vi.fn().mockResolvedValue(1),
    getCard: vi.fn().mockResolvedValue(null),
    getAllCards: vi.fn().mockResolvedValue([]),
    getAllCategories: vi.fn().mockResolvedValue([]),
    transaction: vi.fn((mode, tables, cb) => cb())
  }
}))

describe("Workbench", () => {
  const mockSetAlertType = vi.fn()
  const mockAddLog = vi.fn()

  const mockTargetCard: StyleCard = {
    id: "card-1",
    name: "Photo Template",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [
      { type: "text", value: "a photo of" },
      { type: "slot", label: "Subject", default: "dog" },
      { type: "text", value: "in" },
      { type: "slot", label: "Style", default: "sunset" }
    ],
    parameters: { ar: "16:9" },
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Rare",
    isFavorite: false,
    isPinned: true,
    usageCount: 5,
    tags: ["photo"],
    dominantColor: "#ff0000",
    thumbnailData: "data:image/png;base64,abc",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] }
  }

  const mockHandCard: StyleCard = {
    id: "card-hand-1",
    name: "cyberpunk cat",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [{ type: "text", value: "cyberpunk cat" }],
    parameters: {},
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Common",
    isFavorite: false,
    isPinned: true,
    usageCount: 0,
    tags: ["cat"],
    dominantColor: "#00ff00",
    thumbnailData: "",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(useEvolution).mockReturnValue({
      canEvolve: vi.fn().mockReturnValue(false),
      evolveCard: vi.fn(),
      createVariation: vi.fn(),
      getNextTier: vi.fn().mockReturnValue("Epic")
    })

    vi.mocked(chrome.tabs.query).mockResolvedValue([{ id: 1 }] as any)
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({ status: "success" })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renders empty state when no cards in workbench", () => {
    vi.mocked(useWorkbench).mockReturnValue({
      workbenchCards: [],
      handCards: [],
      selectedCardIds: [],
      toggleCardSelection: vi.fn(),
      clearWorkbench: vi.fn(),
      mergedPrompt: ""
    })

    render(<Workbench setAlertType={mockSetAlertType} addLog={mockAddLog} />)
    expect(screen.getByText("Workbench は空です")).toBeDefined()
  })

  it("renders card segments and slot variable inputs when card has slots", async () => {
    vi.mocked(useWorkbench).mockReturnValue({
      workbenchCards: [mockTargetCard],
      handCards: [mockHandCard],
      selectedCardIds: ["card-1"],
      toggleCardSelection: vi.fn(),
      clearWorkbench: vi.fn(),
      mergedPrompt: ""
    })

    render(<Workbench setAlertType={mockSetAlertType} addLog={mockAddLog} />)

    // Check headings and bubbles
    expect(screen.getByText("Slot Variables")).toBeDefined()
    expect(screen.getAllByText("Subject")).toBeDefined()
    expect(screen.getAllByText("Style")).toBeDefined()

    // Verify input fields are rendered with default values
    const subjectInput = screen.getByPlaceholderText("dog") as HTMLInputElement
    const styleInput = screen.getByPlaceholderText("sunset") as HTMLInputElement

    expect(subjectInput.value).toBe("dog")
    expect(styleInput.value).toBe("sunset")

    // First input should be focused automatically
    await waitFor(() => {
      expect(document.activeElement).toBe(subjectInput)
    })
  })

  it("replaces slot values in prompt and persists to history on injection success", async () => {
    vi.mocked(useWorkbench).mockReturnValue({
      workbenchCards: [mockTargetCard],
      handCards: [],
      selectedCardIds: ["card-1"],
      toggleCardSelection: vi.fn(),
      clearWorkbench: vi.fn(),
      mergedPrompt: ""
    })

    render(<Workbench setAlertType={mockSetAlertType} addLog={mockAddLog} />)

    const subjectInput = screen.getByPlaceholderText("dog") as HTMLInputElement
    const styleInput = screen.getByPlaceholderText("sunset") as HTMLInputElement

    // Modify values
    fireEvent.change(subjectInput, { target: { value: "neon tiger" } })
    fireEvent.change(styleInput, { target: { value: "neon rain" } })

    const injectButton = screen.getByText("Try on Midjourney")
    fireEvent.click(injectButton)

    await waitFor(() => {
      // Check message sent to Chrome contains resolved slots
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          type: "INJECT_PROMPT",
          prompt: "a photo of, neon tiger, in, neon rain --ar 16:9"
        })
      )
      // Check that usageCount was incremented
      expect(db.updateCard).toHaveBeenCalledWith("card-1", {
        usageCount: 6
      })
    })

    // Check value is saved to localStorage history
    const history = JSON.parse(
      localStorage.getItem("style_atelier_slot_history") || "{}"
    )
    expect(history.Subject).toContain("neon tiger")
    expect(history.Style).toContain("neon rain")
  })

  it("sends slot value directly to Workbench when clicking pin button", async () => {
    vi.mocked(useWorkbench).mockReturnValue({
      workbenchCards: [mockTargetCard],
      handCards: [],
      selectedCardIds: ["card-1"],
      toggleCardSelection: vi.fn(),
      clearWorkbench: vi.fn(),
      mergedPrompt: ""
    })

    render(<Workbench setAlertType={mockSetAlertType} addLog={mockAddLog} />)

    const subjectInput = screen.getByPlaceholderText("dog") as HTMLInputElement
    fireEvent.change(subjectInput, { target: { value: "steampunk dragon" } })

    // The pin button next to Subject input
    const pinButtons = screen.getAllByTitle("Send to Workbench")
    fireEvent.click(pinButtons[0])

    await waitFor(() => {
      expect(db.addCard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "steampunk dragon",
          isPinned: true,
          isVariable: true,
          promptSegments: [{ type: "text", value: "steampunk dragon" }],
          tags: ["subject"]
        })
      )
      expect(mockAddLog).toHaveBeenCalledWith(
        expect.stringContaining('Sent "steampunk dragon" to Workbench')
      )
    })
  })

  it("allows filling slot variables from Hand cards", async () => {
    vi.mocked(useWorkbench).mockReturnValue({
      workbenchCards: [mockTargetCard],
      handCards: [mockHandCard],
      selectedCardIds: ["card-1"],
      toggleCardSelection: vi.fn(),
      clearWorkbench: vi.fn(),
      mergedPrompt: ""
    })

    render(<Workbench setAlertType={mockSetAlertType} addLog={mockAddLog} />)

    const subjectInput = screen.getByPlaceholderText("dog") as HTMLInputElement
    expect(subjectInput.value).toBe("dog")

    // Click on Hand card button under Subject to fill it
    const fillButtons = screen.getAllByRole("button", { name: "cyberpunk cat" })
    fireEvent.click(fillButtons[0])

    expect(subjectInput.value).toBe("cyberpunk cat")
  })

  describe("checkConnection timers", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("clears pending timeouts on unmount", async () => {
      vi.mocked(useWorkbench).mockReturnValue({
        workbenchCards: [],
        handCards: [],
        selectedCardIds: [],
        toggleCardSelection: vi.fn(),
        clearWorkbench: vi.fn(),
        mergedPrompt: ""
      })

      // Simulate chrome tabs query failing to trigger a retry
      vi.mocked(chrome.tabs.query).mockRejectedValue(
        new Error("Tab query failed")
      )

      const { unmount } = render(
        <Workbench setAlertType={mockSetAlertType} addLog={mockAddLog} />
      )

      // Flush microtasks to allow the first async query call and catch block to run
      await vi.runAllTicks()

      // Verify that query was called once initially
      expect(chrome.tabs.query).toHaveBeenCalledTimes(1)

      // Unmount the component to trigger the cleanup.
      unmount()

      // Fast-forward time past 1500ms retry timeout
      vi.advanceTimersByTime(1500)
      await vi.runAllTicks()

      // Verify that query was not called a second time (meaning the timer was cleared)
      // Since query was called once during the initial mount, the call count should remain 1.
      expect(chrome.tabs.query).toHaveBeenCalledTimes(1)
    })
  })

  it("renders 'Mint Blended Variation' button and triggers onStartVariationMinting when in mixing mode", async () => {
    const mockOnStartVariationMinting = vi.fn()
    const mockSecondCard: StyleCard = {
      ...mockTargetCard,
      id: "card-2",
      name: "Anime Template",
      genealogy: { generation: 2, parentIds: [] }
    }

    vi.mocked(useWorkbench).mockReturnValue({
      workbenchCards: [mockTargetCard, mockSecondCard],
      handCards: [],
      selectedCardIds: ["card-1", "card-2"],
      toggleCardSelection: vi.fn(),
      clearWorkbench: vi.fn(),
      mergedPrompt: ""
    })

    render(
      <Workbench
        setAlertType={mockSetAlertType}
        addLog={mockAddLog}
        onStartVariationMinting={mockOnStartVariationMinting}
      />
    )

    // Verify button is rendered
    const mintButton = screen.getByText("Mint Blended Variation")
    expect(mintButton).toBeDefined()

    // Click button
    fireEvent.click(mintButton)

    expect(mockOnStartVariationMinting).toHaveBeenCalledWith(
      expect.objectContaining({
        promptSegments: expect.any(Array),
        parameters: expect.any(Object),
        genealogy: expect.objectContaining({
          generation: 3, // max(1, 2) + 1
          parentIds: ["card-1", "card-2"],
          originCreatorId: "user"
        }),
        thumbnailData: mockTargetCard.thumbnailData
      })
    )
  })
})
