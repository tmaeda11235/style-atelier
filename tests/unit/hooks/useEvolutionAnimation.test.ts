import { useEvolutionAnimation } from "@/hooks/useEvolutionAnimation"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("useEvolutionAnimation", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("should initialize with default values when isOpen is false", () => {
    const { result } = renderHook(() => useEvolutionAnimation(false, "Rare"))

    expect(result.current.isFlipped).toBe(false)
    expect(result.current.confetti).toEqual([])
    expect(result.current.tilt).toEqual({ x: 0, y: 0 })
  })

  it("should trigger animations and confetti after timeouts when isOpen is true", () => {
    const { result, rerender } = renderHook(
      ({ isOpen, tier }) => useEvolutionAnimation(isOpen, tier),
      {
        initialProps: { isOpen: false, tier: "Rare" as const }
      }
    )

    // Open modal
    rerender({ isOpen: true, tier: "Rare" })

    // Initially when opened
    expect(result.current.isFlipped).toBe(false)
    expect(result.current.confetti).toEqual([])

    // Fast-forward 600ms for isFlipped
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(result.current.isFlipped).toBe(true)

    // Fast-forward to 1000ms for confetti
    act(() => {
      vi.advanceTimersByTime(400) // 600 + 400 = 1000
    })
    expect(result.current.confetti.length).toBeGreaterThan(0)

    // Fast-forward to 1400ms to complete animation
    act(() => {
      vi.advanceTimersByTime(400) // 1000 + 400 = 1400
    })
  })

  it("should handle mouse move and calculate tilt", () => {
    const { result } = renderHook(() => useEvolutionAnimation(true, "Rare"))

    // Fast-forward all animations so isAnimating becomes false
    act(() => {
      vi.advanceTimersByTime(1400)
    })

    const mockEvent = {
      clientY: 150,
      clientX: 250,
      currentTarget: {
        getBoundingClientRect: () => ({
          top: 100,
          left: 200,
          width: 100,
          height: 100
        })
      }
    } as unknown as React.MouseEvent<HTMLDivElement>

    act(() => {
      result.current.handleMouseMove(mockEvent)
    })

    // Calculations:
    // rect.height / 2 = 50
    // rect.width / 2 = 50
    // e.clientY - rect.top - height/2 = 150 - 100 - 50 = 0
    // e.clientX - rect.left - width/2 = 250 - 200 - 50 = 0
    expect(result.current.tilt).toEqual({ x: -0, y: 0 })

    const mockEvent2 = {
      clientY: 125, // -25 from center (150)
      clientX: 225, // -25 from center (250)
      currentTarget: {
        getBoundingClientRect: () => ({
          top: 100,
          left: 200,
          width: 100,
          height: 100
        })
      }
    } as unknown as React.MouseEvent<HTMLDivElement>

    act(() => {
      result.current.handleMouseMove(mockEvent2)
    })
    // clientY = 125. (clientY - rect.top - 50) / 50 = (125 - 100 - 50)/50 = -0.5
    // tilt.x = -(-0.5) * 15 = 7.5
    // clientX = 225. (clientX - rect.left - 50) / 50 = (225 - 200 - 50)/50 = -0.5
    // tilt.y = -0.5 * 15 = -7.5
    expect(result.current.tilt.x).toBeCloseTo(7.5)
    expect(result.current.tilt.y).toBeCloseTo(-7.5)

    // Handle mouse leave
    act(() => {
      result.current.handleMouseLeave()
    })
    expect(result.current.tilt).toEqual({ x: 0, y: 0 })
  })

  it("should reset state when isOpen becomes false", () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useEvolutionAnimation(isOpen, "Rare"),
      {
        initialProps: { isOpen: true }
      }
    )

    act(() => {
      vi.advanceTimersByTime(1400)
    })

    expect(result.current.isFlipped).toBe(true)
    expect(result.current.confetti.length).toBeGreaterThan(0)

    // Close
    rerender({ isOpen: false })

    expect(result.current.isFlipped).toBe(false)
    expect(result.current.confetti).toEqual([])
    expect(result.current.tilt).toEqual({ x: 0, y: 0 })
  })
})
