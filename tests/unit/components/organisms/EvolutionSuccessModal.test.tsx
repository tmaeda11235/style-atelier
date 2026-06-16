import { EvolutionSuccessModal } from "@/components/organisms/EvolutionSuccessModal"
import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi } from "vitest"

describe("EvolutionSuccessModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    cardName: "Test Card Name",
    oldTier: "Rare" as const,
    newTier: "Epic" as const,
    translation: {
      title: "EVOLUTION COMPLETE!",
      desc: "Your style card has evolved to a higher tier!",
      close: "Close"
    }
  }

  it("renders the modal when isOpen is true", () => {
    render(<EvolutionSuccessModal {...defaultProps} />)
    expect(screen.getByText("EVOLUTION COMPLETE!")).toBeInTheDocument()
    expect(screen.getByText("Test Card Name")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument()
  })

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <EvolutionSuccessModal {...defaultProps} isOpen={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("calls onClose when the close button is clicked", () => {
    const onCloseMock = vi.fn()
    render(<EvolutionSuccessModal {...defaultProps} onClose={onCloseMock} />)

    const closeBtn = screen.getByRole("button", { name: "Close" })
    fireEvent.click(closeBtn)
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })
})
