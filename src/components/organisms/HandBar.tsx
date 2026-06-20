import React from "react"
import { createPortal } from "react-dom"

import { useHandBar } from "../../hooks/useHandBar"
import type { StyleCard } from "../../shared/lib/db-schema"
import { MergeStackModal } from "../organisms/MergeStackModal"
import { HandBarHeader } from "./HandBarHeader"
import { HandBarScrollArea } from "./HandBarScrollArea"

export interface HandBarProps {
  onNavigateToWorkbench?: () => void
  onOpenDetailCard?: (card: StyleCard) => void
}

interface HandBarInnerProps extends HandBarProps {
  handBarState: ReturnType<typeof useHandBar>
}

function MergePortal({
  isOpen,
  onClose,
  cards,
  onExecuteMerge
}: {
  isOpen: boolean
  onClose: () => void
  cards: StyleCard[]
  onExecuteMerge: (
    baseCardId: string,
    consumeStates: Record<string, boolean>
  ) => Promise<void>
}) {
  if (!isOpen) return null
  return createPortal(
    <MergeStackModal
      isOpen={isOpen}
      onClose={onClose}
      workbenchCards={cards}
      onExecuteMerge={onExecuteMerge}
    />,
    document.body
  )
}

function HandBarContent({
  onNavigateToWorkbench,
  onOpenDetailCard,
  s
}: {
  onNavigateToWorkbench?: () => void
  onOpenDetailCard?: (card: StyleCard) => void
  s: ReturnType<typeof useHandBar>
}) {
  return (
    <div className="max-w-md mx-auto p-2">
      <HandBarHeader
        pinnedCardsCount={s.pinnedCards.length}
        isCollapsed={s.isCollapsed}
        toggleCollapse={s.toggleCollapse}
        expertFeatures={s.expertFeatures}
        isMergeEnabled={s.pinnedCards.length >= 2}
        onMergeClick={() => s.setIsMergeOpen(true)}
        onClearClick={s.clearHand}
        t={s.t}
      />
      <HandBarScrollArea
        pinnedCards={s.pinnedCards}
        scrollRef={s.scrollRef}
        showLeftArrow={s.showLeftArrow}
        showRightArrow={s.showRightArrow}
        checkScroll={s.checkScroll}
        unpinCard={s.unpinCard}
        onOpenDetailCard={onOpenDetailCard}
        onNavigateToWorkbench={onNavigateToWorkbench}
        t={s.t}
      />
    </div>
  )
}

function HandBarInner({
  onNavigateToWorkbench,
  onOpenDetailCard,
  handBarState
}: HandBarInnerProps) {
  const s = handBarState
  const handleCollapsedClick = () => {
    s.setIsCollapsed(false)
    if (typeof window !== "undefined")
      localStorage.setItem("handbar_collapsed", "false")
  }

  return (
    <div
      id="handbar-root"
      onClick={s.isCollapsed ? handleCollapsedClick : undefined}
      className={`absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 shadow-none z-50 transition-all duration-300 ease-in-out ${
        s.isCollapsed
          ? "cursor-pointer hover:bg-slate-50/95 dark:hover:bg-slate-800/95"
          : "cursor-default"
      }`}
      style={{
        transform: s.isCollapsed
          ? "translateY(calc(100% - 38px))"
          : "translateY(0)"
      }}>
      <HandBarContent
        onNavigateToWorkbench={onNavigateToWorkbench}
        onOpenDetailCard={onOpenDetailCard}
        s={s}
      />
      <MergePortal
        isOpen={s.isMergeOpen}
        onClose={() => s.setIsMergeOpen(false)}
        cards={s.pinnedCards}
        onExecuteMerge={s.handleExecuteMerge}
      />
    </div>
  )
}

export function HandBar({
  onNavigateToWorkbench,
  onOpenDetailCard
}: HandBarProps) {
  const handBarState = useHandBar()

  if (handBarState.pinnedCards.length === 0) {
    return <div id="handbar-root" />
  }

  return (
    <HandBarInner
      onNavigateToWorkbench={onNavigateToWorkbench}
      onOpenDetailCard={onOpenDetailCard}
      handBarState={handBarState}
    />
  )
}
