import React, { useEffect, useRef } from "react"

import { useLanguage } from "../contexts/LanguageContext"
import { useTutorial } from "../contexts/TutorialContext"
import { useSpotlight } from "./useSpotlight"

// 1. チュートリアル開始時の activeElement を記録し、終了時に戻す
function useFocusReturn(isActive: boolean) {
  const returnFocusRef = useRef<HTMLElement | null>(null)

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
}

// 2. ステップ切り替え時に見出し（h3）または最初のボタンにフォーカスを当てる
function useStepFocus(
  isActive: boolean,
  currentStepIndex: number | undefined,
  titleRef: React.RefObject<HTMLHeadingElement | null>,
  tooltipRef: React.RefObject<HTMLDivElement | null>
) {
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
  }, [isActive, currentStepIndex, titleRef, tooltipRef])
}

// 3. Tabキーによるループ (Focus Trap)
function useFocusTrap(tooltipRef: React.RefObject<HTMLDivElement | null>) {
  return (e: React.KeyboardEvent<HTMLDivElement>) => {
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
      if (activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
      }
    } else {
      if (activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
    }
  }
}

export function useInteractiveTutorial() {
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

  const spotlight = useSpotlight()
  const titleRef = useRef<HTMLHeadingElement>(null)

  useFocusReturn(isActive)
  useStepFocus(isActive, currentStepIndex, titleRef, spotlight.tooltipRef)
  const handleKeyDown = useFocusTrap(spotlight.tooltipRef)

  return {
    isActive,
    currentStepIndex,
    currentConfig,
    totalSteps,
    nextStep,
    prevStep,
    stopTutorial,
    t,
    stepText,
    spotlight,
    titleRef,
    handleKeyDown
  }
}
