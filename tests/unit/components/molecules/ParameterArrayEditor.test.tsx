import { ParameterArrayEditor } from "@/components/molecules/ParameterArrayEditor"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

describe("ParameterArrayEditor", () => {
  it("renders labels, icons, values, and input fields", () => {
    const mockIcon = <span data-testid="mock-icon">★</span>
    render(
      <ParameterArrayEditor
        label="Test Params"
        icon={mockIcon}
        values={["val1", "val2"]}
        onChange={() => {}}
        placeholder="Enter value"
      />
    )

    expect(screen.getByTestId("mock-icon")).toBeDefined()
    expect(screen.getByText("Test Params")).toBeDefined()
    expect(screen.getByText("val1")).toBeDefined()
    expect(screen.getByText("val2")).toBeDefined()
    expect(screen.getByPlaceholderText("Enter value")).toBeDefined()
  })

  it("calls onChange with updated list when adding a new value via the Plus button", () => {
    const mockOnChange = vi.fn()
    render(
      <ParameterArrayEditor
        label="Test Params"
        icon={null}
        values={["val1"]}
        onChange={mockOnChange}
      />
    )

    const input = screen.getByPlaceholderText("Add...")
    fireEvent.change(input, { target: { value: "val2" } })

    // Click the Plus button
    const plusButton = screen
      .getAllByRole("button")
      .find((btn) => btn.querySelector("svg.lucide-plus"))!
    fireEvent.click(plusButton)

    expect(mockOnChange).toHaveBeenCalledWith(["val1", "val2"])
  })

  it("calls onChange with updated list when adding a new value via Enter key", () => {
    const mockOnChange = vi.fn()
    render(
      <ParameterArrayEditor
        label="Test Params"
        icon={null}
        values={["val1"]}
        onChange={mockOnChange}
      />
    )

    const input = screen.getByPlaceholderText("Add...")
    fireEvent.change(input, { target: { value: "val2" } })
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 })

    expect(mockOnChange).toHaveBeenCalledWith(["val1", "val2"])
  })

  it("calls onChange with filtered list (or undefined if empty) when deleting a value", () => {
    const mockOnChange = vi.fn()
    render(
      <ParameterArrayEditor
        label="Test Params"
        icon={null}
        values={["val1", "val2"]}
        onChange={mockOnChange}
      />
    )

    const xButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.querySelector("svg.lucide-x"))
    // Delete the first value ("val1")
    fireEvent.click(xButtons[0])

    expect(mockOnChange).toHaveBeenCalledWith(["val2"])
  })

  it("shows suggestions dropdown when options are provided and input is focused", () => {
    const mockOnChange = vi.fn()
    const suggestions = ["suggested-val1", "suggested-val2"]

    render(
      <ParameterArrayEditor
        label="Test Params"
        icon={null}
        values={[]}
        onChange={mockOnChange}
        options={suggestions}
      />
    )

    const input = screen.getByPlaceholderText("Add...")

    // Dropdown should not be visible before focus
    expect(screen.queryByText("suggested-val1")).toBeNull()

    // Focus input to open dropdown
    fireEvent.focus(input)
    expect(screen.getByText("suggested-val1")).toBeDefined()
    expect(screen.getByText("suggested-val2")).toBeDefined()

    // Click on suggestion
    fireEvent.click(screen.getByText("suggested-val1"))

    // Autocomplete dropdown selects it and updates input value
    expect((input as HTMLInputElement).value).toBe("suggested-val1")
  })

  it("renders localized alias tooltip and edit button title based on LanguageProvider", () => {
    const mockStyleCards = [
      {
        id: "card-1",
        name: "Neon Light Style",
        parameters: { sref: ["val1"] }
      }
    ] as any

    const { unmount } = render(
      <LanguageProvider>
        <ParameterArrayEditor
          label="Test Params"
          icon={null}
          values={["val1"]}
          onChange={() => {}}
          styleCards={mockStyleCards}
          parameterType="sref"
        />
      </LanguageProvider>
    )

    const editBtn = screen.getByTitle("Edit alias")
    expect(editBtn).toBeInTheDocument()
    expect(screen.getByText("Used in Styles:")).toBeInTheDocument()
    unmount()

    localStorage.setItem("style-atelier-language", "ja")
    try {
      render(
        <LanguageProvider>
          <ParameterArrayEditor
            label="Test Params"
            icon={null}
            values={["val1"]}
            onChange={() => {}}
            styleCards={mockStyleCards}
            parameterType="sref"
          />
        </LanguageProvider>
      )
      const editBtnJa = screen.getByTitle("エイリアスを編集")
      expect(editBtnJa).toBeInTheDocument()
      expect(screen.getByText("使用スタイル:")).toBeInTheDocument()
    } finally {
      localStorage.removeItem("style-atelier-language")
    }
  })

  it("handles different parameterTypes and missing thumbnailData", () => {
    const mockStyleCards = [
      {
        id: "1",
        name: "Card 1",
        parameters: { p: ["val_p"] },
        thumbnailData: "data:image/png;base64,xxx"
      },
      { id: "2", name: "Card 2", parameters: { cref: ["val_cref"] } }, // no thumbnail
      { id: "3", name: "Card 3", parameters: { imagePrompts: ["val_img"] } }
    ] as any

    const { unmount } = render(
      <ParameterArrayEditor
        label="Test p"
        icon={null}
        values={["val_p"]}
        onChange={() => {}}
        styleCards={mockStyleCards}
        parameterType="p"
      />
    )
    expect(screen.getByText("Card 1")).toBeInTheDocument()
    unmount()

    const { unmount: unmount2 } = render(
      <ParameterArrayEditor
        label="Test cref"
        icon={null}
        values={["val_cref"]}
        onChange={() => {}}
        styleCards={mockStyleCards}
        parameterType="cref"
      />
    )
    expect(screen.getByText("Card 2")).toBeInTheDocument()
    expect(screen.getByText("🖼️")).toBeInTheDocument()
    unmount2()

    render(
      <ParameterArrayEditor
        label="Test img"
        icon={null}
        values={["val_img"]}
        onChange={() => {}}
        styleCards={mockStyleCards}
        parameterType="imagePrompts"
      />
    )
    expect(screen.getByText("Card 3")).toBeInTheDocument()
  })
})
