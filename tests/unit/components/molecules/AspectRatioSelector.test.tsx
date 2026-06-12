import { AspectRatioSelector } from "@/components/molecules/AspectRatioSelector"
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

describe("AspectRatioSelector", () => {
  it("renders all common aspect ratio buttons and custom input", () => {
    render(<AspectRatioSelector value={undefined} onChange={() => {}} />)

    expect(screen.getByText("Aspect Ratio")).toBeDefined()
    expect(screen.getByRole("button", { name: "1:1" })).toBeDefined()
    expect(screen.getByRole("button", { name: "16:9" })).toBeDefined()
    expect(screen.getByRole("button", { name: "9:16" })).toBeDefined()
    expect(screen.getByRole("button", { name: "4:3" })).toBeDefined()
    expect(screen.getByRole("button", { name: "3:2" })).toBeDefined()
    expect(screen.getByRole("button", { name: "2:3" })).toBeDefined()
    expect(screen.getByPlaceholderText("Custom")).toBeDefined()
  })

  it("applies active class to the selected aspect ratio button", () => {
    render(<AspectRatioSelector value="16:9" onChange={() => {}} />)

    const button16_9 = screen.getByRole("button", { name: "16:9" })
    const button1_1 = screen.getByRole("button", { name: "1:1" })

    expect(button16_9.className).toContain("bg-blue-600")
    expect(button1_1.className).not.toContain("bg-blue-600")
  })

  it("triggers onChange when a ratio button is clicked", () => {
    const mockOnChange = vi.fn()
    render(<AspectRatioSelector value="1:1" onChange={mockOnChange} />)

    const button16_9 = screen.getByRole("button", { name: "16:9" })
    fireEvent.click(button16_9)

    expect(mockOnChange).toHaveBeenCalledWith("16:9")
  })

  it("populates the Custom input field when value is custom (not in common list)", () => {
    render(<AspectRatioSelector value="21:9" onChange={() => {}} />)

    const customInput = screen.getByPlaceholderText(
      "Custom"
    ) as HTMLInputElement
    expect(customInput.value).toBe("21:9")
  })

  it("triggers onChange when entering value in custom input", () => {
    const mockOnChange = vi.fn()
    render(<AspectRatioSelector value={undefined} onChange={mockOnChange} />)

    const customInput = screen.getByPlaceholderText("Custom")
    fireEvent.change(customInput, { target: { value: "5:4" } })

    expect(mockOnChange).toHaveBeenCalledWith("5:4")
  })
})
