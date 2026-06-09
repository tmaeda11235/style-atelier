import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import { RaritySelector } from "./RaritySelector"

describe("RaritySelector", () => {
  it("renders all rarity tiers", () => {
    render(<RaritySelector selected="Common" onSelect={() => {}} />)

    expect(screen.getByText("Common")).toBeInTheDocument()
    expect(screen.getByText("Rare")).toBeInTheDocument()
    expect(screen.getByText("Epic")).toBeInTheDocument()
    expect(screen.getByText("Legendary")).toBeInTheDocument()
  })

  it("applies border and glow classes to selected tier button", () => {
    render(<RaritySelector selected="Rare" onSelect={() => {}} />)

    const rareBtn = screen.getByRole("button", { name: "Rare" })
    expect(rareBtn.className).toContain("border-blue-500")
  })

  it("calls onSelect when a tier is clicked", () => {
    const handleSelect = vi.fn()
    render(<RaritySelector selected="Common" onSelect={handleSelect} />)

    const epicBtn = screen.getByRole("button", { name: "Epic" })
    fireEvent.click(epicBtn)
    expect(handleSelect).toHaveBeenCalledWith("Epic")
  })
})
