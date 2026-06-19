import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CommandPalette } from "../../../../src/components/organisms/CommandPalette"
import { LanguageProvider } from "../../../../src/contexts/LanguageContext"
import { SettingsProvider } from "../../../../src/contexts/SettingsContext"

// Mock the DB stores
vi.mock("../../../../src/lib/style-card-store", () => ({
  getAllStyleCards: vi.fn().mockResolvedValue([
    {
      id: "card-cyber",
      name: "Cyber Punk Style",
      tier: "Rare",
      dominantColor: "#ff00ff",
      tags: ["neon", "cyber"],
      promptSegments: [{ type: "text", value: "high-tech retro cyber" }]
    },
    {
      id: "card-watercolor",
      name: "Water Color Splash",
      tier: "Legendary",
      dominantColor: "#00ffff",
      tags: ["paint", "water"],
      promptSegments: [{ type: "text", value: "soft watercolor painting" }]
    }
  ]),
  getAllCategories: vi
    .fn()
    .mockResolvedValue([
      {
        id: "cat-illustration",
        name: "Illustration Collection",
        iconEmoji: "🎨"
      }
    ])
}))

describe("CommandPalette Organism Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  const renderComponent = () => {
    return render(
      <LanguageProvider>
        <SettingsProvider>
          <CommandPalette />
        </SettingsProvider>
      </LanguageProvider>
    )
  }

  it("should not render by default", () => {
    renderComponent()
    expect(screen.queryByPlaceholderText(/Type a command/i)).toBeNull()
  })

  it("should open command palette on Ctrl+K keydown", async () => {
    renderComponent()

    fireEvent.keyDown(window, { key: "k", ctrlKey: true })

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type a command/i)).toBeDefined()
    })
  })

  it("should list default commands on empty query (Progressive Disclosure)", async () => {
    renderComponent()

    // Open palette
    fireEvent.keyDown(window, { key: "k", ctrlKey: true })

    await waitFor(() => {
      expect(screen.getByText("/search")).toBeDefined()
      expect(screen.getByText("/settings")).toBeDefined()
    })
  })

  it("should filter commands and search items on typing", async () => {
    renderComponent()

    fireEvent.keyDown(window, { key: "k", ctrlKey: true })

    const input = await screen.findByPlaceholderText(/Type a command/i)

    // Type "cyber" to search style cards
    fireEvent.change(input, { target: { value: "cyber" } })

    await waitFor(() => {
      expect(screen.getByText("Cyber Punk Style")).toBeDefined()
      expect(screen.queryByText("Water Color Splash")).toBeNull()
    })
  })

  it("should navigate options using arrow keys and select with enter", async () => {
    renderComponent()

    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    const input = await screen.findByPlaceholderText(/Type a command/i)

    // Listen to custom tab change events
    const tabListener = vi.fn()
    window.addEventListener("change-expert-tab", tabListener)

    // First item in expert mode is /mint, second is /mix, third is /search
    // ArrowDown should move selection to /mix
    fireEvent.keyDown(input, { key: "ArrowDown" })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(tabListener).toHaveBeenCalled()
    const callArgs = tabListener.mock.calls[0][0] as CustomEvent
    expect(callArgs.detail).toBe("workbench") // /mix triggers workbench tab

    window.removeEventListener("change-expert-tab", tabListener)
  })

  it("should close command palette on Escape keydown", async () => {
    renderComponent()

    // Open
    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    const input = await screen.findByPlaceholderText(/Type a command/i)

    // Close
    fireEvent.keyDown(input, { key: "Escape" })

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Type a command/i)).toBeNull()
    })
  })
})
