import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X
} from "lucide-react"
import React from "react"

// ヘッダー部分
interface TooltipHeaderProps {
  stepText: string
  stopTutorial: () => void
}

function TooltipHeader({ stepText, stopTutorial }: TooltipHeaderProps) {
  return (
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
  )
}

// プログレスバー部分
interface TooltipProgressProps {
  currentStepIndex: number
  totalSteps: number
}

function TooltipProgress({
  currentStepIndex,
  totalSteps
}: TooltipProgressProps) {
  return (
    <div className="w-full bg-slate-800 h-1">
      <div
        className="bg-blue-500 h-1 transition-all duration-500"
        style={{
          width: `${((currentStepIndex + 1) / totalSteps) * 100}%`
        }}
      />
    </div>
  )
}

// コンテンツ部分
interface TooltipContentProps {
  titleRef: React.RefObject<HTMLHeadingElement | null>
  title: string
  description: string
}

function TooltipContent({ titleRef, title, description }: TooltipContentProps) {
  return (
    <div className="px-4 py-3">
      <h3
        ref={titleRef}
        tabIndex={-1}
        className="text-sm font-bold text-white mb-1.5 focus:outline-none">
        {title}
      </h3>
      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
        {description}
      </p>
    </div>
  )
}

// デモアクションボタン部分
interface TooltipDemoActionProps {
  mockActionLabel?: string
  isMockLoading: boolean
  handleMockDrop: () => void
  addingText: string
}

function TooltipDemoAction({
  mockActionLabel,
  isMockLoading,
  handleMockDrop,
  addingText
}: TooltipDemoActionProps) {
  if (!mockActionLabel) return null
  return (
    <div className="px-4 pb-2">
      <button
        onClick={handleMockDrop}
        disabled={isMockLoading}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs text-slate-200 font-semibold transition-all disabled:opacity-50">
        {isMockLoading ? (
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
            {addingText}
          </span>
        ) : (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            {mockActionLabel}
          </>
        )}
      </button>
    </div>
  )
}

// フッター部分
interface TooltipFooterProps {
  config: { autoAdvance?: boolean }
  t: { autoAdvanceHint: string; back: string; next: string; done: string }
  currentStepIndex: number
  totalSteps: number
  prevStep: () => void
  nextStep: () => void
  stopTutorial: () => void
}

function TooltipFooter({
  config,
  t,
  currentStepIndex,
  totalSteps,
  prevStep,
  nextStep,
  stopTutorial
}: TooltipFooterProps) {
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === totalSteps - 1

  return (
    <div className="px-4 pb-4 flex flex-col gap-2">
      {config.autoAdvance && (
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
  )
}

// 矢印用
const ARROW_CLASSES: Record<string, string> = {
  bottom:
    "bottom-full left-1/2 -translate-x-1/2 mb-0.5 border-l-transparent border-r-transparent border-b-transparent border-t-slate-800",
  top: "top-full left-1/2 -translate-x-1/2 mt-0.5 border-l-transparent border-r-transparent border-t-transparent border-b-slate-800",
  left: "left-full top-1/2 -translate-y-1/2 ml-0.5 border-t-transparent border-b-transparent border-l-transparent border-r-slate-800",
  right:
    "right-full top-1/2 -translate-y-1/2 mr-0.5 border-t-transparent border-b-transparent border-r-transparent border-l-slate-800"
}

// メインコンポーネント
export interface TutorialTooltipProps {
  tooltipRef: React.RefObject<HTMLDivElement | null>
  titleRef: React.RefObject<HTMLHeadingElement | null>
  tooltipStyle: React.CSSProperties
  arrowSide: string
  stepText: string
  currentStepIndex: number
  totalSteps: number
  currentConfig: {
    title: string
    description: string
    mockActionLabel?: string
    autoAdvance?: boolean
  }
  isMockLoading: boolean
  handleMockDrop: () => void
  stopTutorial: () => void
  prevStep: () => void
  nextStep: () => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
  t: {
    adding: string
    autoAdvanceHint: string
    back: string
    done: string
    next: string
  }
  spotlightRect: {
    top: number
    left: number
    width: number
    height: number
  } | null
}

export function TutorialTooltip(props: TutorialTooltipProps) {
  const { tooltipRef, handleKeyDown, tooltipStyle, spotlightRect, arrowSide } =
    props
  return (
    <div
      ref={tooltipRef}
      onKeyDown={handleKeyDown}
      className="fixed pointer-events-auto z-[101] animate-in fade-in zoom-in-95 duration-200"
      style={tooltipStyle}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        <TooltipHeader
          stepText={props.stepText}
          stopTutorial={props.stopTutorial}
        />
        <TooltipProgress
          currentStepIndex={props.currentStepIndex}
          totalSteps={props.totalSteps}
        />
        <TooltipContent
          titleRef={props.titleRef}
          title={props.currentConfig.title}
          description={props.currentConfig.description}
        />
        <TooltipDemoAction
          mockActionLabel={props.currentConfig.mockActionLabel}
          isMockLoading={props.isMockLoading}
          handleMockDrop={props.handleMockDrop}
          addingText={props.t.adding}
        />
        <TooltipFooter
          config={props.currentConfig}
          t={props.t}
          currentStepIndex={props.currentStepIndex}
          totalSteps={props.totalSteps}
          prevStep={props.prevStep}
          nextStep={props.nextStep}
          stopTutorial={props.stopTutorial}
        />
      </div>

      {spotlightRect && (
        <div
          className={`absolute w-0 h-0 border-8 ${ARROW_CLASSES[arrowSide] || ARROW_CLASSES.bottom}`}
          style={{ pointerEvents: "none" }}
        />
      )}
    </div>
  )
}
