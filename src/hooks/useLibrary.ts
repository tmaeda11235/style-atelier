import { useState, useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
import { buildPromptString } from "../lib/prompt-utils"

export type SortOption = "newest" | "oldest" | "rarity" | "usage"
export type RarityFilter = "All" | StyleCard["tier"]

export function useLibrary(addLog: (msg: string) => void) {
  const [searchTag, setSearchTag] = useState("")
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("All")
  const [sortBy, setSortBy] = useState<SortOption>("newest")

  const allCards = useLiveQuery(() => db.styleCards.toArray())

  const allSrefs = useMemo(() => {
    if (!allCards) return []
    const srefs = new Set<string>()
    allCards.forEach((card) => {
      card.parameters.sref?.forEach((url) => srefs.add(url))
    })
    return Array.from(srefs)
  }, [allCards])

  const filteredAndSortedCards = useMemo(() => {
    if (!allCards) return []

    let result = [...allCards]

    // Filtering
    if (searchTag) {
      const tag = searchTag.toLowerCase()
      result = result.filter((card) => 
        card.tags?.some((t) => t.toLowerCase().includes(tag)) ||
        card.name.toLowerCase().includes(tag) ||
        card.parameters.sref?.some((url) => url.toLowerCase().includes(tag))
      )
    }

    if (rarityFilter !== "All") {
      result = result.filter((card) => card.tier === rarityFilter)
    }

    // TODO: Add dominantColor filtering if needed

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt - a.createdAt
        case "oldest":
          return a.createdAt - b.createdAt
        case "usage":
          return (b.usageCount || 0) - (a.usageCount || 0)
        case "rarity": {
          const weights = { Legendary: 4, Epic: 3, Rare: 2, Common: 1 }
          return weights[b.tier] - weights[a.tier]
        }
        default:
          return 0
      }
    })

    return result
  }, [allCards, searchTag, rarityFilter, sortBy])

  const togglePin = async (card: StyleCard, e: React.MouseEvent) => {
    e.stopPropagation()
    const newPinnedStatus = !card.isPinned
    try {
      await db.styleCards.update(card.id, { isPinned: newPinnedStatus })
      addLog(newPinnedStatus ? `Added ${card.name} to hand.` : `Removed ${card.name} from hand.`)
    } catch (err) {
      console.error("Failed to toggle pin:", err)
    }
  }

  const handleCardClick = (card: StyleCard) => {
    const maskedKeys: (keyof StyleCard["parameters"])[] = []
    if (card.masking.isSrefHidden) {
      maskedKeys.push("sref")
    }
    if (card.masking.isPHidden) {
      maskedKeys.push("p")
    }
    const prompt = buildPromptString(card.promptSegments, card.parameters, maskedKeys)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0]
      if (activeTab?.id) {
        chrome.tabs
          .sendMessage(activeTab.id, {
            type: "INJECT_PROMPT",
            prompt: prompt,
          })
          .catch((err) => {
            addLog(`Note: ${err.message || "Could not send to tab"}`)
          })
        addLog(`Sent prompt: ${prompt.substring(0, 30)}...`)
      } else {
        addLog("No active tab found")
      }
    })
  }

  return {
    styleCards: filteredAndSortedCards,
    handleCardClick,
    togglePin,
    searchTag,
    setSearchTag,
    rarityFilter,
    setRarityFilter,
    sortBy,
    setSortBy,
    allSrefs,
  }
}