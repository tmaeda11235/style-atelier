import { useEffect, useState } from "react"

import { db } from "../lib/db"
import type { HistoryItem, PromptSegment, StyleCard } from "../lib/db-schema"
import {
  buildMintedCard,
  createBuildCardParams,
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
    setCustomTags
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
}

export function useSaveMintedCard(params: SaveMintedCardParams) {
  const {
    mintingItem,
    variationBase,
    editedSegments,
    meta,
    colors,
    selectedRarity,
    isSrefHidden,
    isPHidden,
    addLog,
    dispatchState,
    setActiveTab
  } = params

  return async () => {
    if (!mintingItem && !variationBase) return
    addLog(
      mintingItem
        ? `Saving card from history item: ${mintingItem.id}`
        : `Saving card variation`
    )
    try {
      const thumbnailData = await getThumbnailData(mintingItem, variationBase)
      const buildParams = createBuildCardParams(
        mintingItem,
        variationBase,
        editedSegments,
        selectedRarity,
        isSrefHidden,
        isPHidden,
        thumbnailData,
        meta,
        colors
      )
      const newCard = buildMintedCard(buildParams)
      await db.styleCards.put(newCard)
      addLog(`New StyleCard "${newCard.name}" minted successfully!`)
      dispatchState((s) => ({
        ...s,
        mintingItem: null,
        isSrefHidden: false,
        isPHidden: false
      }))
      setActiveTab("library")
    } catch (err) {
      console.error("Failed to mint StyleCard:", err)
      addLog("Error: Failed to mint StyleCard.")
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

export function useMinting(
  addLog: (msg: string) => void,
  setActiveTab: (tab: "history" | "library" | "workbench") => void
) {
  const [state, setState] = useState<MintingState>(INITIAL_MINTING_STATE)
  const meta = useMintingMetadata(state.mintingItem, state.variationBase)
  const colors = useMintingColors(
    state.mintingItem,
    state.variationBase,
    state.selectedRarity
  )

  useEffect(() => {
    const cmd = state.mintingItem?.fullCommand
    setState((s) => ({
      ...s,
      editedSegments: cmd
        ? parsePrompt(cmd).promptSegments
        : s.variationBase?.promptSegments || []
    }))
  }, [state.mintingItem, state.variationBase])

  const handleSaveMintedCard = useSaveMintedCard({
    ...state,
    meta,
    colors,
    addLog,
    dispatchState: setState,
    setActiveTab
  })

  return {
    ...state,
    ...createMintingHandlers(setState),
    handleSaveMintedCard,
    ...meta,
    ...colors
  }
}
