import { useSpotlight } from "@/hooks/useSpotlight"
import { db } from "@/lib/db"
import { act, renderHook, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockTutorialState = {
  isActive: false,
  currentStep: "drop-history",
  currentStepIndex: 0,
  currentConfig: null as any,
  totalSteps: 8,
  startTutorial: vi.fn(),
  stopTutorial: vi.fn(),
  nextStep: vi.fn(),
  prevStep: vi.fn(),
  advanceIfStep: vi.fn()
}

vi.mock("@/contexts/TutorialContext", () => ({
  useTutorial: () => mockTutorialState,
  TutorialProvider: ({ children }: any) => children
}))

vi.mock("@/contexts/LanguageContext", () => ({
  LanguageProvider: ({ children }: any) => children,
  useLanguage: () => ({ t: () => ({}) })
}))

vi.mock("@/lib/db", () => ({
  db: {
    historyItems: {
      put: vi.fn().mockResolvedValue("mocked-history-id")
    }
  }
}))

describe("useSpotlight", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("innerWidth", 1024)
    vi.stubGlobal("innerHeight", 768)

    mockTutorialState.isActive = false
    mockTutorialState.currentConfig = null

    // Default selector mock that returns an element in the center of the screen
    vi.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (
        typeof selector === "string" &&
        selector.startsWith("[data-tutorial=")
      ) {
        const div = document.createElement("div")
        div.getBoundingClientRect = () => ({
          top: 300,
          left: 400,
          width: 200,
          height: 40,
          bottom: 340,
          right: 600,
          x: 400,
          y: 300,
          toJSON: () => ({})
        })
        return div
      }
      return null
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns null spotlightRect when isActive is false", () => {
    const { result } = renderHook(() => useSpotlight())
    expect(result.current.spotlightRect).toBeNull()
  })

  it("calculates fallback position when target element is not found", async () => {
    vi.spyOn(document, "querySelector").mockReturnValue(null)
    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "bottom",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    await waitFor(() => {
      expect(result.current.tooltipStyle.top).toBeDefined()
    })

    expect(result.current.spotlightRect).toBeNull()
    expect(result.current.tooltipStyle.left).toBeDefined()
  })

  it("handles side = left and positions left when there is space", async () => {
    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "left",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    await waitFor(() => {
      expect(result.current.arrowSide).toBe("left")
    })
  })

  it("handles side = left and flips to right when left space overflows", async () => {
    // Position target element close to the left boundary (left = 50px)
    vi.spyOn(document, "querySelector").mockImplementation(() => {
      const div = document.createElement("div")
      div.getBoundingClientRect = () => ({
        top: 300,
        left: 50,
        width: 100,
        height: 40,
        bottom: 340,
        right: 150,
        x: 50,
        y: 300,
        toJSON: () => ({})
      })
      return div
    })

    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "left",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    await waitFor(() => {
      expect(result.current.arrowSide).toBe("right")
    })
  })

  it("handles side = left and flips to bottom when both left and right overflow", async () => {
    // Narrow window, target element has almost no left or right space
    vi.stubGlobal("innerWidth", 380)
    vi.spyOn(document, "querySelector").mockImplementation(() => {
      const div = document.createElement("div")
      div.getBoundingClientRect = () => ({
        top: 300,
        left: 40,
        width: 300,
        height: 40,
        bottom: 340,
        right: 340,
        x: 40,
        y: 300,
        toJSON: () => ({})
      })
      return div
    })

    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "left",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    await waitFor(() => {
      expect(result.current.arrowSide).toBe("bottom")
    })
  })

  it("handles side = right and positions right when there is space", async () => {
    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "right",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    await waitFor(() => {
      expect(result.current.arrowSide).toBe("right")
    })
  })

  it("handles side = right and flips to left when right space overflows", async () => {
    // Target element close to right edge
    vi.spyOn(document, "querySelector").mockImplementation(() => {
      const div = document.createElement("div")
      div.getBoundingClientRect = () => ({
        top: 300,
        left: 800,
        width: 200,
        height: 40,
        bottom: 340,
        right: 1000,
        x: 800,
        y: 300,
        toJSON: () => ({})
      })
      return div
    })

    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "right",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    await waitFor(() => {
      expect(result.current.arrowSide).toBe("left")
    })
  })

  it("handles side = right and flips to bottom when both right and left overflow", async () => {
    vi.stubGlobal("innerWidth", 380)
    vi.spyOn(document, "querySelector").mockImplementation(() => {
      const div = document.createElement("div")
      div.getBoundingClientRect = () => ({
        top: 300,
        left: 40,
        width: 300,
        height: 40,
        bottom: 340,
        right: 340,
        x: 40,
        y: 300,
        toJSON: () => ({})
      })
      return div
    })

    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "right",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    await waitFor(() => {
      expect(result.current.arrowSide).toBe("bottom")
    })
  })

  it("handles side = bottom and positions bottom when there is space", async () => {
    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "bottom",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    await waitFor(() => {
      expect(result.current.arrowSide).toBe("bottom")
    })
  })

  it("handles side = bottom and flips to top when bottom overflows", async () => {
    // Target element near bottom edge
    vi.spyOn(document, "querySelector").mockImplementation(() => {
      const div = document.createElement("div")
      div.getBoundingClientRect = () => ({
        top: 700,
        left: 400,
        width: 200,
        height: 40,
        bottom: 740,
        right: 600,
        x: 400,
        y: 700,
        toJSON: () => ({})
      })
      return div
    })

    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "bottom",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    await waitFor(() => {
      expect(result.current.arrowSide).toBe("top")
    })
  })

  it("handles side = top and positions top when there is space", async () => {
    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "top",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    await waitFor(() => {
      expect(result.current.arrowSide).toBe("top")
    })
  })

  it("handles side = top and flips to bottom when top overflows", async () => {
    // Target element near top edge
    vi.spyOn(document, "querySelector").mockImplementation(() => {
      const div = document.createElement("div")
      div.getBoundingClientRect = () => ({
        top: 20,
        left: 400,
        width: 200,
        height: 40,
        bottom: 60,
        right: 600,
        x: 400,
        y: 20,
        toJSON: () => ({})
      })
      return div
    })

    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "top",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    await waitFor(() => {
      expect(result.current.arrowSide).toBe("bottom")
    })
  })

  it("handles narrow screen support by forcing bottom position", async () => {
    vi.stubGlobal("innerWidth", 320)

    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "left",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    await waitFor(() => {
      expect(result.current.arrowSide).toBe("bottom")
    })
  })

  it("handles computePositions on window resize and scroll events", async () => {
    const addEventSpy = vi.spyOn(window, "addEventListener")
    const removeEventSpy = vi.spyOn(window, "removeEventListener")

    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "bottom",
      autoAdvance: true
    }

    const { result, unmount } = renderHook(() => useSpotlight())

    await waitFor(() => {
      expect(result.current.spotlightRect).not.toBeNull()
    })

    expect(addEventSpy).toHaveBeenCalledWith("resize", expect.any(Function))
    expect(addEventSpy).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      true
    )

    unmount()

    expect(removeEventSpy).toHaveBeenCalledWith("resize", expect.any(Function))
    expect(removeEventSpy).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      true
    )
  })

  it("retries finding the target element via setInterval if not found initially", async () => {
    let elementFound = false

    vi.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (
        elementFound &&
        typeof selector === "string" &&
        selector.startsWith("[data-tutorial=")
      ) {
        const div = document.createElement("div")
        div.getBoundingClientRect = () => ({
          top: 300,
          left: 400,
          width: 200,
          height: 40,
          bottom: 340,
          right: 600,
          x: 400,
          y: 300,
          toJSON: () => ({})
        })
        return div
      }
      return null
    })

    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "bottom",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    expect(result.current.spotlightRect).toBeNull()

    // Trigger element found
    elementFound = true

    await waitFor(() => {
      expect(result.current.spotlightRect).not.toBeNull()
    })
  })

  it("handles handleMockDrop successfully", async () => {
    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "bottom",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    await act(async () => {
      await result.current.handleMockDrop()
    })

    expect(db.historyItems.put).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: expect.stringContaining("https://picsum.photos"),
        fullCommand: expect.stringContaining("neon cyberpunk samurai")
      })
    )

    await waitFor(() => {
      expect(result.current.isMockLoading).toBe(false)
    })
  })

  it("handles handleMockDrop failures gracefully", async () => {
    vi.mocked(db.historyItems.put).mockRejectedValueOnce(
      new Error("Db put failed")
    )
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "bottom",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    await act(async () => {
      await result.current.handleMockDrop()
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to insert sample history:",
      expect.any(Error)
    )
    expect(result.current.isMockLoading).toBe(false)
    consoleSpy.mockRestore()
  })

  it("stops retrying after 10 failed attempts", async () => {
    vi.useFakeTimers()
    vi.spyOn(document, "querySelector").mockReturnValue(null)

    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "bottom",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    // Advance 12 intervals (1200ms)
    act(() => {
      vi.advanceTimersByTime(1200)
    })

    expect(result.current.spotlightRect).toBeNull()
    vi.useRealTimers()
  })

  it("blocks clicks outside the target and tooltip, and allows clicks inside them", async () => {
    vi.stubEnv("BYPASS_VITEST", "true")

    const mockTarget = document.createElement("div")
    const mockTooltip = document.createElement("div")

    vi.spyOn(document, "querySelector").mockImplementation((selector) => {
      if (selector === "[data-tutorial='history-drop-zone']") {
        return mockTarget
      }
      return null
    })

    mockTutorialState.isActive = true
    mockTutorialState.currentConfig = {
      id: "drop-history",
      targetSelector: "[data-tutorial='history-drop-zone']",
      position: "bottom",
      autoAdvance: true
    }

    const { result } = renderHook(() => useSpotlight())

    // Assign tooltip element ref
    result.current.tooltipRef.current = mockTooltip

    // Helper to simulate a click with capture
    const simulateClick = (targetNode: Node) => {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true })
      // Mock properties that capture click logic checks
      Object.defineProperty(event, "target", {
        value: targetNode,
        enumerable: true
      })
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation")
      const preventDefaultSpy = vi.spyOn(event, "preventDefault")
      window.dispatchEvent(event)
      return { stopPropagationSpy, preventDefaultSpy }
    }

    // 1. Click inside tooltip should NOT be blocked
    const childOfTooltip = document.createElement("span")
    mockTooltip.appendChild(childOfTooltip)
    const res1 = simulateClick(childOfTooltip)
    expect(res1.stopPropagationSpy).not.toHaveBeenCalled()
    expect(res1.preventDefaultSpy).not.toHaveBeenCalled()

    // 2. Click inside target should NOT be blocked
    const childOfTarget = document.createElement("span")
    mockTarget.appendChild(childOfTarget)
    const res2 = simulateClick(childOfTarget)
    expect(res2.stopPropagationSpy).not.toHaveBeenCalled()
    expect(res2.preventDefaultSpy).not.toHaveBeenCalled()

    // 3. Click outside both should be blocked
    const randomDiv = document.createElement("div")
    const res3 = simulateClick(randomDiv)
    expect(res3.stopPropagationSpy).toHaveBeenCalled()
    expect(res3.preventDefaultSpy).toHaveBeenCalled()

    vi.unstubAllEnvs()
  })
})
