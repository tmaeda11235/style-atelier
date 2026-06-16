import { useEffect, useState } from "react"

import type { AlertType } from "../components/molecules/ConnectionAlert"
import { db } from "../lib/db"
import type { HistoryItem, PromptSegment, StyleCard } from "../lib/db-schema"
import {
  buildMintedCard,
  createBuildCardParams,
  determineRarity,
  getThumbnailData
} from "../lib/minting-helper"
import { extractKeywords } from "../lib/nlp-utils"
import { parsePrompt } from "../lib/prompt-utils"
import type { RarityTier } from "../lib/rarity-config"
import { useMintingColors } from "./useMintingColors"

export interface VariationBase {
  promptSegments: PromptSegment[]
  parameters: StyleCard["parameters"]
  genealogy: StyleCard["genealogy"]
  thumbnailData?: string
  images?: string[]
  selectedThumbnails?: string[]
}

export function useMintingMetadata(
  mintingItem: HistoryItem | null,
  variationBase: VariationBase | null
) {
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [customName, setCustomName] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [customTags, setCustomTags] = useState<string[]>([])
  const [mutationNote, setMutationNote] = useState("")

  useEffect(() => {
    if (mintingItem) {
      setSuggestedKeywords(extractKeywords(mintingItem.fullCommand))
    } else {
      setSuggestedKeywords([])
    }
    setSelectedKeywords([])
    setCustomTags([])
    setCustomName("")
    setSelectedCategory("")
    setMutationNote("")
  }, [mintingItem, variationBase])

  return {
    suggestedKeywords,
    selectedKeywords,
    setSelectedKeywords,
    customName,
    setCustomName,
    selectedCategory,
    setSelectedCategory,
    customTags,
    setCustomTags,
    mutationNote,
    setMutationNote
  }
}

export interface SaveMintedCardParams {
  mintingItem: HistoryItem | null
  variationBase: VariationBase | null
  editedSegments: PromptSegment[]
  meta: ReturnType<typeof useMintingMetadata>
  colors: ReturnType<typeof useMintingColors>
  selectedRarity: RarityTier
  isSrefHidden: boolean
  isPHidden: boolean
  addLog: (msg: string) => void
  dispatchState: React.Dispatch<React.SetStateAction<MintingState>>
  setActiveTab: (tab: "history" | "library" | "workbench") => void
  setAlertType?: (type: AlertType) => void
}

export function useSaveMintedCard(p: SaveMintedCardParams) {
  return async () => {
    if (!p.mintingItem && !p.variationBase) return
    p.addLog(
      p.mintingItem
        ? `Saving card from history item: ${p.mintingItem.id}`
        : `Saving card variation`
    )
    try {
      const thumbnailData = await getThumbnailData(
        p.mintingItem,
        p.variationBase
      )
      const buildParams = createBuildCardParams(
        p.mintingItem,
        p.variationBase,
        p.editedSegments,
        p.selectedRarity,
        p.isSrefHidden,
        p.isPHidden,
        thumbnailData,
        p.meta,
        p.colors
      )
      const newCard = buildMintedCard(buildParams)
      await db.styleCards.put(newCard)
      p.addLog(`New StyleCard "${newCard.name}" minted successfully!`)
      p.dispatchState((s) => ({
        ...s,
        mintingItem: null,
        isSrefHidden: false,
        isPHidden: false
      }))
      p.setActiveTab("library")
    } catch (err) {
      console.error("Failed to mint StyleCard:", err)
      p.addLog("Error: Failed to mint StyleCard.")
      p.setAlertType?.("db_error")
    }
  }
}

export interface MintingState {
  mintingItem: HistoryItem | null
  variationBase: VariationBase | null
  editedSegments: PromptSegment[]
  isSrefHidden: boolean
  isPHidden: boolean
  selectedRarity: RarityTier
}

export const INITIAL_MINTING_STATE: MintingState = {
  mintingItem: null,
  variationBase: null,
  editedSegments: [],
  isSrefHidden: false,
  isPHidden: false,
  selectedRarity: "Common"
}

export function createMintingHandlers(
  setState: React.Dispatch<React.SetStateAction<MintingState>>
) {
  return {
    setEditedSegments: (segs: PromptSegment[]) =>
      setState((s) => ({ ...s, editedSegments: segs })),
    setIsSrefHidden: (hidden: boolean) =>
      setState((s) => ({ ...s, isSrefHidden: hidden })),
    setIsPHidden: (hidden: boolean) =>
      setState((s) => ({ ...s, isPHidden: hidden })),
    setSelectedRarity: (rarity: RarityTier) =>
      setState((s) => ({ ...s, selectedRarity: rarity })),
    handleStartMinting: (item: HistoryItem) =>
      setState((s) => ({ ...s, mintingItem: item, variationBase: null })),
    handleStartVariationMinting: (base: VariationBase) =>
      setState((s) => ({ ...s, variationBase: base, mintingItem: null })),
    setMintingItem: (item: HistoryItem | null) =>
      setState((s) => ({ ...s, mintingItem: item })),
    setVariationBase: (base: VariationBase | null) =>
      setState((s) => ({ ...s, variationBase: base }))
  }
}

function useMintingInitialization(
  state: MintingState,
  setState: React.Dispatch<React.SetStateAction<MintingState>>
) {
  useEffect(() => {
    let detectedRarity: RarityTier = "Common"
    let editedSegments: PromptSegment[] = []

    if (state.mintingItem) {
      const parsed = parsePrompt(state.mintingItem.fullCommand)
      editedSegments = parsed.promptSegments
      detectedRarity = determineRarity(
        state.mintingItem.fullCommand,
        parsed.parameters,
        1
      )
    } else if (state.variationBase) {
      editedSegments = state.variationBase.promptSegments
      const gen = state.variationBase.genealogy?.generation || 1
      const fullPrompt = state.variationBase.promptSegments
        .map((seg) => seg.value)
        .join(" ")
      detectedRarity = determineRarity(
        fullPrompt,
        state.variationBase.parameters,
        gen
      )
    }

    setState((s) => ({
      ...s,
      editedSegments,
      selectedRarity: detectedRarity
    }))
  }, [state.mintingItem, state.variationBase])
}

export function useMinting(
  addLog: (msg: string) => void,
  setActiveTab: (tab: "history" | "library" | "workbench") => void,
  setAlertType?: (type: AlertType) => void
) {
  const [state, setState] = useState<MintingState>(INITIAL_MINTING_STATE)
  const meta = useMintingMetadata(state.mintingItem, state.variationBase)
  const colors = useMintingColors(
    state.mintingItem,
    state.variationBase,
    state.selectedRarity
  )

  useMintingInitialization(state, setState)

  const handleSaveMintedCard = useSaveMintedCard({
    ...state,
    meta,
    colors,
    addLog,
    dispatchState: setState,
    setActiveTab,
    setAlertType
  })

  return {
    ...state,
    ...createMintingHandlers(setState),
    handleSaveMintedCard,
    ...meta,
    ...colors
  }
}
