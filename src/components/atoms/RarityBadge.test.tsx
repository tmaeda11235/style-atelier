import { render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it } from "vitest"

import { RarityBadge } from "./RarityBadge"

describe("RarityBadge", () => {
  it("renders with appropriate rarity tier text", () => {
    render(<RarityBadge tier="Rare" />)
    const badge = screen.getByText("Rare")
    expect(badge).toBeInTheDocument()
  })

  it("applies background and text styling from config", () => {
    render(<RarityBadge tier="Legendary" />)
    const badge = screen.getByText("Legendary")
    expect(badge.className).toContain("bg-yellow-500")
  })

  it("returns null if tier is invalid", () => {
    const { container } = render(<RarityBadge tier={"Invalid" as any} />)
    expect(container.firstChild).toBeNull()
  })
})
