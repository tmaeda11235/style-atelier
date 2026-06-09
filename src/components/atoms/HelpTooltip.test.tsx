import { render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it } from "vitest"

import { HelpTooltip } from "./HelpTooltip"

describe("HelpTooltip", () => {
  it("renders trigger button and content", () => {
    render(<HelpTooltip content="This is a test tooltip" />)

    const trigger = screen.getByTestId("help-tooltip-trigger")
    const content = screen.getByTestId("help-tooltip-content")

    expect(trigger).toBeInTheDocument()
    expect(content).toBeInTheDocument()
    expect(content).toHaveTextContent("This is a test tooltip")
  })

  it("applies position classes correctly", () => {
    const { rerender } = render(
      <HelpTooltip content="Test" position="bottom" />
    )
    let content = screen.getByTestId("help-tooltip-content")
    expect(content.className).toContain("top-full")

    rerender(<HelpTooltip content="Test" position="left" />)
    content = screen.getByTestId("help-tooltip-content")
    expect(content.className).toContain("right-full")
  })
})
