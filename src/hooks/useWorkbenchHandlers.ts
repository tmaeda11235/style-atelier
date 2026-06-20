import { useCallback } from "react"

import { type AlertType } from "../components/molecules/ConnectionAlert"
import {
  evolveTargetCard,
  extractPortion,
  mintVariation,
  sendToWorkbench
} from "../lib/workbench-helpers"
import type { PromptSegment } from "../shared/lib/db-schema"
import { usePromptInjector } from "./usePromptInjector"

export interface UseHandlersOptions {
  workbenchCards: any[]
  targetCard: any
  addCard: (card: any) => Promise<any>
  evolveCard: (id: string) => Promise<any>
  slotHistory: any
  saveSlotHistory: (label: string, values: string[]) => Promise<void>
  incrementCardUsage: (id: string) => Promise<void>
  editedSegments: PromptSegment[]
  editedParams: any
  slotValues: Record<string, string>
  setSlotValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setEvolvedCardData: (data: any) => void
  setIsEvolutionSuccessOpen: (open: boolean) => void
  setIsBlending: (b: boolean) => void
  onStartVariationMinting?: (base: any) => void
  setAlertType: (type: AlertType | null) => void
  addLog?: (msg: string) => void
}

function usePromptInjection(options: UseHandlersOptions) {
  const { isInjecting, injectPrompt } = usePromptInjector({
    workbenchCards: options.workbenchCards,
    slotHistory: options.slotHistory,
    saveSlotHistory: options.saveSlotHistory,
    incrementCardUsage: options.incrementCardUsage,
    setAlertType: options.setAlertType,
    addLog: options.addLog
  })

  const handleInject = useCallback(
    () =>
      injectPrompt(
        options.editedSegments,
        options.editedParams,
        options.slotValues
      ),
    [
      injectPrompt,
      options.editedSegments,
      options.editedParams,
      options.slotValues
    ]
  )

  return { isInjecting, handleInject }
}

function useWorkbenchCardActions(options: UseHandlersOptions) {
  const handleMint = useCallback(
    () =>
      mintVariation(
        options.onStartVariationMinting,
        options.setIsBlending,
        options.workbenchCards,
        options.editedSegments,
        options.editedParams
      ),
    [
      options.onStartVariationMinting,
      options.setIsBlending,
      options.workbenchCards,
      options.editedSegments,
      options.editedParams
    ]
  )

  const handleEvolve = useCallback(
    () =>
      evolveTargetCard(
        options.targetCard,
        options.evolveCard,
        options.setEvolvedCardData,
        options.setIsEvolutionSuccessOpen,
        options.addLog,
        options.setAlertType
      ),
    [
      options.targetCard,
      options.evolveCard,
      options.setEvolvedCardData,
      options.setIsEvolutionSuccessOpen,
      options.addLog,
      options.setAlertType
    ]
  )

  return { handleMint, handleEvolve }
}

export function useWorkbenchHandlers(options: UseHandlersOptions) {
  const { addCard, addLog, setSlotValues } = options

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

  const { isInjecting, handleInject } = usePromptInjection(options)
  const { handleMint, handleEvolve } = useWorkbenchCardActions(options)

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
