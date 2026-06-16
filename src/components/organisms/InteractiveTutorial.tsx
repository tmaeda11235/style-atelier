import React from "react"

import { useInteractiveTutorial } from "../../hooks/useInteractiveTutorial"
import { SpotlightOverlay } from "./SpotlightOverlay"
import { TutorialTooltip } from "./TutorialTooltip"

// スポットライト境界線部分
interface SpotlightBorderProps {
  rect: { top: number; left: number; width: number; height: number }
}

function SpotlightBorder({ rect }: SpotlightBorderProps) {
  return (
    <div
      className="absolute rounded-lg border-2 border-blue-400 shadow-[0_0_0_4px_rgba(59,130,246,0.2)] transition-all duration-300 pointer-events-none animate-pulse"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }}
    />
  )
}

/**
 * インタラクティブなチュートリアルオーバーレイ。
 * ターゲット要素をスポットライトで強調し、ツールチップで説明を表示する。
 */
export function InteractiveTutorial() {
  const state = useInteractiveTutorial()
  if (!state.isActive || !state.currentConfig) return null

  const { spotlightRect } = state.spotlight

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-none"
      data-testid="interactive-tutorial">
      <SpotlightOverlay spotlightRect={spotlightRect} />
      {spotlightRect && <SpotlightBorder rect={spotlightRect} />}
      <TutorialTooltip
        tooltipRef={state.spotlight.tooltipRef}
        titleRef={state.titleRef}
        tooltipStyle={state.spotlight.tooltipStyle}
        arrowSide={state.spotlight.arrowSide}
        stepText={state.stepText}
        currentStepIndex={state.currentStepIndex}
        totalSteps={state.totalSteps}
        currentConfig={state.currentConfig}
        isMockLoading={state.spotlight.isMockLoading}
        handleMockDrop={state.spotlight.handleMockDrop}
        stopTutorial={state.stopTutorial}
        prevStep={state.prevStep}
        nextStep={state.nextStep}
        handleKeyDown={state.handleKeyDown}
        t={state.t}
        spotlightRect={spotlightRect}
      />
    </div>
  )
}
