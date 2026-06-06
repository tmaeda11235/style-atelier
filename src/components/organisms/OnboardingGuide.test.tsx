import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { OnboardingGuide } from "./OnboardingGuide"
import { LanguageProvider } from "../../contexts/LanguageContext"

describe("OnboardingGuide", () => {
  it("does not render when isOpen is false", () => {
    const handleClose = vi.fn()
    render(
      <LanguageProvider>
        <OnboardingGuide isOpen={false} onClose={handleClose} />
      </LanguageProvider>
    )
    expect(screen.queryByTestId("onboarding-modal")).toBeNull()
  })

  it("renders step 1 when isOpen is true", () => {
    const handleClose = vi.fn()
    render(
      <LanguageProvider>
        <OnboardingGuide isOpen={true} onClose={handleClose} />
      </LanguageProvider>
    )
    expect(screen.getByTestId("onboarding-modal")).toBeDefined()
    expect(screen.getByText("Quick Guide (1 / 7)")).toBeDefined()
    expect(screen.getByText("1. History to Panel")).toBeDefined()
    expect(screen.getByText(/Drag and drop any generated image/i)).toBeDefined()
  })

  it("navigates forward and backward through steps", () => {
    const handleClose = vi.fn()
    render(
      <LanguageProvider>
        <OnboardingGuide isOpen={true} onClose={handleClose} />
      </LanguageProvider>
    )

    // Initially at step 1
    expect(screen.getByText("1. History to Panel")).toBeDefined()

    // Click Next
    const nextButton = screen.getByRole("button", { name: /Next/i })
    fireEvent.click(nextButton)

    // Now at step 2
    expect(screen.getByText("2. Mint Your Card")).toBeDefined()
    expect(screen.getByText("Quick Guide (2 / 7)")).toBeDefined()

    // Click Back
    const backButton = screen.getByRole("button", { name: /Back/i })
    fireEvent.click(backButton)

    // Back to step 1
    expect(screen.getByText("1. History to Panel")).toBeDefined()
  })

  it("jumps to step when clicking dots indicator", () => {
    const handleClose = vi.fn()
    render(
      <LanguageProvider>
        <OnboardingGuide isOpen={true} onClose={handleClose} />
      </LanguageProvider>
    )

    // Click the 4th dot (0-indexed, so index 3 is step 4)
    const dots = screen.getAllByRole("button", { name: /Go to step/i })
    expect(dots.length).toBe(7)
    fireEvent.click(dots[3])

    expect(screen.getByText("4. Parameter Slotting")).toBeDefined()
    expect(screen.getByText("Quick Guide (4 / 7)")).toBeDefined()
  })

  it("calls onClose when Let's Start is clicked on final step", () => {
    const handleClose = vi.fn()
    render(
      <LanguageProvider>
        <OnboardingGuide isOpen={true} onClose={handleClose} />
      </LanguageProvider>
    )

    // Go directly to final step (step 7)
    const dots = screen.getAllByRole("button", { name: /Go to step/i })
    fireEvent.click(dots[6])

    expect(screen.getByText("7. Edit in Workbench")).toBeDefined()

    // Final step button is "Let's Start!"
    const startButton = screen.getByRole("button", { name: /Let's Start!/i })
    fireEvent.click(startButton)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when close icon button is clicked", () => {
    const handleClose = vi.fn()
    render(
      <LanguageProvider>
        <OnboardingGuide isOpen={true} onClose={handleClose} />
      </LanguageProvider>
    )

    const closeBtn = screen.getByRole("button", { name: /Close Guide/i })
    fireEvent.click(closeBtn)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
