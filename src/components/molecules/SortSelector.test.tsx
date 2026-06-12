import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

import { SortSelector } from "./SortSelector"

describe("SortSelector", () => {
  const mockT = {
    sortByLabel: "Sort:",
    sortBy: {
      newest: "Newest",
      oldest: "Oldest",
      rarity: "Rarity",
      usage: "Usage",
      color: "Color"
    }
  }

  it("renders with correct default options", () => {
    const setSortBy = vi.fn()
    render(
      <SortSelector
        sortBy="newest"
        setSortBy={setSortBy}
        expertFeatures={{ rarity: false }}
        t={mockT}
        disabled={false}
      />
    )

    expect(screen.getByText("Sort:")).toBeInTheDocument()
    const select = screen.getByRole("combobox")
    expect(select).toBeInTheDocument()
    expect(select).toHaveValue("newest")

    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(4) // newest, oldest, usage, color
  })

  it("includes rarity option when expertFeatures.rarity is true", () => {
    const setSortBy = vi.fn()
    render(
      <SortSelector
        sortBy="newest"
        setSortBy={setSortBy}
        expertFeatures={{ rarity: true }}
        t={mockT}
        disabled={false}
      />
    )

    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(5) // newest, oldest, rarity, usage, color
    expect(screen.getByText("Rarity")).toBeInTheDocument()
  })

  it("calls setSortBy when selection changes", () => {
    const setSortBy = vi.fn()
    render(
      <SortSelector
        sortBy="newest"
        setSortBy={setSortBy}
        expertFeatures={{ rarity: true }}
        t={mockT}
        disabled={false}
      />
    )

    const select = screen.getByRole("combobox")
    fireEvent.change(select, { target: { value: "oldest" } })
    expect(setSortBy).toHaveBeenCalledWith("oldest")
  })

  it("is disabled when disabled prop is true", () => {
    const setSortBy = vi.fn()
    render(
      <SortSelector
        sortBy="newest"
        setSortBy={setSortBy}
        expertFeatures={{ rarity: true }}
        t={mockT}
        disabled={true}
      />
    )

    const select = screen.getByRole("combobox")
    expect(select).toBeDisabled()
  })
})
