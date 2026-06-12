import { KeywordChip } from "@/components/molecules/KeywordChip"
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

describe("KeywordChip", () => {
  it("renders with label", () => {
    render(<KeywordChip label="Style" isSelected={false} onClick={() => {}} />)
    expect(screen.getByText("Style")).toBeInTheDocument()
  })

  it("applies selected classes when isSelected is true", () => {
    const { rerender } = render(
      <KeywordChip label="Style" isSelected={true} onClick={() => {}} />
    )
    let button = screen.getByRole("button")
    expect(button.className).toContain("bg-blue-500")

    rerender(
      <KeywordChip label="Style" isSelected={false} onClick={() => {}} />
    )
    button = screen.getByRole("button")
    expect(button.className).toContain("bg-slate-100")
  })

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn()
    render(
      <KeywordChip label="Style" isSelected={false} onClick={handleClick} />
    )
    const button = screen.getByRole("button")
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
