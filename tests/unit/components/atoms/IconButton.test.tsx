import { IconButton } from "@/components/atoms/IconButton"
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

describe("IconButton", () => {
  it("renders with icon child", () => {
    render(
      <IconButton>
        <span data-testid="mock-icon">★</span>
      </IconButton>
    )
    const icon = screen.getByTestId("mock-icon")
    expect(icon).toBeInTheDocument()
  })

  it("applies rounded style by default", () => {
    render(<IconButton>Icon</IconButton>)
    const button = screen.getByRole("button")
    expect(button.className).toContain("rounded-full")
  })

  it("applies variant and size styles correctly", () => {
    const { rerender } = render(
      <IconButton variant="indigo" size="md">
        Icon
      </IconButton>
    )
    let button = screen.getByRole("button")
    expect(button.className).toContain("bg-indigo-600")
    expect(button.className).toContain("p-2")

    rerender(
      <IconButton rounded={false} variant="danger">
        Icon
      </IconButton>
    )
    button = screen.getByRole("button")
    expect(button.className).toContain("rounded-md")
    expect(button.className).toContain("bg-red-500")
  })
})
