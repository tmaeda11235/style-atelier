import React, { createContext, useContext, useState, useCallback } from "react"

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

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    id: "drop-history",
    title: "① HistoryにD&Dする",
    description: "Midjourneyで生成した画像を、このパネルのHistoryタブにドラッグ＆ドロップしてください。\nテスト用のサンプルを追加することもできます。",
    targetSelector: "[data-tutorial='history-drop-zone']",
    position: "bottom",
    autoAdvance: true,
    mockActionLabel: "サンプルを追加して進む",
  },
  {
    id: "mint-button",
    title: "② Mintボタンを押す",
    description: "追加されたHistoryアイテムの「Mint Card」ボタンを押して、カードの作成を開始してください。",
    targetSelector: "[data-tutorial='mint-button']",
    position: "bottom",
    autoAdvance: true,
  },
  {
    id: "title-input",
    title: "③ タイトルを入れる",
    description: "キーワードを選択するか、カスタム名を入力してカードのタイトルを設定してください。設定できたら「Next」を押してください。",
    targetSelector: "[data-tutorial='title-input']",
    position: "bottom",
    autoAdvance: false,
  },
  {
    id: "slot-selection",
    title: "④ スロットを選ぶ",
    description: "プロンプトのバブルをクリックして「Slot」に変換できます。Slotは後でWorkbenchで自由に変更できる変数になります。設定できたら「Next」を押してください。",
    targetSelector: "[data-tutorial='prompt-segment-bubble']",
    position: "bottom",
    autoAdvance: false,
  },
  {
    id: "rarity-save",
    title: "⑤ レア度を選ぶ",
    description: "カードのレア度（Common / Rare / Epic / Legendary）を選択してください。選択できたら「次へ」を押してください。",
    targetSelector: "[data-tutorial='rarity-section']",
    position: "top",
    autoAdvance: false,
  },
  {
    id: "save-card",
    title: "⑥ Save Cardを押す",
    description: "「Save Card」を押してカードをLibraryに登録してください。",
    targetSelector: "[data-tutorial='mint-save-footer']",
    position: "top",
    autoAdvance: true,
  },
  {
    id: "card-to-hand",
    title: "⑦ カードをWorkbenchへ送る",
    description: "LibraryのStyleCardをクリックすると、画面下部のWorkbenchバーに追加され、自動的にWorkbenchと同期します。追加できたら「次へ」を押してください。",
    targetSelector: "[data-tutorial='library-card-grid']",
    position: "bottom",
    autoAdvance: false,
  },
  {
    id: "workbench-edit",
    title: "⑧ Workbenchで編集する",
    description: "Workbenchタブに切り替えると、送られたカードのSlotの値を編集し、プロンプトをMidjourneyに送信できます。ガイドは以上です！",
    targetSelector: "[data-tutorial='workbench-tab']",
    position: "bottom",
    autoAdvance: false,
  },
]

const STEP_IDS = TUTORIAL_STEPS.map((s) => s.id) as NonNullable<TutorialStep>[]

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

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const currentStep = isActive ? STEP_IDS[currentStepIndex] : null
  const currentConfig = isActive ? TUTORIAL_STEPS[currentStepIndex] : null

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
        advanceIfStep,
      }}
    >
      {children}
    </TutorialContext.Provider>
  )
}

export const useTutorial = (): TutorialContextType => {
  const ctx = useContext(TutorialContext)
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider")
  return ctx
}
