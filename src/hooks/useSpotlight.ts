import React, { useCallback, useRef, useState } from "react"

import { useTutorial } from "../contexts/TutorialContext"
import {
  calculatePositionsResult,
  useClickBlocker,
  useMockDrop,
  useResizeScrollListener,
  useRetryTargetSelector
} from "./useSpotlightHelpers"
import type { PositionSide, SpotlightRect } from "./useSpotlightHelpers"

export function useSpotlight() {
  const { isActive, currentStep, currentConfig, nextStep } = useTutorial()

  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [arrowSide, setArrowSide] = useState<PositionSide>("bottom")

  const tooltipRef = useRef<HTMLDivElement>(null)

  const computePositions = useCallback(() => {
    if (!currentConfig) return
    const el = document.querySelector(
      currentConfig.targetSelector
    ) as HTMLElement | null
    const tipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : 200

    const result = calculatePositionsResult(
      currentConfig,
      el,
      tipHeight,
      window.innerWidth,
      window.innerHeight
    )

    setSpotlightRect(result.spotlightRect)
    setTooltipStyle(result.tooltipStyle)
    setArrowSide(result.arrowSide)
  }, [currentConfig])

  useResizeScrollListener(isActive, currentStep, computePositions)
  useRetryTargetSelector(isActive, currentStep, currentConfig, computePositions)
  useClickBlocker(isActive, currentConfig, tooltipRef)

  const { isMockLoading, handleMockDrop } = useMockDrop(nextStep)

  return {
    spotlightRect,
    tooltipStyle,
    arrowSide,
    tooltipRef,
    isMockLoading,
    handleMockDrop
  }
}
