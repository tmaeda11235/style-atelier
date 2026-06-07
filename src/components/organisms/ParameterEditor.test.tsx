import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { db } from "../../lib/db"
import { ParameterEditor } from "./ParameterEditor"

let mockStyleCards: any[] = []

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: any) => {
    return mockStyleCards
  }
}))

describe("ParameterEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStyleCards = []
    ;(db.styleCards as any).__setItems([])
  })

  it("should render successfully with empty/default parameters", () => {
    render(<ParameterEditor parameters={{}} onChange={() => {}} />)

    // Check header
    expect(screen.getByText("Parameters")).toBeDefined()

    // Check Aspect Ratio options
    expect(screen.getByText("1:1")).toBeDefined()
    expect(screen.getByText("16:9")).toBeDefined()
    expect(screen.getByText("9:16")).toBeDefined()

    // Check ParameterArrayEditor labels
    expect(screen.getByText("Personalization (--p)")).toBeDefined()
    expect(screen.getByText("Image Prompts")).toBeDefined()
    expect(screen.getByText("Style Reference (--sref)")).toBeDefined()
    expect(screen.getByText("Character Reference (--cref)")).toBeDefined()
  })

  it("should select the active aspect ratio", () => {
    render(<ParameterEditor parameters={{ ar: "16:9" }} onChange={() => {}} />)

    const button16_9 = screen.getByRole("button", { name: "16:9" })
    const button1_1 = screen.getByRole("button", { name: "1:1" })

    // The active button should have bg-blue-600 styling (white text / active border)
    expect(button16_9.className).toContain("bg-blue-600")
    expect(button1_1.className).not.toContain("bg-blue-600")
  })

  it("should propagate ar changes when an aspect ratio button is clicked", () => {
    const mockOnChange = vi.fn()
    render(<ParameterEditor parameters={{}} onChange={mockOnChange} />)

    const button16_9 = screen.getByRole("button", { name: "16:9" })
    fireEvent.click(button16_9)

    expect(mockOnChange).toHaveBeenCalledWith({ ar: "16:9" })
  })

  it("should propagate ar changes when custom aspect ratio is input", () => {
    const mockOnChange = vi.fn()
    render(<ParameterEditor parameters={{}} onChange={mockOnChange} />)

    const customInput = screen.getByPlaceholderText("Custom")
    fireEvent.change(customInput, { target: { value: "21:9" } })

    expect(mockOnChange).toHaveBeenCalledWith({ ar: "21:9" })
  })

  it("should display initial values for array parameters as tags", () => {
    render(
      <ParameterEditor
        parameters={{
          p: ["yes", "code1"],
          imagePrompts: ["https://example.com/img.png"],
          sref: ["https://example.com/sref.png"],
          cref: ["https://example.com/cref.png"]
        }}
        onChange={() => {}}
      />
    )

    expect(screen.getByText("yes")).toBeDefined()
    expect(screen.getByText("code1")).toBeDefined()
    expect(screen.getByText("https://example.com/img.png")).toBeDefined()
    expect(screen.getByText("https://example.com/sref.png")).toBeDefined()
    expect(screen.getByText("https://example.com/cref.png")).toBeDefined()
  })

  it("should add a parameter value when clicking the Add button", () => {
    const mockOnChange = vi.fn()
    render(
      <ParameterEditor parameters={{ p: ["yes"] }} onChange={mockOnChange} />
    )

    const input = screen.getByPlaceholderText("Add code or 'yes'")
    fireEvent.change(input, { target: { value: "code123" } })

    // Click the Plus button for Personalization (--p)
    // ParameterArrayEditor is rendered sequentially, we can find the Add button next to the input
    const addButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.querySelector("svg.lucide-plus"))
    // First Plus button corresponds to "--p"
    fireEvent.click(addButtons[0])

    expect(mockOnChange).toHaveBeenCalledWith({ p: ["yes", "code123"] })
  })

  it("should remove a parameter value when clicking the remove button", () => {
    const mockOnChange = vi.fn()
    render(
      <ParameterEditor
        parameters={{ p: ["yes", "code1"] }}
        onChange={mockOnChange}
      />
    )

    // Click X button for "yes" (the first X button)
    const removeButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.querySelector("svg.lucide-x"))
    fireEvent.click(removeButtons[0])

    expect(mockOnChange).toHaveBeenCalledWith({ p: ["code1"] })
  })

  it("should load autocomplete suggestions from existing cards in database", () => {
    // Populate mock cards with parameters
    mockStyleCards = [
      {
        id: "1",
        parameters: {
          sref: ["https://example.com/existing-sref.png"],
          cref: ["https://example.com/existing-cref.png"],
          imagePrompts: ["https://example.com/existing-ip.png"]
        }
      }
    ]
    ;(db.styleCards as any).__setItems(mockStyleCards)

    render(<ParameterEditor parameters={{}} onChange={() => {}} />)

    // Verify useLiveQuery returns correct lists and options are passed
    // We can check if autocomplete inputs have options or check if they are rendered correctly.
    // AutocompleteDropdown opens on input focus.
    const inputs = screen.getAllByPlaceholderText("Add Image URL")

    // inputs[0] is Image Prompts, inputs[1] is Style Reference (--sref)
    // Let's focus them to trigger AutocompleteDropdown rendering
    fireEvent.focus(inputs[0]) // Image Prompts
    expect(
      screen.getByText("https://example.com/existing-ip.png")
    ).toBeDefined()

    fireEvent.focus(inputs[1]) // Style Reference
    expect(
      screen.getByText("https://example.com/existing-sref.png")
    ).toBeDefined()

    const crefInput = screen.getByPlaceholderText("Add Character URL")
    fireEvent.focus(crefInput)
    expect(
      screen.getByText("https://example.com/existing-cref.png")
    ).toBeDefined()
  })
})
