import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import { Input } from "./Input"

describe("Input", () => {
  it("renders input field", () => {
    render(<Input placeholder="Type here" />)
    const input = screen.getByPlaceholderText("Type here")
    expect(input).toBeInTheDocument()
  })

  it("handles user input", () => {
    const handleChange = vi.fn()
    render(<Input placeholder="Type here" onChange={handleChange} />)
    const input = screen.getByPlaceholderText("Type here")
    fireEvent.change(input, { target: { value: "Hello" } })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it("is disabled when disabled prop is true", () => {
    render(<Input placeholder="Type here" disabled />)
    const input = screen.getByPlaceholderText("Type here")
    expect(input).toBeDisabled()
  })
})
