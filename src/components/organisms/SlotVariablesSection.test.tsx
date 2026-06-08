import {
  fireEvent,
  screen,
  render as tlRender,
  waitFor
} from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import { SettingsProvider } from "../../contexts/SettingsContext"
import type { StyleCard } from "../../lib/db-schema"
import { SlotVariablesSection } from "./SlotVariablesSection"

const render = (ui: React.ReactElement, options?: any) => {
  return tlRender(ui, { wrapper: SettingsProvider, ...options })
}

describe("SlotVariablesSection", () => {
  const mockSlots = [
    { label: "Subject", default: "dog" },
    { label: "Style", default: "cyberpunk" }
  ]

  const mockHandCard: StyleCard = {
    id: "card-hand-1",
    name: "neon tiger",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    promptSegments: [{ type: "text", value: "neon tiger" }],
    parameters: {},
    masking: { isSrefHidden: false, isPHidden: false },
    tier: "Common",
    isFavorite: false,
    usageCount: 0,
    tags: [],
    dominantColor: "#00ff00",
    thumbnailData: "",
    frameId: "default",
    genealogy: { generation: 1, parentIds: [] }
  }

  const mockHistory = {
    Subject: ["red dragon", "space explorer"]
  }

  it("does not render when slots array is empty", () => {
    const { container } = render(
      <SlotVariablesSection
        slots={[]}
        slotValues={{}}
        onSlotValueChange={vi.fn()}
        slotHistory={{}}
        handCards={[]}
        onSendToWorkbench={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders inputs with default value and handles focus/change", async () => {
    const mockChange = vi.fn()
    render(
      <SlotVariablesSection
        slots={mockSlots}
        slotValues={{ Subject: "dog" }}
        onSlotValueChange={mockChange}
        slotHistory={{}}
        handCards={[]}
        onSendToWorkbench={vi.fn()}
      />
    )

    const subjectInput = screen.getByPlaceholderText("dog") as HTMLInputElement
    expect(subjectInput.value).toBe("dog")

    // Check first input auto-focus
    await waitFor(() => {
      expect(document.activeElement).toBe(subjectInput)
    })

    fireEvent.change(subjectInput, { target: { value: "neon tiger" } })
    expect(mockChange).toHaveBeenCalledWith("Subject", "neon tiger")
  })

  it("triggers send to Workbench when pin button is clicked", () => {
    const mockSend = vi.fn()
    render(
      <SlotVariablesSection
        slots={mockSlots}
        slotValues={{ Subject: "cat" }}
        onSlotValueChange={vi.fn()}
        slotHistory={{}}
        handCards={[]}
        onSendToWorkbench={mockSend}
      />
    )

    const sendBtn = screen.getAllByTitle("Send to Workbench")[0]
    fireEvent.click(sendBtn)

    expect(mockSend).toHaveBeenCalledWith("cat", "Subject")
  })

  it("allows selecting value from Hand cards", () => {
    const mockChange = vi.fn()
    render(
      <SlotVariablesSection
        slots={mockSlots}
        slotValues={{}}
        onSlotValueChange={mockChange}
        slotHistory={{}}
        handCards={[mockHandCard]}
        onSendToWorkbench={vi.fn()}
      />
    )

    const subjectInput = screen.getByPlaceholderText("dog")
    fireEvent.focus(subjectInput)

    const handBtn = screen.getAllByRole("button", { name: "neon tiger" })[0]
    fireEvent.mouseDown(handBtn)
    fireEvent.click(handBtn)

    expect(mockChange).toHaveBeenCalledWith("Subject", "neon tiger")
  })

  it("allows selecting value from history", () => {
    const mockChange = vi.fn()
    render(
      <SlotVariablesSection
        slots={mockSlots}
        slotValues={{}}
        onSlotValueChange={mockChange}
        slotHistory={mockHistory}
        handCards={[]}
        onSendToWorkbench={vi.fn()}
      />
    )

    const subjectInput = screen.getByPlaceholderText("dog")
    fireEvent.focus(subjectInput)

    const historyBtn = screen.getAllByRole("button", { name: "red dragon" })[0]
    fireEvent.mouseDown(historyBtn)
    fireEvent.click(historyBtn)

    expect(mockChange).toHaveBeenCalledWith("Subject", "red dragon")
  })
})
