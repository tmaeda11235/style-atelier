import { useState, useEffect } from "react"
import { db } from "../lib/db"
import type { HistoryItem, PromptSegment, StyleCard } from "../lib/db-schema"
import { parsePrompt } from "../lib/prompt-utils"
import { extractKeywords } from "../lib/nlp-utils"
import { RarityTier } from "../lib/rarity-config"

export interface VariationBase {
  promptSegments: PromptSegment[];
  parameters: StyleCard["parameters"];
  genealogy: StyleCard["genealogy"];
}

export function useMinting(addLog: (msg: string) => void, setActiveTab: (tab: "history" | "library" | "decks" | "workbench") => void) {
  const [mintingItem, setMintingItem] = useState<HistoryItem | null>(null)
  const [variationBase, setVariationBase] = useState<VariationBase | null>(null)
  const [editedSegments, setEditedSegments] = useState<PromptSegment[]>([])
  const [isSrefHidden, setIsSrefHidden] = useState(false)
  const [isPHidden, setIsPHidden] = useState(false)
  const [selectedRarity, setSelectedRarity] = useState<RarityTier>("Common")

  // Auto-naming related state
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [customName, setCustomName] = useState("")

  useEffect(() => {
    if (mintingItem) {
      const { promptSegments } = parsePrompt(mintingItem.fullCommand)
      setEditedSegments(promptSegments)

      // Extract keywords for auto-naming
      const keywords = extractKeywords(mintingItem.fullCommand)
      setSuggestedKeywords(keywords)
    } else if (variationBase) {
      setEditedSegments(variationBase.promptSegments)
      setSuggestedKeywords([])
    } else {
      setEditedSegments([])
      setSuggestedKeywords([])
    }
    
    setSelectedKeywords([])
    setCustomName("")
    setSelectedRarity("Common")
  }, [mintingItem, variationBase])

  const handleStartMinting = (historyItem: HistoryItem) => {
    setMintingItem(historyItem)
    setVariationBase(null)
  }

  const handleStartVariationMinting = (base: VariationBase) => {
    setVariationBase(base)
    setMintingItem(null)
  }

  const handleSaveMintedCard = async () => {
    if (!mintingItem && !variationBase) return
    
    let parameters: StyleCard["parameters"]
    let genealogy: StyleCard["genealogy"]
    let thumbnailData: string

    if (mintingItem) {
      addLog(`Saving card from history item: ${mintingItem.id}`)
      const parsed = parsePrompt(mintingItem.fullCommand)
      parameters = parsed.parameters
      thumbnailData = mintingItem.imageUrl
      genealogy = {
        generation: 1,
        parentIds: [],
        originCreatorId: "user",
        mutationNote: `Minted from history item ${mintingItem.id}`,
      }
    } else {
      addLog(`Saving card variation`)
      parameters = variationBase!.parameters
      genealogy = variationBase!.genealogy
      thumbnailData = "assets/icon.png" // Temporary placeholder
    }

    // Construct name from selected keywords and custom name
    let finalName = customName.trim()
    if (selectedKeywords.length > 0) {
      const keywordsStr = selectedKeywords.join(" ")
      finalName = finalName ? `${keywordsStr} (${finalName})` : keywordsStr
    }
    if (!finalName) {
      finalName =
        editedSegments.length > 0 && editedSegments[0].type === "text"
          ? editedSegments[0].value.substring(0, 20)
          : "New Card"
    }

    const newCard: StyleCard = {
      id: crypto.randomUUID(),
      name: finalName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      promptSegments: editedSegments,
      parameters,
      masking: { isSrefHidden: isSrefHidden, isPHidden: isPHidden },
      tier: selectedRarity,
      isFavorite: false,
      usageCount: 0,
      tags: [...selectedKeywords],
      dominantColor: "#ffffff",
      thumbnailData,
      frameId: "default",
      genealogy,
    }

    try {
      await db.styleCards.put(newCard)
      addLog(`New StyleCard "${newCard.name}" minted successfully!`)
      setMintingItem(null)
      setIsSrefHidden(false)
      setIsPHidden(false)
      setActiveTab("library")
    } catch (err) {
      console.error("Failed to mint StyleCard:", err)
      addLog("Error: Failed to mint StyleCard.")
    }
  }

  return {
    mintingItem,
    variationBase,
    editedSegments,
    setEditedSegments,
    isSrefHidden,
    setIsSrefHidden,
    isPHidden,
    setIsPHidden,
    selectedRarity,
    setSelectedRarity,
    handleStartMinting,
    handleStartVariationMinting,
    handleSaveMintedCard,
    setMintingItem, // For cancelling minting
    setVariationBase,
    suggestedKeywords,
    selectedKeywords,
    setSelectedKeywords,
    customName,
    setCustomName,
  }
}