import { useState, useEffect } from "react"
import { db } from "../lib/db"
import type { HistoryItem, PromptSegment, StyleCard } from "../lib/db-schema"
import { parsePrompt } from "../lib/prompt-utils"
import { extractKeywords } from "../lib/nlp-utils"

export function useMinting(addLog: (msg: string) => void, setActiveTab: (tab: "history" | "library" | "decks") => void) {
  const [mintingItem, setMintingItem] = useState<HistoryItem | null>(null)
  const [editedSegments, setEditedSegments] = useState<PromptSegment[]>([])
  const [isSrefHidden, setIsSrefHidden] = useState(false)
  const [isPHidden, setIsPHidden] = useState(false)

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
      setSelectedKeywords([])
      setCustomName("")
    } else {
      setEditedSegments([])
      setSuggestedKeywords([])
      setSelectedKeywords([])
      setCustomName("")
    }
  }, [mintingItem])

  const handleStartMinting = (historyItem: HistoryItem) => {
    setMintingItem(historyItem)
  }

  const handleSaveMintedCard = async () => {
    if (!mintingItem) return
    addLog(`Saving card from history item: ${mintingItem.id}`)
    const { parameters } = parsePrompt(mintingItem.fullCommand)

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
      tier: "Common",
      isFavorite: false,
      usageCount: 0,
      tags: [],
      dominantColor: "#ffffff",
      thumbnailData: mintingItem.imageUrl,
      frameId: "default",
      genealogy: {
        generation: 1,
        parentIds: [],
        originCreatorId: "user",
        mutationNote: `Minted from history item ${mintingItem.id}`,
      },
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
    editedSegments,
    setEditedSegments,
    isSrefHidden,
    setIsSrefHidden,
    isPHidden,
    setIsPHidden,
    handleStartMinting,
    handleSaveMintedCard,
    setMintingItem, // For cancelling minting
    suggestedKeywords,
    selectedKeywords,
    setSelectedKeywords,
    customName,
    setCustomName,
  }
}