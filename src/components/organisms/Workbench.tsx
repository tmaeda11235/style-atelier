import React, { useCallback, useEffect, useMemo, useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useChromeTabConnection } from "../../hooks/useChromeTabConnection"
import { useEvolution } from "../../hooks/useEvolution"
import { usePromptInjector } from "../../hooks/usePromptInjector"
import { useWorkbench } from "../../hooks/useWorkbench"
import type { PromptSegment } from "../../lib/db-schema"
import { mergeReferences } from "../../lib/prompt-reference-utils"
import { mergePromptSegments } from "../../lib/prompt-utils"
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

function usePromptSegmentsSync(
  workbenchCards: any[],
  setEditedSegments: (seg: PromptSegment[]) => void,
  setEditedParams: (p: any) => void,
  setSlotValues: (vals: Record<string, string>) => void
) {
  useEffect(() => {
    if (workbenchCards.length === 0) {
      setEditedSegments([])
      setEditedParams({})
      setSlotValues({})
      return
    }
    let nextSegments: PromptSegment[]
    let nextParams: any = {}
    if (workbenchCards.length === 1) {
      const target = workbenchCards[0]
      nextSegments = target.promptSegments || []
      nextParams = target.parameters || {}
    } else {
      // Apply weights to segments
      const segmentsWithWeights = workbenchCards.flatMap((card) => {
        const segs = card.promptSegments || []
        const cardWeight = card.weight !== undefined ? card.weight : 1.0
        return segs.map((seg: any) => {
          const segWeight = seg.weight !== undefined ? seg.weight : 1.0
          const finalWeight = parseFloat((segWeight * cardWeight).toFixed(2))
          return {
            ...seg,
            weight: finalWeight !== 1.0 ? finalWeight : undefined
          }
        })
      })

      nextSegments = mergePromptSegments(segmentsWithWeights)

      // Merge sref / cref parameters with weights
      nextParams = { ...workbenchCards[0].parameters }

      const srefList = workbenchCards
        .filter((p) => p.parameters?.sref)
        .map((p) => ({ items: p.parameters.sref!, cardWeight: p.weight }))
      nextParams.sref = mergeReferences(srefList).slice(0, 5)

      const crefList = workbenchCards
        .filter((p) => p.parameters?.cref)
        .map((p) => ({ items: p.parameters.cref!, cardWeight: p.weight }))
      nextParams.cref = mergeReferences(crefList).slice(0, 5)

      // Other parameters are merged with latest priority
      workbenchCards.slice(1).forEach((parent) => {
        if (parent.parameters?.imagePrompts) {
          nextParams.imagePrompts = Array.from(
            new Set([
              ...(parent.parameters.imagePrompts || []),
              ...(nextParams.imagePrompts || [])
            ])
          ).slice(0, 5)
        }
        if (parent.parameters?.p) {
          nextParams.p = Array.from(
            new Set([...(parent.parameters.p || []), ...(nextParams.p || [])])
          ).slice(0, 5)
        }
      })
    }
    setEditedSegments(nextSegments)
    setEditedParams(nextParams)
    const initialSlotValues: Record<string, string> = {}
    nextSegments.forEach((seg) => {
      if (seg.type === "slot") initialSlotValues[seg.label] = seg.default || ""
    })
    setSlotValues(initialSlotValues)
  }, [workbenchCards, setEditedSegments, setEditedParams, setSlotValues])
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
        addLog
      ),
    [
      targetCard,
      evolveCard,
      setEvolvedCardData,
      setIsEvolutionSuccessOpen,
      addLog
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

  useChromeTabConnection({ workbenchCardsDependency, setAlertType, addLog })
  usePromptSegmentsSync(
    workbenchCards,
    setEditedSegments,
    setEditedParams,
    setSlotValues
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

  return {
    ...base,
    targetCard,
    hasParams,
    isEvolutionMode,
    isMixingMode,
    canEvolveTarget,
    slots,
    ...states,
    ...handlers
  }
}

export const Workbench: React.FC<WorkbenchProps> = (props) => {
  const data = useWorkbenchCore(props)

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
            data.redo()
          } else {
            data.undo()
          }
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault()
          data.redo()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [data.undo, data.redo])

  return <WorkbenchView {...data} addLog={props.addLog} />
}
