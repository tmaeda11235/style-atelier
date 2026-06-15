import { BookUp2, ChevronDown, ChevronUp, Layers, Trash2 } from "lucide-react"
import React from "react"
import { createPortal } from "react-dom"

import { useHandBar } from "../../hooks/useHandBar"
import type { StyleCard } from "../../lib/db-schema"
import { buildPromptString } from "../../lib/prompt-utils"
import { RARITY_CONFIG } from "../../lib/rarity-config"
import { Button } from "../atoms/Button"
import { HelpTooltip } from "../atoms/HelpTooltip"
import { CardThumbnail } from "../molecules/CardThumbnail"
import { MergeStackModal } from "../organisms/MergeStackModal"
import { ScrollButton } from "./HandBarScrollButton"

export interface HandBarProps {
  onNavigateToWorkbench?: () => void
  onOpenDetailCard?: (card: StyleCard) => void
}

interface HandBarHeaderProps {
  pinnedCardsCount: number
  isCollapsed: boolean
  toggleCollapse: () => void
  expertFeatures: { stack?: boolean }
  isMergeEnabled: boolean
  onMergeClick: () => void
  onClearClick: () => void
  t: any
}

function HandBarHeader({
  pinnedCardsCount,
  isCollapsed,
  toggleCollapse,
  expertFeatures,
  isMergeEnabled,
  onMergeClick,
  onClearClick,
  t
}: HandBarHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {t.navigation.workbench} ({pinnedCardsCount})
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={(e) => {
            e.stopPropagation()
            toggleCollapse()
          }}
          className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-0.5 h-auto"
          title={isCollapsed ? t.workbench.expand : t.workbench.collapse}
          data-testid="handbar-toggle-collapse-btn">
          {isCollapsed ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
      {!isCollapsed && (
        <div className="flex gap-2">
          {isMergeEnabled && expertFeatures.stack && (
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="xs"
                onClick={onMergeClick}
                className="flex items-center justify-center bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 font-bold p-1"
                data-testid="handbar-merge-btn"
                title={t.mergeStack.merge}>
                <Layers className="w-3.5 h-3.5" />
              </Button>
              <HelpTooltip
                content={t.helpTooltips.stack}
                position="top-right"
              />
            </div>
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={onClearClick}
            className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 flex items-center justify-center"
            data-testid="handbar-clear-all-btn"
            title={t.workbench.clearAll}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

interface HandBarScrollAreaProps {
  pinnedCards: StyleCard[]
  scrollRef: React.RefObject<HTMLDivElement>
  showLeftArrow: boolean
  showRightArrow: boolean
  checkScroll: () => void
  unpinCard: (id: string) => Promise<void>
  onOpenDetailCard?: (card: StyleCard) => void
  onNavigateToWorkbench?: () => void
  t: any
}

function HandBarScrollArea({
  pinnedCards,
  scrollRef,
  showLeftArrow,
  showRightArrow,
  checkScroll,
  unpinCard,
  onOpenDetailCard,
  onNavigateToWorkbench,
  t
}: HandBarScrollAreaProps) {
  const shouldStack = pinnedCards.length >= 4

  const handleScrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -80, behavior: "smooth" })
  }

  const handleScrollRight = () => {
    scrollRef.current?.scrollBy({ left: 80, behavior: "smooth" })
  }

  const renderedCards = pinnedCards.map((card, index) => {
    const config = RARITY_CONFIG[card.tier]
    const stackClass = shouldStack && index > 0 ? "ml-[-16px]" : ""
    const handleDragStart = (e: React.DragEvent) => {
      const text = buildPromptString(card.promptSegments, card.parameters)
      e.dataTransfer.setData("text/plain", text)
    }
    const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      unpinCard(card.id)
    }
    return (
      <div
        key={card.id}
        onClick={() => onOpenDetailCard?.(card)}
        style={{ zIndex: index, position: "relative" }}
        className={`cursor-pointer flex-shrink-0 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:z-30 ${stackClass}`}>
        <CardThumbnail
          imageUrl={card.thumbnailData}
          thumbnailImages={card.selectedThumbnails}
          alt={card.name}
          tier={card.tier}
          size="sm"
          onDeleteClick={handleDeleteClick}
          className={`flex-shrink-0 border-2 transition-all ${config.borderClass}`}
          draggable={true}
          onDragStart={handleDragStart}
        />
      </div>
    )
  })

  return (
    <div className="relative group/scroll px-4">
      {showLeftArrow && (
        <div className="absolute left-4 top-0 bottom-0 w-8 bg-gradient-to-r from-white/95 dark:from-slate-900/95 to-transparent pointer-events-none z-10" />
      )}
      <ScrollButton
        direction="left"
        show={showLeftArrow}
        onClick={handleScrollLeft}
        t={t}
      />

      <div
        ref={scrollRef}
        className={`flex overflow-x-auto pb-1.5 custom-scrollbar scroll-smooth ${
          shouldStack ? "gap-1" : "gap-2"
        }`}
        onScroll={checkScroll}>
        {renderedCards}
        <button
          onClick={onNavigateToWorkbench}
          className="flex-shrink-0 w-12 h-12 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all bg-slate-50 dark:bg-slate-800/50"
          title={t.workbench.openWorkbench}
          data-testid="navigate-to-workbench-btn">
          <BookUp2 className="w-5 h-5" />
        </button>
      </div>

      {showRightArrow && (
        <div className="absolute right-4 top-0 bottom-0 w-8 bg-gradient-to-l from-white/95 dark:from-slate-900/95 to-transparent pointer-events-none z-10" />
      )}
      <ScrollButton
        direction="right"
        show={showRightArrow}
        onClick={handleScrollRight}
        t={t}
      />
    </div>
  )
}

export function HandBar({
  onNavigateToWorkbench,
  onOpenDetailCard
}: HandBarProps) {
  const {
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
  } = useHandBar()

  if (pinnedCards.length === 0) return <div id="handbar-root" />

  return (
    <div
      id="handbar-root"
      onClick={
        isCollapsed
          ? () => {
              setIsCollapsed(false)
              if (typeof window !== "undefined") {
                localStorage.setItem("handbar_collapsed", "false")
              }
            }
          : undefined
      }
      className={`fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 shadow-lg z-50 transition-all duration-300 ease-in-out ${
        isCollapsed
          ? "cursor-pointer hover:bg-slate-50/95 dark:hover:bg-slate-800/95"
          : "cursor-default"
      }`}
      style={{
        transform: isCollapsed
          ? "translateY(calc(100% - 38px))"
          : "translateY(0)"
      }}>
      <div className="max-w-md mx-auto p-2">
        <HandBarHeader
          pinnedCardsCount={pinnedCards.length}
          isCollapsed={isCollapsed}
          toggleCollapse={toggleCollapse}
          expertFeatures={expertFeatures}
          isMergeEnabled={pinnedCards.length >= 2}
          onMergeClick={() => setIsMergeOpen(true)}
          onClearClick={clearHand}
          t={t}
        />
        <HandBarScrollArea
          pinnedCards={pinnedCards}
          scrollRef={scrollRef}
          showLeftArrow={showLeftArrow}
          showRightArrow={showRightArrow}
          checkScroll={checkScroll}
          unpinCard={unpinCard}
          onOpenDetailCard={onOpenDetailCard}
          onNavigateToWorkbench={onNavigateToWorkbench}
          t={t}
        />
      </div>

      {isMergeOpen &&
        createPortal(
          <MergeStackModal
            isOpen={isMergeOpen}
            onClose={() => setIsMergeOpen(false)}
            workbenchCards={pinnedCards}
            onExecuteMerge={handleExecuteMerge}
          />,
          document.body
        )}
    </div>
  )
}
