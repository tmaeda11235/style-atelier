import { NonTargetSiteView } from "@/components/organisms/NonTargetSiteView"
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

describe("NonTargetSiteView", () => {
  it("should render welcome text and buttons", () => {
    const mockOpenMidjourney = vi.fn()

    render(<NonTargetSiteView onOpenMidjourney={mockOpenMidjourney} />)

    expect(screen.getByText("Style Atelier")).toBeInTheDocument()
    expect(screen.getByText("Waiting for Connection")).toBeInTheDocument()
    expect(
      screen.getByText(
        /本拡張機能は Midjourney または Discord のページでのみご利用いただけます。/
      )
    ).toBeInTheDocument()

    const mjButton = screen.getByRole("button", { name: /Midjourneyを開く/ })

    expect(mjButton).toBeInTheDocument()

    fireEvent.click(mjButton)
    expect(mockOpenMidjourney).toHaveBeenCalledTimes(1)
  })
})
