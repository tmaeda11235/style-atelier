import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SimpleWorkbenchModal } from "./SimpleWorkbenchModal"
import { db } from "../../lib/db"

// Mock chrome extension API
const chromeMock = {
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
}
global.chrome = chromeMock as any

// Mock DB
vi.mock("../../lib/db", () => {
  return {
    db: {
      updateCard: vi.fn(),
    },
  }
})

// Mock PromptBubbleEditor and ParameterEditor to simplify layout testing
vi.mock("./PromptBubbleEditor", () => ({
  PromptBubbleEditor: ({ initialSegments, onChange }: any) => (
    <div data-testid="prompt-bubble-editor">
      <button onClick={() => onChange([...initialSegments, { type: "text", value: "new-tag" }])}>
        Add Tag
      </button>
    </div>
  ),
}))

vi.mock("./ParameterEditor", () => ({
  ParameterEditor: ({ parameters, onChange }: any) => (
    <div data-testid="parameter-editor">
      <button onClick={() => onChange({ ...parameters, ar: "16:9" })}>
        Set Aspect Ratio
      </button>
    </div>
  ),
}))

describe("SimpleWorkbenchModal", () => {
  const mockCard: any = {
    id: "card-123",
    name: "Cyberpunk Glow",
    tier: "Rare",
    promptSegments: [{ type: "text", value: "neon glow" }],
    parameters: { ar: "1:1" },
    thumbnailData: "data:image/png;base64,abc",
  }

  const mockOnClose = vi.fn()
  const mockAddLog = vi.fn()
  const mockSetAlertType = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    chromeMock.tabs.query.mockResolvedValue([{ id: 1, status: "complete" }])
    chromeMock.tabs.sendMessage.mockResolvedValue({ status: "success" })
    vi.mocked(db.updateCard).mockResolvedValue(1 as any)
  })

  it("renders card name, details and inputs correctly", () => {
    render(
      <SimpleWorkbenchModal
        card={mockCard}
        onClose={mockOnClose}
        addLog={mockAddLog}
        setAlertType={mockSetAlertType}
      />
    )

    expect(screen.getByText("Simple Workbench")).toBeDefined()
    expect(screen.getAllByText("Cyberpunk Glow").length).toBeGreaterThan(0)
    expect(screen.getByText("Rare")).toBeDefined()
    expect(screen.getByTestId("prompt-bubble-editor")).toBeDefined()
    expect(screen.getByTestId("parameter-editor")).toBeDefined()
  })

  it("calls onClose when Close or Cancel buttons are clicked", () => {
    render(
      <SimpleWorkbenchModal
        card={mockCard}
        onClose={mockOnClose}
        addLog={mockAddLog}
        setAlertType={mockSetAlertType}
      />
    )

    const closeBtn = screen.getByLabelText("Close")
    fireEvent.click(closeBtn)
    expect(mockOnClose).toHaveBeenCalled()

    const cancelBtn = screen.getByText("Cancel")
    fireEvent.click(cancelBtn)
    expect(mockOnClose).toHaveBeenCalledTimes(2)
  })

  it("injects prompt to Midjourney on Try on Midjourney button click", async () => {
    render(
      <SimpleWorkbenchModal
        card={mockCard}
        onClose={mockOnClose}
        addLog={mockAddLog}
        setAlertType={mockSetAlertType}
      />
    )

    // Trigger inject button click
    const injectBtn = screen.getByText("Try on Midjourney")
    fireEvent.click(injectBtn)

    await waitFor(() => {
      expect(chromeMock.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true })
      expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: "INJECT_PROMPT",
        prompt: "neon glow --ar 1:1",
      })
      expect(db.updateCard).toHaveBeenCalledWith("card-123", { usageCount: 1 })
      expect(mockAddLog).toHaveBeenCalledWith("Prompt injected successfully!")
    })
  })

  it("updates local segments and parameters, resulting in updated inject prompt", async () => {
    render(
      <SimpleWorkbenchModal
        card={mockCard}
        onClose={mockOnClose}
        addLog={mockAddLog}
        setAlertType={mockSetAlertType}
      />
    )

    // Simulate change in prompt bubbles and parameter editor
    const addTagBtn = screen.getByText("Add Tag")
    fireEvent.click(addTagBtn)

    const setArBtn = screen.getByText("Set Aspect Ratio")
    fireEvent.click(setArBtn)

    // Now inject
    const injectBtn = screen.getByText("Try on Midjourney")
    fireEvent.click(injectBtn)

    await waitFor(() => {
      expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: "INJECT_PROMPT",
        prompt: "neon glow, new-tag --ar 16:9",
      })
    })
  })
})
