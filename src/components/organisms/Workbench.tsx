import React, { useCallback, useEffect, useMemo, useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useChromeTabConnection } from "../../hooks/useChromeTabConnection"
import { useEvolution } from "../../hooks/useEvolution"
import { usePromptInjector } from "../../hooks/usePromptInjector"
import { usePromptSegmentsSync } from "../../hooks/usePromptSegmentsSync"
import { useWorkbench } from "../../hooks/useWorkbench"
import type { PromptSegment, RecipeHistoryItem } from "../../lib/db-schema"
import { type AlertType } from "../molecules/ConnectionAlert"
import {
  evolveTargetCard,
  extractPortion,
  mintVariation,
  sendToWorkbench
} from "./workbench-helpers"
import { WorkbenchView } from "./WorkbenchView"

interface WorkbenchProps {
  onStartVariationMinting?: (base: any) => void
  addLog?: (msg: string) => void
  setAlertType: (type: AlertType | null) => void
}

function useWorkbenchBase() {
  const workbench = useWorkbench()
  const evolution = useEvolution()
  const settings = useSettings()
  const { t: i18n } = useLanguage()
  return {
    ...workbench,
    ...evolution,
    ...settings,
    i18n,
    t: i18n.workbench
  }
}

function useWorkbenchStates() {
  const [editedSegments, setEditedSegments] = useState<PromptSegment[]>([])
  const [editedParams, setEditedParams] = useState<any>({})
  const [slotValues, setSlotValues] = useState<Record<string, string>>({})
  const [isEvolutionSuccessOpen, setIsEvolutionSuccessOpen] = useState(false)
  const [evolvedCardData, setEvolvedCardData] = useState<any | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [isBlending, setIsBlending] = useState(false)

  return {
    editedSegments,
    setEditedSegments,
    editedParams,
    setEditedParams,
    slotValues,
    setSlotValues,
    isEvolutionSuccessOpen,
    setIsEvolutionSuccessOpen,
    evolvedCardData,
    setEvolvedCardData,
    isDragOver,
    setIsDragOver,
    selectedCardId,
    setSelectedCardId,
    isBlending,
    setIsBlending
  }
}

interface UseHandlersOptions {
  workbenchCards: any[]
  targetCard: any
  addCard: (card: any) => Promise<any>
  evolveCard: (id: string) => Promise<any>
  slotHistory: any
  saveSlotHistory: (history: any) => Promise<void>
  incrementCardUsage: (id: string) => Promise<void>
  editedSegments: PromptSegment[]
  editedParams: any
  slotValues: Record<string, string>
  setSlotValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setEvolvedCardData: (data: any) => void
  setIsEvolutionSuccessOpen: (open: boolean) => void
  setIsBlending: (b: boolean) => void
  onStartVariationMinting: ((base: any) => void) | undefined
  setAlertType: (type: AlertType | null) => void
  addLog?: (msg: string) => void
}

function useWorkbenchHandlers({
  workbenchCards,
  targetCard,
  addCard,
  evolveCard,
  slotHistory,
  saveSlotHistory,
  incrementCardUsage,
  editedSegments,
  editedParams,
  slotValues,
  setSlotValues,
  setEvolvedCardData,
  setIsEvolutionSuccessOpen,
  setIsBlending,
  onStartVariationMinting,
  setAlertType,
  addLog
}: UseHandlersOptions) {
  const handleSlotValueChange = useCallback(
    (label: string, value: string) => {
      setSlotValues((prev) => ({ ...prev, [label]: value }))
    },
    [setSlotValues]
  )

  const handleSend = useCallback(
    (val: string, label: string) =>
      sendToWorkbench(val, label, addCard, addLog),
    [addCard, addLog]
  )
  const handleExtract = useCallback(
    (name: string, segs: PromptSegment[], params: any) =>
      extractPortion(name, segs, params, addCard, addLog),
    [addCard, addLog]
  )

  const { isInjecting, injectPrompt } = usePromptInjector({
    workbenchCards,
    slotHistory,
    saveSlotHistory,
    incrementCardUsage,
    setAlertType,
    addLog
  })

  const handleInject = useCallback(
    () => injectPrompt(editedSegments, editedParams, slotValues),
    [injectPrompt, editedSegments, editedParams, slotValues]
  )
  const handleMint = useCallback(
    () =>
      mintVariation(
        onStartVariationMinting,
        setIsBlending,
        workbenchCards,
        editedSegments,
        editedParams
      ),
    [
      onStartVariationMinting,
      setIsBlending,
      workbenchCards,
      editedSegments,
      editedParams
    ]
  )
  const handleEvolve = useCallback(
    () =>
      evolveTargetCard(
        targetCard,
        evolveCard,
        setEvolvedCardData,
        setIsEvolutionSuccessOpen,
        addLog,
        setAlertType
      ),
    [
      targetCard,
      evolveCard,
      setEvolvedCardData,
      setIsEvolutionSuccessOpen,
      addLog,
      setAlertType
    ]
  )

  return {
    handleSlotValueChange,
    handleSend,
    handleExtract,
    handleInject,
    handleMint,
    handleEvolve,
    isInjecting
  }
}

function useWorkbenchCore({
  onStartVariationMinting,
  addLog,
  setAlertType
}: WorkbenchProps) {
  const base = useWorkbenchBase()
  const {
    workbenchCards,
    addCard,
    evolveCard,
    slotHistory,
    saveSlotHistory,
    incrementCardUsage
  } = base
  const states = useWorkbenchStates()
  const {
    editedSegments,
    editedParams,
    slotValues,
    setEditedSegments,
    setEditedParams,
    setSlotValues,
    setEvolvedCardData,
    setIsEvolutionSuccessOpen,
    setIsBlending
  } = states

  const hasParams = useMemo(
    () =>
      Object.values(editedParams).some((v) =>
        Array.isArray(v) ? v.length > 0 : !!v
      ),
    [editedParams]
  )

  const isEvolutionMode = workbenchCards.length === 1
  const isMixingMode = workbenchCards.length >= 2
  const targetCard = workbenchCards[0]
  const canEvolveTarget = targetCard && base.canEvolve(targetCard)

  const workbenchCardsDependency = useMemo(
    () => workbenchCards.map((c) => `${c.id}-${c.updatedAt || 0}`).join(","),
    [workbenchCards]
  )

  const [restoredRecipe, setRestoredRecipe] =
    useState<RecipeHistoryItem | null>(null)

  useChromeTabConnection({ workbenchCardsDependency, setAlertType, addLog })
  usePromptSegmentsSync(
    workbenchCards,
    setEditedSegments,
    setEditedParams,
    setSlotValues,
    restoredRecipe,
    setRestoredRecipe
  )

  const handlers = useWorkbenchHandlers({
    workbenchCards,
    targetCard,
    addCard,
    evolveCard,
    slotHistory,
    saveSlotHistory,
    incrementCardUsage,
    editedSegments,
    editedParams,
    slotValues,
    setSlotValues,
    setEvolvedCardData,
    setIsEvolutionSuccessOpen,
    setIsBlending,
    onStartVariationMinting,
    setAlertType,
    addLog
  })

  const slots = useMemo(
    () =>
      editedSegments.filter(
        (seg): seg is { type: "slot"; label: string; default: string } =>
          seg.type === "slot"
      ),
    [editedSegments]
  )

  const handleRestoreRecipe = useCallback(
    async (recipe: RecipeHistoryItem) => {
      setRestoredRecipe(recipe)
      await base.restoreRecipe(recipe)
      addLog?.(`Recipe restored: ${recipe.name}`)
    },
    [base.restoreRecipe, addLog]
  )

  return {
    ...base,
    targetCard,
    hasParams,
    isEvolutionMode,
    isMixingMode,
    canEvolveTarget,
    slots,
    ...states,
    ...handlers,
    handleRestoreRecipe
  }
}

export const Workbench: React.FC<WorkbenchProps> = (props) => {
  const data = useWorkbenchCore(props)
  const { undo, redo } = data

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase()
        if (
          tagName === "input" ||
          tagName === "textarea" ||
          activeEl.getAttribute("contenteditable") === "true"
        ) {
          // Allow Undo/Redo shortcuts for slider inputs (type range) but ignore for text editing inputs
          if ((activeEl as HTMLInputElement).type !== "range") {
            return
          }
        }
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault()
          if (e.shiftKey) {
            redo()
          } else {
            undo()
          }
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault()
          redo()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [undo, redo])

  return <WorkbenchView {...data} addLog={props.addLog} />
}
