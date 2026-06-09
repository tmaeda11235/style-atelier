import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import { AutocompleteDropdown } from "./AutocompleteDropdown"

describe("AutocompleteDropdown", () => {
  const options = ["apple", "banana", "cherry", "https://example.com/img.jpg"]

  it("does not render when not open or filtered options is empty", () => {
    const { container } = render(
      <AutocompleteDropdown
        options={options}
        value=""
        isOpen={false}
        onSelect={() => {}}
        onClose={() => {}}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders filtered options when open", () => {
    render(
      <AutocompleteDropdown
        options={options}
        value="ap"
        isOpen={true}
        onSelect={() => {}}
        onClose={() => {}}
      />
    )
    expect(screen.getByText("apple")).toBeInTheDocument()
    expect(screen.queryByText("banana")).toBeNull()
  })

  it("calls onSelect when option is clicked", () => {
    const mockOnSelect = vi.fn()
    render(
      <AutocompleteDropdown
        options={options}
        value="ap"
        isOpen={true}
        onSelect={mockOnSelect}
        onClose={() => {}}
      />
    )
    const option = screen.getByText("apple")
    fireEvent.click(option)
    expect(mockOnSelect).toHaveBeenCalledWith("apple")
  })

  it("renders mock image preview for URL option", () => {
    render(
      <AutocompleteDropdown
        options={options}
        value="http"
        isOpen={true}
        onSelect={() => {}}
        onClose={() => {}}
      />
    )
    const img = screen.getByAltText("Sref Preview")
    expect(img).toBeInTheDocument()
  })

  it("renders matching style card thumbnail when available", () => {
    const styleCards = [
      {
        id: "1",
        name: "Test Card",
        thumbnailData: "data:image/png;base64,card_thumb",
        parameters: { sref: "cherry" }
      }
    ] as any

    render(
      <AutocompleteDropdown
        options={options}
        value="che"
        isOpen={true}
        onSelect={() => {}}
        onClose={() => {}}
        styleCards={styleCards}
      />
    )
    expect(screen.getByAltText("Card Preview")).toBeInTheDocument()
  })
})
