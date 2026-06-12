import { render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it } from "vitest"

import { Tooltip } from "./Tooltip"

describe("Tooltip", () => {
  it("renders trigger element and tooltip content", () => {
    render(
      <Tooltip content="Tooltip message">
        <button data-testid="trigger">Hover me</button>
      </Tooltip>
    )

    const trigger = screen.getByTestId("trigger")
    const content = screen.getByTestId("tooltip-content")

    expect(trigger).toBeInTheDocument()
    expect(content).toBeInTheDocument()
    expect(content).toHaveTextContent("Tooltip message")
  })

  it("applies position classes correctly", () => {
    const { rerender } = render(
      <Tooltip content="Test" position="bottom">
        <div>Content</div>
      </Tooltip>
    )
    let content = screen.getByTestId("tooltip-content")
    expect(content.className).toContain("top-full")

    rerender(
      <Tooltip content="Test" position="left">
        <div>Content</div>
      </Tooltip>
    )
    content = screen.getByTestId("tooltip-content")
    expect(content.className).toContain("right-full")
  })
})
