import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import { Button } from "./Button"

describe("Button", () => {
  it("renders with children", () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole("button", { name: "Click me" })
    expect(button).toBeInTheDocument()
  })

  it("applies primary styles by default", () => {
    render(<Button>Default</Button>)
    const button = screen.getByRole("button", { name: "Default" })
    expect(button.className).toContain("bg-indigo-600")
  })

  it("applies variant styles correctly", () => {
    const { rerender } = render(<Button variant="danger">Danger</Button>)
    let button = screen.getByRole("button", { name: "Danger" })
    expect(button.className).toContain("bg-red-500")

    rerender(<Button variant="secondary">Secondary</Button>)
    button = screen.getByRole("button", { name: "Secondary" })
    expect(button.className).toContain("bg-slate-100")
  })

  it("applies size styles correctly", () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    let button = screen.getByRole("button", { name: "Small" })
    expect(button.className).toContain("px-3")

    rerender(<Button size="lg">Large</Button>)
    button = screen.getByRole("button", { name: "Large" })
    expect(button.className).toContain("px-6")
  })

  it("applies fullWidth style correctly", () => {
    render(<Button fullWidth>Full</Button>)
    const button = screen.getByRole("button", { name: "Full" })
    expect(button.className).toContain("w-full")
  })

  it("handles click events", () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    const button = screen.getByRole("button", { name: "Click" })
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole("button", { name: "Disabled" })
    expect(button).toBeDisabled()
  })
})
