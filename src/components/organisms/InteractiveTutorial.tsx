import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X
} from "lucide-react"
import React, { useCallback, useEffect, useRef, useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useTutorial } from "../../contexts/TutorialContext"
import { useHistory } from "../../hooks/useHistory"

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

const PADDING = 8

/**
 * インタラクティブなチュートリアルオーバーレイ。
 * ターゲット要素をスポットライトで強調し、ツールチップで説明を表示する。
 */
export function InteractiveTutorial() {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    currentConfig,
    totalSteps,
    nextStep,
    prevStep,
    stopTutorial
  } = useTutorial()
  const { addHistoryItem } = useHistory()
  const { t: i18n } = useLanguage()
  const t = i18n.interactiveTutorial
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
    if (process.env.NODE_ENV === "test") return

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
      await addHistoryItem(sampleItem)
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

  if (!isActive || !currentConfig) return null

  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === totalSteps - 1

  // ── Spotlight: 4 overlay rects around the cutout ───────────────────────
  // clip-path は視覚的にはカットアウトを作れるが、親 div のポインタイベントを
  // ブロックしてしまう。代わりにスポットライト周囲の4枚の矩形で覆う方式にする。
  const renderSpotlight = () => {
    const bg = "rgba(2, 6, 23, 0.75)"
    const base: React.CSSProperties = {
      position: "fixed",
      background: bg,
      pointerEvents: "none"
    }

    if (!spotlightRect) {
      return (
        <div
          style={{ ...base, inset: 0, pointerEvents: "none" }}
          aria-label="Tutorial overlay"
        />
      )
    }

    const { top, left, width, height } = spotlightRect
    const right = left + width
    const bottom = top + height

    return (
      <>
        {/* Top */}
        <div style={{ ...base, top: 0, left: 0, right: 0, height: top }} />
        {/* Bottom */}
        <div style={{ ...base, top: bottom, left: 0, right: 0, bottom: 0 }} />
        {/* Left */}
        <div style={{ ...base, top, left: 0, width: left, height }} />
        {/* Right */}
        <div style={{ ...base, top, left: right, right: 0, height }} />
      </>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-none"
      data-testid="interactive-tutorial">
      {/* 4-rect spotlight overlay - only covers areas outside the spotlight */}
      {renderSpotlight()}

      {/* Spotlight border ring */}
      {spotlightRect && (
        <div
          className="absolute rounded-lg border-2 border-blue-400 shadow-[0_0_0_4px_rgba(59,130,246,0.2)] transition-all duration-300 pointer-events-none animate-pulse"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="fixed pointer-events-auto z-[101] animate-in fade-in zoom-in-95 duration-200"
        style={tooltipStyle}>
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-950 px-4 py-3 flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Step {currentStepIndex + 1} / {totalSteps}
              </span>
            </div>
            <button
              onClick={stopTutorial}
              className="text-slate-600 hover:text-slate-300 transition-colors p-1 rounded"
              aria-label="Close tutorial">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-1">
            <div
              className="bg-blue-500 h-1 transition-all duration-500"
              style={{
                width: `${((currentStepIndex + 1) / totalSteps) * 100}%`
              }}
            />
          </div>

          {/* Content */}
          <div className="px-4 py-3">
            <h3 className="text-sm font-bold text-white mb-1.5">
              {currentConfig.title}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {currentConfig.description}
            </p>
          </div>

          {/* Mock action button (for step 1 - drag & drop) */}
          {currentConfig.mockActionLabel && (
            <div className="px-4 pb-2">
              <button
                onClick={handleMockDrop}
                disabled={isMockLoading}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs text-slate-200 font-semibold transition-all disabled:opacity-50">
                {isMockLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                    {t.adding}
                  </span>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    {currentConfig.mockActionLabel}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Footer actions */}
          <div className="px-4 pb-4 flex flex-col gap-2">
            {currentConfig.autoAdvance && (
              <span className="text-[10px] text-slate-500 italic text-center w-full block">
                {t.autoAdvanceHint}
              </span>
            )}
            <div className="flex gap-2 justify-between items-center w-full">
              <button
                onClick={prevStep}
                disabled={isFirstStep}
                className={`flex items-center gap-1 text-xs font-semibold py-1.5 px-3 rounded-lg border transition-all ${
                  isFirstStep
                    ? "border-slate-800 text-slate-700 cursor-not-allowed"
                    : "border-slate-700 text-slate-300 bg-slate-800 hover:bg-slate-700"
                }`}>
                <ChevronLeft className="w-3.5 h-3.5" /> {t.back}
              </button>

              <button
                onClick={isLastStep ? stopTutorial : nextStep}
                className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-2 px-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-white shadow transition-all">
                {isLastStep ? (
                  <>
                    {t.done} <Sparkles className="w-3.5 h-3.5 ml-0.5" />
                  </>
                ) : (
                  <>
                    {t.next} <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Arrow pointing toward the spotlight */}
        {spotlightRect &&
          (() => {
            const arrowClass: Record<string, string> = {
              bottom:
                "bottom-full left-1/2 -translate-x-1/2 mb-0.5 border-l-transparent border-r-transparent border-b-transparent border-t-slate-800",
              top: "top-full left-1/2 -translate-x-1/2 mt-0.5 border-l-transparent border-r-transparent border-t-transparent border-b-slate-800",
              left: "left-full top-1/2 -translate-y-1/2 ml-0.5 border-t-transparent border-b-transparent border-l-transparent border-r-slate-800",
              right:
                "right-full top-1/2 -translate-y-1/2 mr-0.5 border-t-transparent border-b-transparent border-r-transparent border-l-slate-800"
            }
            return (
              <div
                className={`absolute w-0 h-0 border-8 ${arrowClass[arrowSide] || arrowClass.bottom}`}
                style={{ pointerEvents: "none" }}
              />
            )
          })()}
      </div>
    </div>
  )
}
