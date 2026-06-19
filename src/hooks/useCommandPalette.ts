/* eslint-disable max-lines-per-function */
import { useCallback, useEffect, useState } from "react"

import { useSettings } from "../contexts/SettingsContext"
import { getAllCategories, getAllStyleCards } from "../lib/style-card-store"
import type { CustomCategory, StyleCard } from "../shared/lib/db-schema"

export interface PaletteItem {
  id: string
  type: "command" | "card" | "category"
  title: string
  subtitle?: string
  icon?: string
  color?: string
  action: () => void
}

export function useCommandPalette() {
  const { isEasyMode, toggleEasyMode } = useSettings()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const [cards, setCards] = useState<StyleCard[]>([])
  const [categories, setCategories] = useState<CustomCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load cards and categories on open
  useEffect(() => {
    if (!isOpen) return

    const loadData = async () => {
      setIsLoading(true)
      try {
        const [loadedCards, loadedCategories] = await Promise.all([
          getAllStyleCards(),
          getAllCategories()
        ])
        setCards(loadedCards)
        setCategories(loadedCategories)
      } catch (err) {
        console.error("Failed to load command palette search targets", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
    setQuery("")
    setSelectedIndex(0)
  }, [isOpen])

  // Keydown listener for shortcut Ctrl/Cmd + K & Escape
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown)
    }
  }, [])

  // Create action dispatcher helpers
  const dispatchTabChange = useCallback(
    (mode: "easy" | "expert", tab: string) => {
      if (mode === "easy") {
        window.dispatchEvent(
          new CustomEvent("change-easy-tab", { detail: tab })
        )
      } else {
        window.dispatchEvent(
          new CustomEvent("change-expert-tab", { detail: tab })
        )
      }
      setIsOpen(false)
    },
    []
  )

  const dispatchCardDetail = useCallback((cardId: string) => {
    window.dispatchEvent(
      new CustomEvent("open-card-detail", { detail: { cardId } })
    )
    setIsOpen(false)
  }, [])

  const dispatchCategoryFilter = useCallback(
    (categoryId: string) => {
      // Navigate to library first
      if (isEasyMode) {
        dispatchTabChange("easy", "library")
      } else {
        dispatchTabChange("expert", "library")
      }
      // Dispatch filter category event after tab transitions
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("filter-category", { detail: { categoryId } })
        )
      }, 50)
      setIsOpen(false)
    },
    [isEasyMode, dispatchTabChange]
  )

  const dispatchReplayTutorial = useCallback(() => {
    localStorage.removeItem("style-atelier-onboarding-seen")
    localStorage.setItem("style-atelier-onboarding-replay-trigger", "true")
    // Replay tutorial usually switches to expert mode or kicks off onboarding
    window.dispatchEvent(new CustomEvent("replay-tutorial"))
    setIsOpen(false)
  }, [])

  // Command definitions
  const getCommands = useCallback((): PaletteItem[] => {
    const items: PaletteItem[] = []

    if (!isEasyMode) {
      items.push({
        id: "/mint",
        type: "command",
        title: "/mint",
        subtitle: "Create a new Style Card from image history",
        icon: "✨",
        action: () => dispatchTabChange("expert", "history")
      })
      items.push({
        id: "/mix",
        type: "command",
        title: "/mix",
        subtitle: "Open Workbench (Cauldron) to blend style cards",
        icon: "🧪",
        action: () => dispatchTabChange("expert", "workbench")
      })
    }

    items.push({
      id: "/search",
      type: "command",
      title: "/search",
      subtitle: "Browse and search Style Cards in Library",
      icon: "🔍",
      action: () => dispatchTabChange(isEasyMode ? "easy" : "expert", "library")
    })

    items.push({
      id: "/settings",
      type: "command",
      title: "/settings",
      subtitle: "Configure app features and storage preferences",
      icon: "⚙️",
      action: () =>
        dispatchTabChange(isEasyMode ? "easy" : "expert", "settings")
    })

    if (isEasyMode) {
      items.push({
        id: "/expert",
        type: "command",
        title: "/expert",
        subtitle: "Switch to Expert Mode (Advanced prompt controls)",
        icon: "🎩",
        action: () => {
          toggleEasyMode(false)
          setIsOpen(false)
        }
      })
    } else {
      items.push({
        id: "/easy",
        type: "command",
        title: "/easy",
        subtitle: "Switch to Easy Mode (Simplified PWA-like view)",
        icon: "🌱",
        action: () => {
          toggleEasyMode(true)
          setIsOpen(false)
        }
      })
    }

    items.push({
      id: "/help",
      type: "command",
      title: "/help",
      subtitle: "Restart the interactive onboarding tutorial",
      icon: "❓",
      action: dispatchReplayTutorial
    })

    return items
  }, [isEasyMode, toggleEasyMode, dispatchTabChange, dispatchReplayTutorial])

  // Get matching items based on query
  const getFilteredItems = useCallback((): PaletteItem[] => {
    const commands = getCommands()
    const cleanQuery = query.trim().toLowerCase()

    // 1. Progressive Disclosure: query is empty
    if (!cleanQuery) {
      return commands
    }

    // 2. Command mode (query starts with /)
    if (cleanQuery.startsWith("/")) {
      return commands.filter((cmd) =>
        cmd.title.toLowerCase().startsWith(cleanQuery)
      )
    }

    // 3. Search Mode (general terms matching commands, cards, or categories)
    const matches: PaletteItem[] = []

    // Match commands by sub-string
    const matchingCmds = commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(cleanQuery) ||
        cmd.subtitle?.toLowerCase().includes(cleanQuery)
    )
    matches.push(...matchingCmds)

    // Match categories
    const matchingCategories = categories
      .filter((cat) => cat.name.toLowerCase().includes(cleanQuery))
      .map(
        (cat): PaletteItem => ({
          id: `cat-${cat.id}`,
          type: "category",
          title: cat.name,
          subtitle: `Category Folder`,
          icon: cat.iconEmoji || "📁",
          action: () => dispatchCategoryFilter(cat.id)
        })
      )
    matches.push(...matchingCategories)

    // Match style cards
    const matchingCards = cards
      .filter(
        (card) =>
          card.name.toLowerCase().includes(cleanQuery) ||
          card.tags.some((t) => t.toLowerCase().includes(cleanQuery)) ||
          card.promptSegments.some(
            (seg) =>
              seg.type === "text" &&
              seg.value.toLowerCase().includes(cleanQuery)
          )
      )
      .map(
        (card): PaletteItem => ({
          id: `card-${card.id}`,
          type: "card",
          title: card.name,
          subtitle: `Style Card • ${card.tier}`,
          icon: "🃏",
          color: card.dominantColor,
          action: () => dispatchCardDetail(card.id)
        })
      )
    matches.push(...matchingCards)

    return matches.slice(0, 15) // Cap at 15 items for layout stability
  }, [
    query,
    getCommands,
    cards,
    categories,
    dispatchCategoryFilter,
    dispatchCardDetail
  ])

  const filteredItems = getFilteredItems()

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Key operations in active state
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex(
          (prev) => (prev + 1) % Math.max(1, filteredItems.length)
        )
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex(
          (prev) =>
            (prev - 1 + filteredItems.length) %
            Math.max(1, filteredItems.length)
        )
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action()
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        setIsOpen(false)
      }
    },
    [isOpen, filteredItems, selectedIndex]
  )

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    filteredItems,
    isLoading,
    handleKeyDown
  }
}
