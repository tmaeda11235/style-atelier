import React, { useEffect, useRef, useState, useCallback } from "react"
import { X, ChevronLeft, ChevronRight, Sparkles, AlertTriangle } from "lucide-react"
import { useTutorial } from "../../contexts/TutorialContext"
import { db } from "../../lib/db"

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
  const { isActive, currentStep, currentStepIndex, currentConfig, totalSteps, nextStep, prevStep, stopTutorial } =
    useTutorial()
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [arrowSide, setArrowSide] = useState<"top" | "bottom" | "left" | "right">("bottom")
  const [isMockLoading, setIsMockLoading] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)

  const computePositions = useCallback(() => {
    if (!currentConfig) return
    const selector = currentConfig.targetSelector
    const el = document.querySelector(selector) as HTMLElement | null
    if (!el) return

    const rect = el.getBoundingClientRect()
    const parentRect = document.body.getBoundingClientRect()

    const sr: SpotlightRect = {
      top: rect.top - parentRect.top - PADDING,
      left: rect.left - parentRect.left - PADDING,
      width: rect.width + PADDING * 2,
      height: rect.height + PADDING * 2,
    }
    setSpotlightRect(sr)

    // Tooltip positioning
    const tooltipWidth = 280
    const tooltipGap = 14

    let tipStyle: React.CSSProperties = {}
    let side = currentConfig.position

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (side === "bottom") {
      const top = rect.bottom + tooltipGap
      const left = Math.max(8, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, viewportWidth - tooltipWidth - 8))
      // If tooltip overflows viewport bottom, flip to top
      if (top + 200 > viewportHeight) {
        side = "top"
      } else {
        tipStyle = { top, left, width: tooltipWidth }
      }
    }
    if (side === "top") {
      const left = Math.max(8, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, viewportWidth - tooltipWidth - 8))
      tipStyle = { bottom: viewportHeight - rect.top + tooltipGap, left, width: tooltipWidth }
    }
    if (side === "left") {
      tipStyle = {
        top: Math.max(8, rect.top + rect.height / 2 - 80),
        right: viewportWidth - rect.left + tooltipGap,
        width: tooltipWidth,
      }
    }
    if (side === "right") {
      tipStyle = {
        top: Math.max(8, rect.top + rect.height / 2 - 80),
        left: rect.right + tooltipGap,
        width: tooltipWidth,
      }
    }

    setArrowSide(side)
    setTooltipStyle(tipStyle)
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

  // ── Mock action for step 1 (drag & drop) ──────────────────────────────
  const handleMockDrop = async () => {
    setIsMockLoading(true)
    try {
      const sampleItem = {
        id: `tutorial-sample-${Date.now()}`,
        fullCommand: "A majestic neon cyberpunk samurai --ar 1:1 --sref https://example.com/style.jpg --s 750",
        imageUrl: "https://picsum.photos/seed/tutorial/512/512",
        timestamp: Date.now(),
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

  if (!isActive || !currentConfig) return null

  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === totalSteps - 1

  // ── Spotlight clip path ────────────────────────────────────────────────
  const renderSpotlight = () => {
    const vw = window.innerWidth
    const vh = window.innerHeight || document.documentElement.clientHeight

    if (!spotlightRect) {
      // Full overlay with no cutout
      return (
        <div
          className="absolute inset-0 bg-slate-950/70"
          onClick={stopTutorial}
          aria-label="Click to close tutorial"
        />
      )
    }

    const { top, left, width, height } = spotlightRect
    const clipPath = `polygon(
      0 0,
      ${vw}px 0,
      ${vw}px ${vh}px,
      0 ${vh}px,
      0 0,
      ${left}px ${top}px,
      ${left}px ${top + height}px,
      ${left + width}px ${top + height}px,
      ${left + width}px ${top}px,
      ${left}px ${top}px
    )`

    return (
      <div
        className="absolute inset-0 transition-all duration-300"
        style={{
          background: "rgba(2, 6, 23, 0.75)",
          clipPath,
          backdropFilter: "blur(1px)",
        }}
      />
    )
  }

  // ── Arrow indicator for tooltip ─────────────────────────────────────────
  const arrowClass: Record<string, string> = {
    bottom: "bottom-full left-1/2 -translate-x-1/2 mb-0.5 border-l-transparent border-r-transparent border-b-transparent border-t-slate-800",
    top: "top-full left-1/2 -translate-x-1/2 mt-0.5 border-l-transparent border-r-transparent border-t-transparent border-b-slate-800",
    left: "left-full top-1/2 -translate-y-1/2 ml-0.5 border-t-transparent border-b-transparent border-l-transparent border-r-slate-800",
    right: "right-full top-1/2 -translate-y-1/2 mr-0.5 border-t-transparent border-b-transparent border-r-transparent border-l-slate-800",
  }

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-none"
      data-testid="interactive-tutorial"
    >
      {/* Spotlight overlay (pointer-events: auto for background click) */}
      <div className="absolute inset-0 pointer-events-auto">
        {renderSpotlight()}
      </div>

      {/* Spotlight border ring */}
      {spotlightRect && (
        <div
          className="absolute rounded-lg border-2 border-blue-400 shadow-[0_0_0_4px_rgba(59,130,246,0.2)] transition-all duration-300 pointer-events-none animate-pulse"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="fixed pointer-events-auto z-[101] animate-in fade-in zoom-in-95 duration-200"
        style={tooltipStyle}
      >
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
              aria-label="Close tutorial"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-1">
            <div
              className="bg-blue-500 h-1 transition-all duration-500"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="px-4 py-3">
            <h3 className="text-sm font-bold text-white mb-1.5">{currentConfig.title}</h3>
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
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs text-slate-200 font-semibold transition-all disabled:opacity-50"
              >
                {isMockLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                    追加中...
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
          <div className="px-4 pb-4 flex gap-2 justify-between items-center">
            <button
              onClick={prevStep}
              disabled={isFirstStep}
              className={`flex items-center gap-1 text-xs font-semibold py-1.5 px-3 rounded-lg border transition-all ${
                isFirstStep
                  ? "border-slate-800 text-slate-700 cursor-not-allowed"
                  : "border-slate-700 text-slate-300 bg-slate-800 hover:bg-slate-700"
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> 戻る
            </button>

            {currentConfig.autoAdvance && !currentConfig.mockActionLabel ? (
              <span className="text-[10px] text-slate-500 italic flex-1 text-center">
                操作を行うと自動で進みます
              </span>
            ) : !currentConfig.autoAdvance ? (
              <button
                onClick={isLastStep ? stopTutorial : nextStep}
                className="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-2 px-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-white shadow transition-all"
              >
                {isLastStep ? (
                  <>完了！ <Sparkles className="w-3.5 h-3.5 ml-0.5" /></>
                ) : (
                  <>次へ <ChevronRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            ) : null}

            {currentConfig.autoAdvance && currentConfig.mockActionLabel && (
              <span className="text-[10px] text-slate-500 italic flex-1 text-center">
                操作を行うと自動で進みます
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div
          className={`absolute w-0 h-0 border-8 ${arrowClass[arrowSide] || arrowClass.bottom}`}
          style={{ pointerEvents: "none" }}
        />
      </div>
    </div>
  )
}
