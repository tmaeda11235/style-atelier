import { useState, useEffect } from "react"
import { db } from "../lib/db"
import type { HistoryItem, PromptSegment, StyleCard } from "../lib/db-schema"
import { parsePrompt } from "../lib/prompt-utils"

export function useMinting(addLog: (msg: string) => void, setActiveTab: (tab: "history" | "library" | "decks") => void) {
  const [mintingItem, setMintingItem] = useState<HistoryItem | null>(null)
  const [editedSegments, setEditedSegments] = useState<PromptSegment[]>([])
  const [isSrefHidden, setIsSrefHidden] = useState(false)
  const [isPHidden, setIsPHidden] = useState(false)

  useEffect(() => {
    if (mintingItem) {
      const { promptSegments } = parsePrompt(mintingItem.fullCommand)
      setEditedSegments(promptSegments)
    } else {
      setEditedSegments([])
    }
  }, [mintingItem])

  const handleStartMinting = (historyItem: HistoryItem) => {
    setMintingItem(historyItem)
  }

  const handleSaveMintedCard = async () => {
    if (!mintingItem) return
    addLog(`Saving card from history item: ${mintingItem.id}`)
    const { parameters } = parsePrompt(mintingItem.fullCommand)

    const newCard: StyleCard = {
      id: crypto.randomUUID(),
      name:
        editedSegments.length > 0 && editedSegments[0].type === "text"
          ? editedSegments[0].value.substring(0, 20)
          : "New Card",
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
  }
}