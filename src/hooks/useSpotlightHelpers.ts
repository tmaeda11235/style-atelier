import React, { useCallback, useEffect, useRef, useState } from "react"

import { db } from "../lib/db"

export type { SpotlightRect, PositionSide } from "./useSpotlightCoordinates"
export { PADDING, calculatePositionsResult } from "./useSpotlightCoordinates"

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
