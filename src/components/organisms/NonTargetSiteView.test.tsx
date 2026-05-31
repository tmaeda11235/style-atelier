import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { NonTargetSiteView } from "./NonTargetSiteView"

describe("NonTargetSiteView", () => {
  it("should render welcome text and buttons", () => {
    const mockOpenMidjourney = vi.fn()
    const mockOpenDiscord = vi.fn()

    render(
      <NonTargetSiteView
        onOpenMidjourney={mockOpenMidjourney}
        onOpenDiscord={mockOpenDiscord}
      />
    )

    expect(screen.getByText("Style Atelier")).toBeInTheDocument()
    expect(screen.getByText("Waiting for Connection")).toBeInTheDocument()
    expect(
      screen.getByText(/本拡張機能は Midjourney または Discord のページでのみご利用いただけます。/)
    ).toBeInTheDocument()

    const mjButton = screen.getByRole("button", { name: /Midjourneyを開く/ })
    const dcButton = screen.getByRole("button", { name: /Discordを開く/ })

    expect(mjButton).toBeInTheDocument()
    expect(dcButton).toBeInTheDocument()

    fireEvent.click(mjButton)
    expect(mockOpenMidjourney).toHaveBeenCalledTimes(1)

    fireEvent.click(dcButton)
    expect(mockOpenDiscord).toHaveBeenCalledTimes(1)
  })
})
