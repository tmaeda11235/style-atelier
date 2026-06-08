import { useLiveQuery } from "dexie-react-hooks"
import FlexSearch from "flexsearch"
import { useMemo, useState } from "react"

import type { AlertType } from "../components/molecules/ConnectionAlert"
import { getColorNameFromHex, hexToHsl } from "../lib/color-utils"
import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
import { buildPromptString } from "../lib/prompt-utils"

export type SortOption = "newest" | "oldest" | "rarity" | "usage" | "color"
export type RarityFilter = "All" | StyleCard["tier"]
export type ColorFilter =
  | "All"
  | "Red"
  | "Orange"
  | "Yellow"
  | "Green"
  | "Cyan"
  | "Blue"
  | "Purple"
  | "Pink"
  | "Brown"
  | "White"
  | "Black"
  | "Gray"

export function useLibrary(
  addLog: (msg: string) => void,
  setAlertType: (type: AlertType) => void,
  onNavigateToWorkbench?: () => void
) {
  const [searchTag, setSearchTag] = useState("")
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("All")
  const [categoryFilter, setCategoryFilter] = useState<string>("All")
  const [colorFilter, setColorFilter] = useState<ColorFilter>("All")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [visibleCount, setVisibleCount] = useState(12)

  const totalCount =
    useLiveQuery(async () => {
      return await db.styleCards
        .where("isDeleted")
        .notEqual(1)
        .filter((c) => !c.isVariable)
        .count()
    }) || 0

  const isDefaultView =
    !searchTag &&
    rarityFilter === "All" &&
    categoryFilter === "All" &&
    colorFilter === "All"

  const allCards = useLiveQuery(async () => {
    if (isDefaultView) {
      if (sortBy === "newest") {
        const cards = await db.styleCards
          .where("isDeleted")
          .notEqual(1)
          .reverse()
          .sortBy("createdAt")
        return cards.filter((c) => !c.isVariable).slice(0, visibleCount)
      } else if (sortBy === "oldest") {
        const cards = await db.styleCards
          .where("isDeleted")
          .notEqual(1)
          .sortBy("createdAt")
        return cards.filter((c) => !c.isVariable).slice(0, visibleCount)
      }
    }
    return db.getAllCards()
  }, [isDefaultView, sortBy, visibleCount])

  const categories = useLiveQuery(() => db.getAllCategories()) || []

  const allSrefs = useMemo(() => {
    if (!allCards) return []
    const srefs = new Set<string>()
    allCards.forEach((card) => {
      card.parameters?.sref?.forEach((url) => srefs.add(url))
    })
    return Array.from(srefs)
  }, [allCards])

  // FlexSearch indexing for performance
  const searchIndex = useMemo(() => {
    // @ts-ignore
    const index = new FlexSearch.Index({
      tokenize: "forward",
      resolution: 9
    })

    if (!allCards) return index

    allCards.forEach((card) => {
      if (card.isVariable) return
      const catObj = categories.find((c) => c.id === card.category)
      const categoryName = catObj ? catObj.name : ""

      const textToIndex = [
        card.name,
        card.tags?.join(" ") || "",
        card.parameters?.sref?.join(" ") || "",
        categoryName
      ]
        .join(" ")
        .toLowerCase()

      index.add(card.id, textToIndex)
    })

    return index
  }, [allCards, categories])

  const searchResults = useMemo(() => {
    if (!searchTag || !searchIndex) return null
    // @ts-ignore
    const results = searchIndex.search(searchTag.toLowerCase())
    return new Set(results)
  }, [searchTag, searchIndex])

  const filteredAndSortedCards = useMemo(() => {
    if (!allCards) return []

    let result = allCards.filter((card) => !card.isVariable)

    // Filtering using FlexSearch matching IDs
    if (searchTag && searchResults) {
      result = result.filter((card) => searchResults.has(card.id))
    }

    if (rarityFilter !== "All") {
      result = result.filter((card) => card.tier === rarityFilter)
    }

    if (categoryFilter !== "All") {
      result = result.filter((card) => card.category === categoryFilter)
    }

    // Dominant Color filtering
    if (colorFilter !== "All") {
      result = result.filter((card) => {
        if (!card.dominantColor) return false
        try {
          return getColorNameFromHex(card.dominantColor) === colorFilter
        } catch {
          return false
        }
      })
    }

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
        case "color": {
          const getSortKey = (
            hex: string
          ): { isNeutral: boolean; h: number; s: number; l: number } => {
            if (!hex) return { isNeutral: true, h: 0, s: 0, l: 0 }
            try {
              const [h, s, l] = hexToHsl(hex)
              const isNeutral = l > 85 || l < 15 || s < 15
              return { isNeutral, h, s, l }
            } catch {
              return { isNeutral: true, h: 0, s: 0, l: 0 }
            }
          }

          const keyA = getSortKey(a.dominantColor)
          const keyB = getSortKey(b.dominantColor)

          if (keyA.isNeutral && !keyB.isNeutral) return 1
          if (!keyA.isNeutral && keyB.isNeutral) return -1

          if (!keyA.isNeutral && !keyB.isNeutral) {
            if (keyA.h !== keyB.h) return keyA.h - keyB.h
            if (keyA.s !== keyB.s) return keyB.s - keyA.s
            return keyB.l - keyA.l
          } else {
            return keyB.l - keyA.l
          }
        }
        default:
          return 0
      }
    })

    return result
  }, [
    allCards,
    categories,
    searchTag,
    searchResults,
    rarityFilter,
    categoryFilter,
    colorFilter,
    sortBy
  ])

  const hasMore = isDefaultView
    ? totalCount > visibleCount
    : filteredAndSortedCards.length > visibleCount
  const visibleCards = useMemo(() => {
    return filteredAndSortedCards.slice(0, visibleCount)
  }, [filteredAndSortedCards, visibleCount])

  const loadMore = () => {
    setVisibleCount((prev) => prev + 12)
  }

  const togglePin = async (card: StyleCard, e: React.MouseEvent) => {
    e.stopPropagation()
    const newPinnedStatus = !card.isPinned
    try {
      const updateData: Partial<StyleCard> = { isPinned: newPinnedStatus }
      if (newPinnedStatus) {
        const pinnedCount = allCards?.filter((c) => c.isPinned).length || 0
        if (pinnedCount >= 7) {
          setAlertType("hand_full")
          return
        }
        updateData.usageCount = (card.usageCount || 0) + 1
      }
      await db.updateCard(card.id, updateData)
      addLog(
        newPinnedStatus
          ? `Added ${card.name} to Workbench.`
          : `Removed ${card.name} from Workbench.`
      )
    } catch (err) {
      console.error("Failed to toggle pin:", err)
    }
  }

  const handleCardClick = (card: StyleCard) => {
    const hasSlots = card.promptSegments?.some((seg) => seg.type === "slot")
    if (hasSlots) {
      if (!card.isPinned) {
        const pinnedCount = allCards?.filter((c) => c.isPinned).length || 0
        if (pinnedCount >= 7) {
          setAlertType("hand_full")
          return
        }
        db.updateCard(card.id, { isPinned: true }).catch((err) =>
          console.error("Failed to pin card:", err)
        )
      }
      addLog(
        `Redirected to Workbench to fill slot variables for "${card.name}".`
      )
      if (onNavigateToWorkbench) {
        onNavigateToWorkbench()
      }
      return
    }

    const maskedKeys: (keyof StyleCard["parameters"])[] = []
    if (card.masking.isSrefHidden) {
      maskedKeys.push("sref")
    }
    if (card.masking.isPHidden) {
      maskedKeys.push("p")
    }
    const prompt = buildPromptString(
      card.promptSegments,
      card.parameters,
      maskedKeys
    )
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0]
      if (activeTab?.id) {
        chrome.tabs
          .sendMessage(activeTab.id, {
            type: "INJECT_PROMPT",
            prompt: prompt
          })
          .then((response) => {
            if (response && response.status === "error") {
              if (
                response.message &&
                response.message.includes("Could not find chat input")
              ) {
                setAlertType("no_input")
              } else {
                setAlertType("disconnected")
              }
            } else {
              addLog(`Sent prompt: ${prompt.substring(0, 30)}...`)
              db.updateCard(card.id, {
                usageCount: (card.usageCount || 0) + 1
              }).catch((err) =>
                console.error("Failed to update usage count on inject:", err)
              )
            }
          })
          .catch((err) => {
            // Fix: Report error to global alert system
            console.error("Library injection failed:", err)
            setAlertType("disconnected")
            addLog(`Note: ${err.message || "Could not send to tab"}`)
          })
      } else {
        addLog("No active tab found")
        setAlertType("disconnected")
      }
    })
  }

  return {
    styleCards: visibleCards,
    handleCardClick,
    togglePin,
    searchTag,
    setSearchTag,
    rarityFilter,
    setRarityFilter,
    categoryFilter,
    setCategoryFilter,
    colorFilter,
    setColorFilter,
    sortBy,
    setSortBy,
    allSrefs,
    categories,
    allCards,
    hasMore,
    loadMore,
    visibleCount,
    setVisibleCount
  }
}
