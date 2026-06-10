import React, { useCallback, useEffect, useRef, useState } from "react"

import { db } from "../lib/db"

export interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

export const PADDING = 8

export type PositionSide = "top" | "bottom" | "left" | "right"

// ── Helper Hooks ──────────────────────────────────────────────────────────

export function useResizeScrollListener(
  isActive: boolean,
  currentStep: number,
  computePositions: () => void
) {
  const rafRef = useRef<number>(0)
  useEffect(() => {
    if (!isActive) return

    const frame = requestAnimationFrame(() => {
      computePositions()
    })
    rafRef.current = frame

    window.addEventListener("resize", computePositions)
    window.addEventListener("scroll", computePositions, true)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("resize", computePositions)
      window.removeEventListener("scroll", computePositions, true)
    }
  }, [isActive, currentStep, computePositions])
}

export function useRetryTargetSelector(
  isActive: boolean,
  currentStep: number,
  currentConfig: any,
  computePositions: () => void
) {
  useEffect(() => {
    if (!isActive) return
    let retries = 0
    const interval = setInterval(() => {
      if (!currentConfig) return
      const el = document.querySelector(currentConfig.targetSelector)
      if (el) {
        computePositions()
        clearInterval(interval)
      } else if (retries++ > 10) {
        clearInterval(interval)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [isActive, currentStep, currentConfig, computePositions])
}

export function useClickBlocker(
  isActive: boolean,
  currentConfig: any,
  tooltipRef: React.RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    if (!isActive) return
    if (process.env.NODE_ENV === "test" && process.env.BYPASS_VITEST !== "true")
      return

    const handleCaptureClick = (e: MouseEvent) => {
      if (tooltipRef.current?.contains(e.target as Node)) {
        return
      }
      if (currentConfig) {
        const targetEl = document.querySelector(currentConfig.targetSelector)
        if (targetEl?.contains(e.target as Node)) {
          return
        }
      }
      e.stopPropagation()
      e.preventDefault()
    }

    window.addEventListener("click", handleCaptureClick, true)
    window.addEventListener("mousedown", handleCaptureClick, true)
    window.addEventListener("mouseup", handleCaptureClick, true)
    window.addEventListener("pointerdown", handleCaptureClick, true)
    window.addEventListener("pointerup", handleCaptureClick, true)

    return () => {
      window.removeEventListener("click", handleCaptureClick, true)
      window.removeEventListener("mousedown", handleCaptureClick, true)
      window.removeEventListener("mouseup", handleCaptureClick, true)
      window.removeEventListener("pointerdown", handleCaptureClick, true)
      window.removeEventListener("pointerup", handleCaptureClick, true)
    }
  }, [isActive, currentConfig, tooltipRef])
}

export function useMockDrop(nextStep: () => void) {
  const [isMockLoading, setIsMockLoading] = useState(false)
  const handleMockDrop = useCallback(async () => {
    setIsMockLoading(true)
    try {
      const sampleItem = {
        id: `tutorial-sample-${Date.now()}`,
        fullCommand:
          "A majestic neon cyberpunk samurai --ar 1:1 --sref https://example.com/style.jpg --s 750",
        imageUrl: "https://picsum.photos/seed/tutorial/512/512",
        timestamp: Date.now()
      }
      await db.historyItems.put(sampleItem)
      setTimeout(() => {
        nextStep()
        setIsMockLoading(false)
      }, 600)
    } catch (e) {
      console.error("Failed to insert sample history:", e)
      setIsMockLoading(false)
    }
  }, [nextStep])
  return { isMockLoading, handleMockDrop }
}

// ── Helper Functions for Position Calculations ──────────────────────────

export function calculateLeftPosition(
  rect: DOMRect,
  tipWidth: number,
  tipHeight: number,
  tooltipGap: number
) {
  return {
    left: rect.left - tipWidth - tooltipGap,
    top: rect.top + rect.height / 2 - tipHeight / 2
  }
}

export function calculateRightPosition(
  rect: DOMRect,
  tooltipGap: number,
  tipHeight: number
) {
  return {
    left: rect.right + tooltipGap,
    top: rect.top + rect.height / 2 - tipHeight / 2
  }
}

export function calculateBottomPosition(
  rect: DOMRect,
  tipWidth: number,
  tooltipGap: number
) {
  return {
    left: rect.left + rect.width / 2 - tipWidth / 2,
    top: rect.bottom + tooltipGap
  }
}

export function calculateTopPosition(
  rect: DOMRect,
  tipWidth: number,
  tipHeight: number,
  tooltipGap: number
) {
  return {
    left: rect.left + rect.width / 2 - tipWidth / 2,
    top: rect.top - tipHeight - tooltipGap
  }
}

export function resolveLeftPlacement(
  rect: DOMRect,
  tipWidth: number,
  tipHeight: number,
  tooltipGap: number,
  viewportWidth: number
): PositionSide {
  const { left } = calculateLeftPosition(rect, tipWidth, tipHeight, tooltipGap)
  if (left < 8) {
    const { left: rLeft } = calculateRightPosition(rect, tooltipGap, tipHeight)
    if (rLeft + tipWidth > viewportWidth - 8) {
      return "bottom"
    }
    return "right"
  }
  return "left"
}

export function resolveRightPlacement(
  rect: DOMRect,
  tipWidth: number,
  tipHeight: number,
  tooltipGap: number,
  viewportWidth: number
): PositionSide {
  const { left } = calculateRightPosition(rect, tooltipGap, tipHeight)
  if (left + tipWidth > viewportWidth - 8) {
    const { left: lLeft } = calculateLeftPosition(
      rect,
      tipWidth,
      tipHeight,
      tooltipGap
    )
    if (lLeft < 8) {
      return "bottom"
    }
    return "left"
  }
  return "right"
}

export function resolveBottomPlacement(
  rect: DOMRect,
  tipWidth: number,
  tipHeight: number,
  tooltipGap: number,
  viewportHeight: number
): PositionSide {
  const { top } = calculateBottomPosition(rect, tipWidth, tooltipGap)
  if (top + tipHeight > viewportHeight - 8) {
    return "top"
  }
  return "bottom"
}

export function resolveTopPlacement(
  rect: DOMRect,
  tipWidth: number,
  tipHeight: number,
  tooltipGap: number
): PositionSide {
  const { top } = calculateTopPosition(rect, tipWidth, tipHeight, tooltipGap)
  if (top < 8) {
    return "bottom"
  }
  return "top"
}

export function resolvePlacement(
  initialSide: PositionSide,
  rect: DOMRect,
  tipWidth: number,
  tipHeight: number,
  tooltipGap: number,
  viewportWidth: number,
  viewportHeight: number
): PositionSide {
  let side = initialSide

  if (viewportWidth < 360 && (side === "left" || side === "right")) {
    side = "bottom"
  }

  switch (side) {
    case "left":
      return resolveLeftPlacement(
        rect,
        tipWidth,
        tipHeight,
        tooltipGap,
        viewportWidth
      )
    case "right":
      return resolveRightPlacement(
        rect,
        tipWidth,
        tipHeight,
        tooltipGap,
        viewportWidth
      )
    case "bottom":
      return resolveBottomPlacement(
        rect,
        tipWidth,
        tipHeight,
        tooltipGap,
        viewportHeight
      )
    case "top":
      return resolveTopPlacement(rect, tipWidth, tipHeight, tooltipGap)
  }
}

export function calculateCoordinates(
  side: PositionSide,
  rect: DOMRect,
  tipWidth: number,
  tipHeight: number,
  tooltipGap: number
) {
  switch (side) {
    case "top":
      return calculateTopPosition(rect, tipWidth, tipHeight, tooltipGap)
    case "bottom":
      return calculateBottomPosition(rect, tipWidth, tooltipGap)
    case "left":
      return calculateLeftPosition(rect, tipWidth, tipHeight, tooltipGap)
    case "right":
      return calculateRightPosition(rect, tooltipGap, tipHeight)
  }
}

export function calculatePositionsResult(
  currentConfig: any,
  el: HTMLElement | null,
  tipHeight: number,
  viewportWidth: number,
  viewportHeight: number
) {
  const tipWidth = Math.min(280, viewportWidth - 16)
  const tooltipGap = 10

  if (!el) {
    return {
      spotlightRect: null,
      tooltipStyle: {
        top: `${Math.max(8, (viewportHeight - tipHeight) / 2)}px`,
        left: `${Math.max(8, (viewportWidth - tipWidth) / 2)}px`,
        width: `${tipWidth}px`
      },
      arrowSide: currentConfig.position as PositionSide
    }
  }

  const rect = el.getBoundingClientRect()
  const parentRect = document.body.getBoundingClientRect()

  const spotlightRect: SpotlightRect = {
    top: rect.top - parentRect.top - PADDING,
    left: rect.left - parentRect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2
  }

  const side = resolvePlacement(
    currentConfig.position as PositionSide,
    rect,
    tipWidth,
    tipHeight,
    tooltipGap,
    viewportWidth,
    viewportHeight
  )

  const coords = calculateCoordinates(
    side,
    rect,
    tipWidth,
    tipHeight,
    tooltipGap
  )
  const left = Math.max(8, Math.min(coords.left, viewportWidth - tipWidth - 8))
  const top = Math.max(8, Math.min(coords.top, viewportHeight - tipHeight - 8))

  return {
    spotlightRect,
    tooltipStyle: {
      top: `${top}px`,
      left: `${left}px`,
      width: `${tipWidth}px`
    },
    arrowSide: side
  }
}
