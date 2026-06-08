import { useLiveQuery } from "dexie-react-hooks"
import { Index } from "flexsearch"
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

interface StyleCardMetadata {
  id: string
  name: string
  tags: string[]
  tier: StyleCard["tier"]
  category?: string
  dominantColor?: string
  createdAt: number
  usageCount: number
  isPinned: boolean
  isVariable: boolean
  sref: string[]
  promptSegments: StyleCard["promptSegments"]
  parameters: StyleCard["parameters"]
  masking: StyleCard["masking"]
}

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
  const pageSize = 12

  // 1. メタデータのみを抽出して取得（重いthumbnailDataなどをReact Stateに全件保持しない）
  const allCardsMeta = useLiveQuery(async () => {
    const cards = await db.getAllCards()
    return cards.map(
      (c): StyleCardMetadata => ({
        id: c.id,
        name: c.name,
        tags: c.tags || [],
        tier: c.tier,
        category: c.category,
        dominantColor: c.dominantColor,
        createdAt: c.createdAt,
        usageCount: c.usageCount || 0,
        isPinned: !!c.isPinned,
        isVariable: !!c.isVariable,
        sref: c.parameters?.sref || [],
        promptSegments: c.promptSegments,
        parameters: c.parameters,
        masking: c.masking
      })
    )
  })

  const categories = useLiveQuery(() => db.getAllCategories()) || []

  // 2. 検索用の FlexSearch インデックス構築
  const flexsearchIndex = useMemo(() => {
    if (!allCardsMeta) return null
    const index = new Index({
      tokenize: "forward",
      resolution: 9
    })
    allCardsMeta.forEach((card) => {
      const catObj = categories.find((c) => c.id === card.category)
      const categoryName = catObj ? catObj.name.toLowerCase() : ""
      const searchText = [
        card.name,
        ...(card.tags || []),
        ...(card.sref || []),
        categoryName
      ]
        .join(" ")
        .toLowerCase()
      index.add(card.id, searchText)
    })
    return index
  }, [allCardsMeta, categories])

  const allSrefs = useMemo(() => {
    if (!allCardsMeta) return []
    const srefs = new Set<string>()
    allCardsMeta.forEach((card) => {
      card.sref?.forEach((url) => srefs.add(url))
    })
    return Array.from(srefs)
  }, [allCardsMeta])

  // 3. メモリ上での軽量フィルタリングとソート
  const filteredAndSortedMeta = useMemo(() => {
    if (!allCardsMeta) return []

    let result = allCardsMeta.filter((card) => !card.isVariable)

    // FlexSearchによる高速テキスト検索
    if (searchTag && flexsearchIndex) {
      const query = searchTag.toLowerCase()
      const matchedIds = flexsearchIndex.search(query)
      const matchedSet = new Set(matchedIds)
      result = result.filter((card) => matchedSet.has(card.id))
    }

    if (rarityFilter !== "All") {
      result = result.filter((card) => card.tier === rarityFilter)
    }

    if (categoryFilter !== "All") {
      result = result.filter((card) => card.category === categoryFilter)
    }

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
    allCardsMeta,
    categories,
    searchTag,
    flexsearchIndex,
    rarityFilter,
    categoryFilter,
    colorFilter,
    sortBy
  ])

  // 検索条件やソート条件が変わったら、表示件数をリセットする
  useMemo(() => {
    setVisibleCount(pageSize)
  }, [searchTag, rarityFilter, categoryFilter, colorFilter, sortBy])

  const visibleMeta = useMemo(() => {
    return filteredAndSortedMeta.slice(0, visibleCount)
  }, [filteredAndSortedMeta, visibleCount])

  const visibleIds = useMemo(() => {
    return visibleMeta.map((card) => card.id)
  }, [visibleMeta])

  // 4. 表示対象のカード実体（サムネイル等含む）のみをIndexedDBからバルク取得
  const visibleCards = useLiveQuery(async () => {
    if (!visibleIds || visibleIds.length === 0) return []
    const cards = await db.styleCards.bulkGet(visibleIds)
    const idToCardMap = new Map<string, StyleCard>()
    cards.forEach((card) => {
      if (card && !card.isDeleted) {
        idToCardMap.set(card.id, card)
      }
    })
    return visibleIds
      .map((id) => idToCardMap.get(id))
      .filter((card): card is StyleCard => !!card)
  }, [visibleIds])

  const togglePin = async (
    card: StyleCard | StyleCardMetadata,
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    const newPinnedStatus = !card.isPinned
    try {
      const updateData: Partial<StyleCard> = { isPinned: newPinnedStatus }
      if (newPinnedStatus) {
        const pinnedCount = allCardsMeta?.filter((c) => c.isPinned).length || 0
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

  const handleCardClick = (card: StyleCard | StyleCardMetadata) => {
    const hasSlots = card.promptSegments?.some((seg) => seg.type === "slot")
    if (hasSlots) {
      if (!card.isPinned) {
        const pinnedCount = allCardsMeta?.filter((c) => c.isPinned).length || 0
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

  const hasMore = filteredAndSortedMeta.length > visibleCount
  const loadMore = () => setVisibleCount((prev) => prev + pageSize)

  return {
    styleCards: visibleCards || [],
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
    allCards: allCardsMeta,
    hasMore,
    loadMore,
    totalMatchedCount: filteredAndSortedMeta.length
  }
}
