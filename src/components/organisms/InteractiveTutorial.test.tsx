import { act, fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TutorialProvider, useTutorial } from "../../contexts/TutorialContext"
import { InteractiveTutorial } from "./InteractiveTutorial"

function TutorialHarness({ children }: { children: React.ReactNode }) {
  return <TutorialProvider>{children}</TutorialProvider>
}

function TriggerButton() {
  const { startTutorial } = useTutorial()
  return <button onClick={startTutorial}>Start</button>
}

function StepAdvancer() {
  const { nextStep } = useTutorial()
  return <button onClick={nextStep}>Next</button>
}

describe("InteractiveTutorial", () => {
  beforeEach(() => {
    // Mock navigator.language to ensure Japanese translations are loaded
    Object.defineProperty(window.navigator, "language", {
      value: "ja",
      configurable: true
    })
    // Mock querySelector to return a dummy element with getBoundingClientRect
    vi.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (
        typeof selector === "string" &&
        selector.startsWith("[data-tutorial=")
      ) {
        const div = document.createElement("div")
        div.getBoundingClientRect = () => ({
          top: 100,
          left: 50,
          width: 200,
          height: 40,
          bottom: 140,
          right: 250,
          x: 50,
          y: 100,
          toJSON: () => ({})
        })
        return div
      }
      return null
    })
  })

  it("does not render when tutorial is not active", () => {
    render(
      <TutorialHarness>
        <InteractiveTutorial />
      </TutorialHarness>
    )
    expect(screen.queryByTestId("interactive-tutorial")).toBeNull()
  })

  it("renders overlay and first step after startTutorial", async () => {
    render(
      <TutorialHarness>
        <TriggerButton />
        <InteractiveTutorial />
      </TutorialHarness>
    )

    await act(async () => {
      fireEvent.click(screen.getByText("Start"))
    })

    expect(screen.getByTestId("interactive-tutorial")).toBeDefined()
    expect(screen.getByText(/Step 1 \/ 8/)).toBeDefined()
    expect(screen.getByText("① HistoryにD&Dする")).toBeDefined()
  })

  it("shows close button and stops tutorial when clicked", async () => {
    render(
      <TutorialHarness>
        <TriggerButton />
        <InteractiveTutorial />
      </TutorialHarness>
    )

    await act(async () => {
      fireEvent.click(screen.getByText("Start"))
    })

    const closeBtn = screen.getByRole("button", { name: /Close tutorial/i })
    await act(async () => {
      fireEvent.click(closeBtn)
    })

    expect(screen.queryByTestId("interactive-tutorial")).toBeNull()
  })

  it("shows progress bar increasing per step", async () => {
    render(
      <TutorialHarness>
        <TriggerButton />
        <StepAdvancer />
        <InteractiveTutorial />
      </TutorialHarness>
    )

    await act(async () => {
      fireEvent.click(screen.getByText("Start"))
    })
    expect(screen.getByText(/Step 1 \/ 8/)).toBeDefined()

    await act(async () => {
      fireEvent.click(screen.getByText("Next"))
    })
    expect(screen.getByText(/Step 2 \/ 8/)).toBeDefined()
    expect(screen.getByText("② Mintボタンを押す")).toBeDefined()
  })

  it("renders 'サンプルを追加して進む' mock button on step 1", async () => {
    render(
      <TutorialHarness>
        <TriggerButton />
        <InteractiveTutorial />
      </TutorialHarness>
    )

    await act(async () => {
      fireEvent.click(screen.getByText("Start"))
    })

    expect(screen.getByText(/サンプルを追加して進む/)).toBeDefined()
  })

  it("shows 次へ button on all steps (even with autoAdvance)", async () => {
    render(
      <TutorialHarness>
        <TriggerButton />
        <InteractiveTutorial />
      </TutorialHarness>
    )

    await act(async () => {
      fireEvent.click(screen.getByText("Start"))
    })
    // step 1 has autoAdvance, but now we always show 次へ
    expect(screen.getByText("次へ")).toBeDefined()
  })

  it("renders tooltip centered as fallback when target element is not found", async () => {
    vi.spyOn(document, "querySelector").mockImplementation(() => null)

    render(
      <TutorialHarness>
        <TriggerButton />
        <InteractiveTutorial />
      </TutorialHarness>
    )

    await act(async () => {
      fireEvent.click(screen.getByText("Start"))
    })

    expect(screen.getByTestId("interactive-tutorial")).toBeDefined()
    expect(screen.getByText(/Step 1 \/ 8/)).toBeDefined()

    // The tooltip should still be visible even though querySelector returned null
    const tooltip = screen.getByText("① HistoryにD&Dする")
    expect(tooltip).toBeDefined()
  })
})
