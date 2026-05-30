import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { InteractiveTutorial } from "./InteractiveTutorial"
import { TutorialProvider, useTutorial } from "../../contexts/TutorialContext"
import React from "react"

// Mock db so InteractiveTutorial's handleMockDrop doesn't blow up
vi.mock("../../lib/db", () => ({
  db: {
    historyItems: {
      put: vi.fn().mockResolvedValue(undefined),
    },
  },
}))

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
    // Mock querySelector to return a dummy element with getBoundingClientRect
    vi.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (typeof selector === "string" && selector.startsWith("[data-tutorial=")) {
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
          toJSON: () => ({}),
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
    expect(screen.getByText(/Step 1 \/ 7/)).toBeDefined()
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
    expect(screen.getByText(/Step 1 \/ 7/)).toBeDefined()

    await act(async () => {
      fireEvent.click(screen.getByText("Next"))
    })
    expect(screen.getByText(/Step 2 \/ 7/)).toBeDefined()
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

  it("shows 次へ button on steps without autoAdvance", async () => {
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
    // step 1 has autoAdvance + mockAction, so no 次へ
    expect(screen.queryByText("次へ")).toBeNull()

    // Advance to step 3 (title-input) which has autoAdvance: false
    await act(async () => { fireEvent.click(screen.getByText("Next")) }) // step 2
    await act(async () => { fireEvent.click(screen.getByText("Next")) }) // step 3
    expect(screen.getByText(/③ タイトルを入れる/)).toBeDefined()
    expect(screen.getByText("次へ")).toBeDefined()
  })
})
