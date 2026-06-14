import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X
} from "lucide-react"
import React, { useEffect, useRef } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useTutorial } from "../../contexts/TutorialContext"
import { useSpotlight } from "../../hooks/useSpotlight"

/**
 * インタラクティブなチュートリアルオーバーレイ。
 * ターゲット要素をスポットライトで強調し、ツールチップで説明を表示する。
 */
const ARROW_CLASSES: Record<string, string> = {
  bottom:
    "bottom-full left-1/2 -translate-x-1/2 mb-0.5 border-l-transparent border-r-transparent border-b-transparent border-t-slate-800",
  top: "top-full left-1/2 -translate-x-1/2 mt-0.5 border-l-transparent border-r-transparent border-t-transparent border-b-slate-800",
  left: "left-full top-1/2 -translate-y-1/2 ml-0.5 border-t-transparent border-b-transparent border-l-transparent border-r-slate-800",
  right:
    "right-full top-1/2 -translate-y-1/2 mr-0.5 border-t-transparent border-b-transparent border-r-transparent border-l-slate-800"
}

export function InteractiveTutorial() {
  const {
    isActive,
    currentStepIndex,
    currentConfig,
    totalSteps,
    nextStep,
    prevStep,
    stopTutorial
  } = useTutorial()
  const { t: i18n } = useLanguage()
  const t = i18n.interactiveTutorial

  const stepText = t.step
    .replace("{{current}}", String(currentStepIndex + 1))
    .replace("{{total}}", String(totalSteps))

  const {
    spotlightRect,
    tooltipStyle,
    arrowSide,
    tooltipRef,
    isMockLoading,
    handleMockDrop
  } = useSpotlight()

  const returnFocusRef = useRef<HTMLElement | null>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  // 1. チュートリアル開始時の activeElement を記録し、終了時に戻す
  useEffect(() => {
    if (isActive) {
      returnFocusRef.current = document.activeElement as HTMLElement | null
    } else {
      if (returnFocusRef.current) {
        const elementToFocus = returnFocusRef.current
        setTimeout(() => {
          elementToFocus.focus()
        }, 50)
        returnFocusRef.current = null
      }
    }
  }, [isActive])

  // 2. ステップ切り替え時に見出し（h3）または最初のボタンにフォーカスを当てる
  useEffect(() => {
    if (isActive && currentStepIndex !== undefined) {
      const timer = setTimeout(() => {
        if (titleRef.current) {
          titleRef.current.focus()
        } else if (tooltipRef.current) {
          const focusables = tooltipRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
          if (focusables.length > 0) {
            focusables[0].focus()
          }
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isActive, currentStepIndex])

  // 3. Tabキーによるループ (Focus Trap)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return
    if (!tooltipRef.current) return

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const focusables = Array.from(
      tooltipRef.current.querySelectorAll<HTMLElement>(focusableSelector)
    )

    if (focusables.length === 0) return

    const firstElement = focusables[0]
    const lastElement = focusables[focusables.length - 1]
    const activeElement = document.activeElement

    if (e.shiftKey) {
      // Shift + Tab: firstElement から lastElement へ
      if (activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
      }
    } else {
      // Tab: lastElement から firstElement へ
      if (activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
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
        onKeyDown={handleKeyDown}
        className="fixed pointer-events-auto z-[101] animate-in fade-in zoom-in-95 duration-200"
        style={tooltipStyle}>
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-950 px-4 py-3 flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                {stepText}
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
            <h3
              ref={titleRef}
              tabIndex={-1}
              className="text-sm font-bold text-white mb-1.5 focus:outline-none">
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
        {spotlightRect && (
          <div
            className={`absolute w-0 h-0 border-8 ${ARROW_CLASSES[arrowSide] || ARROW_CLASSES.bottom}`}
            style={{ pointerEvents: "none" }}
          />
        )}
      </div>
    </div>
  )
}
