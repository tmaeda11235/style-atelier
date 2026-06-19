import { LanguageProvider } from "@/contexts/LanguageContext"
import { TutorialProvider, useTutorial } from "@/contexts/TutorialContext"
import { InteractiveTutorial } from "@/features/tutorial/components/InteractiveTutorial"
import { act, fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

function TutorialHarness({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <TutorialProvider>{children}</TutorialProvider>
    </LanguageProvider>
  )
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
    expect(screen.getByText(/ステップ 1 \/ 8/)).toBeDefined()
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
    expect(screen.getByText(/ステップ 1 \/ 8/)).toBeDefined()

    await act(async () => {
      fireEvent.click(screen.getByText("Next"))
    })
    expect(screen.getByText(/ステップ 2 \/ 8/)).toBeDefined()
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
    expect(screen.getByText(/ステップ 1 \/ 8/)).toBeDefined()

    // The tooltip should still be visible even though querySelector returned null
    const tooltip = screen.getByText("① HistoryにD&Dする")
    expect(tooltip).toBeDefined()
  })

  it("focuses on the heading when starting, traps focus with Tab, and returns focus when stopped", async () => {
    vi.useFakeTimers()

    render(
      <TutorialHarness>
        <TriggerButton />
        <InteractiveTutorial />
      </TutorialHarness>
    )

    const startBtn = screen.getByRole("button", { name: "Start" })
    startBtn.focus()
    expect(document.activeElement).toBe(startBtn)

    // チュートリアルを開始
    await act(async () => {
      fireEvent.click(startBtn)
    })

    // タイマーを進める（setTimeoutで50ms後にフォーカスが当たるため）
    await act(async () => {
      vi.advanceTimersByTime(50)
    })

    // 1. 初期フォーカスがタイトル（h3）に当たっていることを確認
    const heading = screen.getByRole("heading", { name: "① HistoryにD&Dする" })
    expect(document.activeElement).toBe(heading)

    // 2. フォーカストラップのテスト (Tab)
    const closeBtn = screen.getByRole("button", { name: /Close tutorial/i })
    const nextBtn = screen.getByRole("button", { name: /次へ/i })

    // 最後の要素（nextBtn）にフォーカスを当てて Tab を押す
    nextBtn.focus()
    expect(document.activeElement).toBe(nextBtn)

    // keydownイベントを発火
    const tooltipCard = screen
      .getByTestId("interactive-tutorial")
      .querySelector(".fixed.pointer-events-auto")!
    fireEvent.keyDown(tooltipCard, { key: "Tab" })

    // Tab後は最初の要素（closeBtn）にフォーカスが移るはず
    expect(document.activeElement).toBe(closeBtn)

    // 最初の要素（closeBtn）にフォーカスを当てて Shift+Tab を押す
    closeBtn.focus()
    expect(document.activeElement).toBe(closeBtn)

    fireEvent.keyDown(tooltipCard, { key: "Tab", shiftKey: true })

    // Shift+Tab後は最後の要素（nextBtn）にフォーカスが移るはず
    expect(document.activeElement).toBe(nextBtn)

    // 3. 終了時にフォーカスが戻るテスト
    await act(async () => {
      fireEvent.click(closeBtn)
    })

    await act(async () => {
      vi.advanceTimersByTime(50)
    })

    // チュートリアルを起動した元のボタンにフォーカスが戻るはず
    expect(document.activeElement).toBe(startBtn)

    vi.useRealTimers()
  })
})
