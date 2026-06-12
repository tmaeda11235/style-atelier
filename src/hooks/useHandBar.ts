import { useEffect, useRef, useState } from "react"

import { useLanguage } from "../contexts/LanguageContext"
import { useSettings } from "../contexts/SettingsContext"
import type { StyleCard } from "../lib/db-schema"
import { useHand } from "./useHand"

/**
 * Custom hook to manage scroll behavior and arrow visibility for HandBar.
 */
export function useHandBarScroll(pinnedCards: StyleCard[]) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const checkScroll = () => {
    const el = scrollRef.current
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el
      setShowLeftArrow(scrollLeft > 1)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  const pinnedCardsDependency = pinnedCards
    .map((c) => `${c.id}-${c.updatedAt || 0}`)
    .join(",")

  useEffect(() => {
    checkScroll()
  }, [pinnedCardsDependency])

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.addEventListener("scroll", checkScroll)
      window.addEventListener("resize", checkScroll)
      const timer = setTimeout(checkScroll, 100)
      return () => {
        el.removeEventListener("scroll", checkScroll)
        window.removeEventListener("resize", checkScroll)
        clearTimeout(timer)
      }
    }
  }, [pinnedCards.length])

  return { scrollRef, showLeftArrow, showRightArrow, checkScroll }
}

/**
 * Custom hook to manage collapsible state and drag/auto-expand behavior for HandBar.
 */
export function useHandBarCollapse(pinnedCardsLength: number) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("handbar_collapsed")
      return saved === "true"
    }
    return false
  })

  const [prevCount, setPrevCount] = useState(pinnedCardsLength)
  useEffect(() => {
    if (pinnedCardsLength > prevCount) {
      setIsCollapsed(false)
      if (typeof window !== "undefined") {
        localStorage.setItem("handbar_collapsed", "false")
      }
    }
    setPrevCount(pinnedCardsLength)
  }, [pinnedCardsLength, prevCount])

  useEffect(() => {
    const handleDragStart = () => {
      setIsCollapsed(false)
      if (typeof window !== "undefined") {
        localStorage.setItem("handbar_collapsed", "false")
      }
    }
    if (typeof window !== "undefined") {
      window.addEventListener("dragstart", handleDragStart)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("dragstart", handleDragStart)
      }
    }
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      if (typeof window !== "undefined") {
        localStorage.setItem("handbar_collapsed", String(next))
      }
      return next
    })
  }

  return { isCollapsed, setIsCollapsed, toggleCollapse }
}

/**
 * Guard hook to enforce single card mode when multi-card feature is disabled.
 */
export function useMultiCardGuard(
  multiCardEnabled: boolean,
  pinnedCards: StyleCard[],
  unpinCard: (id: string) => void
) {
  useEffect(() => {
    if (!multiCardEnabled && pinnedCards.length > 1) {
      const latest = pinnedCards[pinnedCards.length - 1]
      pinnedCards.forEach((c) => {
        if (c.id !== latest.id) unpinCard(c.id)
      })
    }
  }, [multiCardEnabled, unpinCard, pinnedCards])
}

/**
 * Custom hook to manage the state and logic for the HandBar component.
 * Extracts scrolling, collapse/expand states, and merge operations.
 */
export function useHandBar() {
  const { pinnedCards, unpinCard, clearHand, mergeCards } = useHand()
  const { expertFeatures } = useSettings()
  const { t } = useLanguage()
  const [isMergeOpen, setIsMergeOpen] = useState(false)

  const { scrollRef, showLeftArrow, showRightArrow, checkScroll } =
    useHandBarScroll(pinnedCards)
  const { isCollapsed, setIsCollapsed, toggleCollapse } = useHandBarCollapse(
    pinnedCards.length
  )

  useMultiCardGuard(expertFeatures.multiCard, pinnedCards, unpinCard)

  const handleExecuteMerge = async (
    baseCardId: string,
    consumeStates: Record<string, boolean>
  ) => {
    try {
      await mergeCards(
        baseCardId,
        pinnedCards.filter((c) => c.id !== baseCardId),
        consumeStates
      )
      setIsMergeOpen(false)
    } catch (err) {
      console.error("Failed to merge style cards:", err)
    }
  }

  return {
    pinnedCards,
    unpinCard,
    clearHand,
    expertFeatures,
    t,
    scrollRef,
    showLeftArrow,
    showRightArrow,
    isMergeOpen,
    setIsMergeOpen,
    isCollapsed,
    setIsCollapsed,
    toggleCollapse,
    checkScroll,
    handleExecuteMerge
  }
}
