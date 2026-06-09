import React, { useCallback, useEffect, useRef, useState } from "react"

import { useTutorial } from "../contexts/TutorialContext"
import { db } from "../lib/db"

export interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

const PADDING = 8

/**
 * Custom hook to manage the tutorial spotlight positioning, events,
 * viewport resizing, click blocking, and mock data insertion.
 *
 * @returns spotlightRect, tooltipStyle, arrowSide, tooltipRef, isMockLoading, and handleMockDrop.
 */
export function useSpotlight() {
  const { isActive, currentStep, currentConfig, nextStep } = useTutorial()

  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [arrowSide, setArrowSide] = useState<
    "top" | "bottom" | "left" | "right"
  >("bottom")
  const [isMockLoading, setIsMockLoading] = useState(false)

  const tooltipRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  const computePositions = useCallback(() => {
    if (!currentConfig) return
    const selector = currentConfig.targetSelector
    const el = document.querySelector(selector) as HTMLElement | null

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const tipWidth = Math.min(280, viewportWidth - 16)
    const tipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : 200
    const tooltipGap = 10

    if (!el) {
      setSpotlightRect(null)
      setTooltipStyle({
        top: `${Math.max(8, (viewportHeight - tipHeight) / 2)}px`,
        left: `${Math.max(8, (viewportWidth - tipWidth) / 2)}px`,
        width: `${tipWidth}px`
      })
      return
    }

    const rect = el.getBoundingClientRect()
    const parentRect = document.body.getBoundingClientRect()

    const sr: SpotlightRect = {
      top: rect.top - parentRect.top - PADDING,
      left: rect.left - parentRect.left - PADDING,
      width: rect.width + PADDING * 2,
      height: rect.height + PADDING * 2
    }
    setSpotlightRect(sr)

    let top = 0
    let left = 0
    let side = currentConfig.position

    // Narrow screen support
    if (viewportWidth < 360 && (side === "left" || side === "right")) {
      side = "bottom"
    }

    if (side === "left") {
      left = rect.left - tipWidth - tooltipGap
      top = rect.top + rect.height / 2 - tipHeight / 2
      if (left < 8) {
        left = rect.right + tooltipGap
        side = "right"
        if (left + tipWidth > viewportWidth - 8) {
          side = "bottom"
        }
      }
    }

    if (side === "right") {
      left = rect.right + tooltipGap
      top = rect.top + rect.height / 2 - tipHeight / 2
      if (left + tipWidth > viewportWidth - 8) {
        left = rect.left - tipWidth - tooltipGap
        side = "left"
        if (left < 8) {
          side = "bottom"
        }
      }
    }

    if (side === "bottom") {
      left = rect.left + rect.width / 2 - tipWidth / 2
      top = rect.bottom + tooltipGap
      if (top + tipHeight > viewportHeight - 8) {
        top = rect.top - tipHeight - tooltipGap
        side = "top"
      }
    }

    if (side === "top") {
      left = rect.left + rect.width / 2 - tipWidth / 2
      top = rect.top - tipHeight - tooltipGap
      if (top < 8) {
        top = rect.bottom + tooltipGap
        side = "bottom"
      }
    }

    // Re-calculate based on final chosen side
    if (side === "top") {
      top = rect.top - tipHeight - tooltipGap
      left = rect.left + rect.width / 2 - tipWidth / 2
    } else if (side === "bottom") {
      top = rect.bottom + tooltipGap
      left = rect.left + rect.width / 2 - tipWidth / 2
    } else if (side === "left") {
      left = rect.left - tipWidth - tooltipGap
      top = rect.top + rect.height / 2 - tipHeight / 2
    } else if (side === "right") {
      left = rect.right + tooltipGap
      top = rect.top + rect.height / 2 - tipHeight / 2
    }

    left = Math.max(8, Math.min(left, viewportWidth - tipWidth - 8))
    top = Math.max(8, Math.min(top, viewportHeight - tipHeight - 8))

    setArrowSide(side)
    setTooltipStyle({
      top: `${top}px`,
      left: `${left}px`,
      width: `${tipWidth}px`
    })
  }, [currentConfig])

  useEffect(() => {
    if (!isActive) {
      setSpotlightRect(null)
      return
    }

    // Wait one frame for DOM to update after tab/view changes
    const frame = requestAnimationFrame(() => {
      computePositions()
    })
    rafRef.current = frame

    // Re-compute on resize and scroll
    window.addEventListener("resize", computePositions)
    window.addEventListener("scroll", computePositions, true)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("resize", computePositions)
      window.removeEventListener("scroll", computePositions, true)
    }
  }, [isActive, currentStep, computePositions])

  // Retry finding the target if not found initially
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

  // Capture-phase event listener to block clicks outside target & tooltip, while allowing scroll
  useEffect(() => {
    if (!isActive) return
    if (process.env.NODE_ENV === "test" && process.env.BYPASS_VITEST !== "true")
      return

    const handleCaptureClick = (e: MouseEvent) => {
      // 1. Allow any clicks inside the tooltip
      if (tooltipRef.current?.contains(e.target as Node)) {
        return
      }

      // 2. Allow clicks on the target element (the spotlighted element)
      if (currentConfig) {
        const targetEl = document.querySelector(currentConfig.targetSelector)
        if (targetEl?.contains(e.target as Node)) {
          return
        }
      }

      // Block all other clicks
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
  }, [isActive, currentConfig])

  // ── Mock action for step 1 (drag & drop) ──────────────────────────────
  const handleMockDrop = async () => {
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
      // Advance step after a short delay so the UI can update
      setTimeout(() => {
        nextStep()
        setIsMockLoading(false)
      }, 600)
    } catch (e) {
      console.error("Failed to insert sample history:", e)
      setIsMockLoading(false)
    }
  }

  return {
    spotlightRect,
    tooltipStyle,
    arrowSide,
    tooltipRef,
    isMockLoading,
    handleMockDrop
  }
}
