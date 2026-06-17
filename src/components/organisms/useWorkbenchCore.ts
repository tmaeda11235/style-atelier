import { useCallback, useMemo, useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useChromeTabConnection } from "../../hooks/useChromeTabConnection"
import { useEvolution } from "../../hooks/useEvolution"
import { usePromptSegmentsSync } from "../../hooks/usePromptSegmentsSync"
import { useWorkbench } from "../../hooks/useWorkbench"
import type { PromptSegment, RecipeHistoryItem } from "../../lib/db-schema"
import { type AlertType } from "../molecules/ConnectionAlert"
import { useWorkbenchHandlers } from "./useWorkbenchHandlers"

export interface WorkbenchProps {
  onStartVariationMinting?: (base: any) => void
  addLog?: (msg: string) => void
  setAlertType: (type: AlertType | null) => void
}

export function useWorkbenchBase() {
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

export function useWorkbenchStates() {
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

interface UseWorkbenchSyncOptions {
  workbenchCards: any[]
  setEditedSegments: (segs: PromptSegment[]) => void
  setEditedParams: (params: any) => void
  setSlotValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  restoredRecipe: RecipeHistoryItem | null
  setRestoredRecipe: (recipe: RecipeHistoryItem | null) => void
  setAlertType: (type: AlertType | null) => void
  addLog?: (msg: string) => void
}

function useWorkbenchSync({
  workbenchCards,
  setEditedSegments,
  setEditedParams,
  setSlotValues,
  restoredRecipe,
  setRestoredRecipe,
  setAlertType,
  addLog
}: UseWorkbenchSyncOptions) {
  const workbenchCardsDependency = useMemo(
    () => workbenchCards.map((c) => `${c.id}-${c.updatedAt || 0}`).join(","),
    [workbenchCards]
  )

  useChromeTabConnection({ workbenchCardsDependency, setAlertType, addLog })
  usePromptSegmentsSync(
    workbenchCards,
    setEditedSegments,
    setEditedParams,
    setSlotValues,
    restoredRecipe,
    setRestoredRecipe
  )
}

function useWorkbenchDerivations(
  workbenchCards: any[],
  editedParams: any,
  editedSegments: PromptSegment[],
  canEvolve: (c: any) => boolean
) {
  const hasParams = useMemo(
    () =>
      Object.values(editedParams).some((v) =>
        Array.isArray(v) ? v.length > 0 : !!v
      ),
    [editedParams]
  )

  const { isEvolutionMode, isMixingMode, targetCard, canEvolveTarget } =
    useMemo(() => {
      const target = workbenchCards[0]
      return {
        isEvolutionMode: workbenchCards.length === 1,
        isMixingMode: workbenchCards.length >= 2,
        targetCard: target,
        canEvolveTarget: !!(target && canEvolve(target))
      }
    }, [workbenchCards, canEvolve])

  const slots = useMemo(
    () =>
      editedSegments.filter(
        (seg): seg is { type: "slot"; label: string; default: string } =>
          seg.type === "slot"
      ),
    [editedSegments]
  )

  return {
    hasParams,
    isEvolutionMode,
    isMixingMode,
    targetCard,
    canEvolveTarget,
    slots
  }
}

export function useWorkbenchCore(props: WorkbenchProps) {
  const { addLog } = props
  const base = useWorkbenchBase()
  const states = useWorkbenchStates()
  const { workbenchCards, restoreRecipe, canEvolve } = base
  const { editedSegments, editedParams } = states

  const derivations = useWorkbenchDerivations(
    workbenchCards,
    editedParams,
    editedSegments,
    canEvolve
  )

  const [restoredRecipe, setRestoredRecipe] =
    useState<RecipeHistoryItem | null>(null)

  useWorkbenchSync({
    ...base,
    ...states,
    restoredRecipe,
    setRestoredRecipe,
    ...props
  })

  const handlers = useWorkbenchHandlers({
    ...base,
    targetCard: derivations.targetCard,
    ...states,
    ...props
  })

  const handleRestoreRecipe = useCallback(
    async (recipe: RecipeHistoryItem) => {
      setRestoredRecipe(recipe)
      await restoreRecipe(recipe)
      addLog?.(`Recipe restored: ${recipe.name}`)
    },
    [restoreRecipe, addLog]
  )

  return {
    ...base,
    ...derivations,
    ...states,
    ...handlers,
    handleRestoreRecipe
  }
}
