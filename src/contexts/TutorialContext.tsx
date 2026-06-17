import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from "react"

import { useLanguage } from "./LanguageContext"
import { DEFAULT_EXPERT_FEATURES, SettingsContext } from "./SettingsContext"

/** チュートリアルの各ステップ定義 */
export type TutorialStep =
  | "drop-history"
  | "mint-button"
  | "title-input"
  | "slot-selection"
  | "rarity-save"
  | "save-card"
  | "card-to-hand"
  | "workbench-edit"
  | null

export interface TutorialStepConfig {
  id: TutorialStep
  title: string
  description: string
  targetSelector: string
  position: "top" | "bottom" | "left" | "right"
  /** ユーザーの操作を待って自動進行するか (false の場合は手動で Next を押す) */
  autoAdvance: boolean
  /** 模擬アクションのラベル (自動進行が難しい場合) */
  mockActionLabel?: string
}

export const STEP_METADATA = [
  {
    id: "drop-history" as TutorialStep,
    targetSelector: "[data-tutorial='history-drop-zone']",
    position: "bottom" as const,
    autoAdvance: true
  },
  {
    id: "mint-button" as TutorialStep,
    targetSelector: "[data-tutorial='mint-button']",
    position: "bottom" as const,
    autoAdvance: true
  },
  {
    id: "title-input" as TutorialStep,
    targetSelector: "[data-tutorial='title-input']",
    position: "bottom" as const,
    autoAdvance: false
  },
  {
    id: "slot-selection" as TutorialStep,
    targetSelector: "[data-tutorial='prompt-segment-bubble']",
    position: "bottom" as const,
    autoAdvance: false
  },
  {
    id: "rarity-save" as TutorialStep,
    targetSelector: "[data-tutorial='rarity-section']",
    position: "top" as const,
    autoAdvance: false
  },
  {
    id: "save-card" as TutorialStep,
    targetSelector: "[data-tutorial='mint-save-footer']",
    position: "top" as const,
    autoAdvance: true
  },
  {
    id: "card-to-hand" as TutorialStep,
    targetSelector: "[data-tutorial='library-card-grid']",
    position: "bottom" as const,
    autoAdvance: false
  },
  {
    id: "workbench-edit" as TutorialStep,
    targetSelector: "[data-tutorial='workbench-tab']",
    position: "bottom" as const,
    autoAdvance: false
  }
]

const STEP_IDS = STEP_METADATA.map((s) => s.id) as NonNullable<TutorialStep>[]

interface TutorialContextType {
  isActive: boolean
  currentStep: TutorialStep
  currentStepIndex: number
  currentConfig: TutorialStepConfig | null
  totalSteps: number
  startTutorial: () => void
  stopTutorial: () => void
  nextStep: () => void
  prevStep: () => void
  advanceIfStep: (step: TutorialStep) => void
}

const TutorialContext = createContext<TutorialContextType | undefined>(
  undefined
)

/* eslint-disable max-lines-per-function */
export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [isActive, setIsActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const { t } = useLanguage()
  const settingsContext = useContext(SettingsContext)
  const expertFeatures =
    settingsContext?.expertFeatures || DEFAULT_EXPERT_FEATURES

  const tutorialSteps = STEP_METADATA.map((meta, index) => {
    const stepTranslation = t.tutorial.steps[index]
    return {
      ...meta,
      title: stepTranslation.title,
      description: stepTranslation.description,
      mockActionLabel: stepTranslation.mockActionLabel
    } as TutorialStepConfig
  })

  const currentStep = isActive ? STEP_IDS[currentStepIndex] : null
  const currentConfig = isActive ? tutorialSteps[currentStepIndex] : null

  const startTutorial = useCallback(() => {
    setCurrentStepIndex(0)
    setIsActive(true)
  }, [])

  const stopTutorial = useCallback(() => {
    setIsActive(false)
  }, [])

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev >= STEP_IDS.length - 1) {
        setIsActive(false)
        return 0
      }
      return prev + 1
    })
  }, [])

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1))
  }, [])

  /**
   * 特定のステップがアクティブなときのみ進む (ユーザー操作による自動進行)
   */
  const advanceIfStep = useCallback(
    (step: TutorialStep) => {
      if (isActive && currentStep === step) {
        nextStep()
      }
    },
    [isActive, currentStep, nextStep]
  )

  useEffect(() => {
    if (isActive && currentStep === "rarity-save" && !expertFeatures.rarity) {
      nextStep()
    }
  }, [isActive, currentStep, expertFeatures.rarity, nextStep])

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        currentStepIndex,
        currentConfig,
        totalSteps: STEP_IDS.length,
        startTutorial,
        stopTutorial,
        nextStep,
        prevStep,
        advanceIfStep
      }}>
      {children}
    </TutorialContext.Provider>
  )
}
/* eslint-enable max-lines-per-function */

export const useTutorial = (): TutorialContextType => {
  const ctx = useContext(TutorialContext)
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider")
  return ctx
}
