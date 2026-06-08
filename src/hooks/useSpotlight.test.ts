import { act, renderHook, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LanguageProvider } from "../contexts/LanguageContext"
import { TutorialProvider, useTutorial } from "../contexts/TutorialContext"
import { useSpotlight } from "./useSpotlight"

function TutorialHarness({ children }: { children: React.ReactNode }) {
  return React.createElement(
    LanguageProvider,
    null,
    React.createElement(TutorialProvider, null, children)
  )
}

describe("useSpotlight", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it("returns null spotlightRect when isActive is false", () => {
    const { result } = renderHook(
      () => {
        const tutorial = useTutorial()
        const spotlight = useSpotlight()
        return { tutorial, spotlight }
      },
      { wrapper: TutorialHarness }
    )

    expect(result.current.spotlight.spotlightRect).toBeNull()
  })

  it("calculates positions and arrowSide when active and target element exists", async () => {
    const { result } = renderHook(
      () => {
        const tutorial = useTutorial()
        const spotlight = useSpotlight()
        return { tutorial, spotlight }
      },
      { wrapper: TutorialHarness }
    )

    act(() => {
      result.current.tutorial.startTutorial()
    })

    await waitFor(() => {
      expect(result.current.spotlight.spotlightRect).not.toBeNull()
    })

    expect(result.current.spotlight.arrowSide).toBe("bottom")
    expect(result.current.spotlight.spotlightRect?.top).toBe(92) // 100 - PADDING (8)
    expect(result.current.spotlight.spotlightRect?.left).toBe(42) // 50 - PADDING (8)
  })

  it("calculates fallback position when target element is not found", async () => {
    vi.spyOn(document, "querySelector").mockReturnValue(null)

    const { result } = renderHook(
      () => {
        const tutorial = useTutorial()
        const spotlight = useSpotlight()
        return { tutorial, spotlight }
      },
      { wrapper: TutorialHarness }
    )

    act(() => {
      result.current.tutorial.startTutorial()
    })

    await waitFor(() => {
      expect(result.current.spotlight.tooltipStyle.top).toBeDefined()
    })

    expect(result.current.spotlight.spotlightRect).toBeNull()
    expect(result.current.spotlight.tooltipStyle.left).toBeDefined()
  })
})
