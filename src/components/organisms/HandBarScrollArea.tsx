import { BookUp2, ChevronLeft, ChevronRight } from "lucide-react"
import React from "react"

import type { StyleCard } from "../../lib/db-schema"
import { buildPromptString } from "../../lib/prompt-utils"
import { RARITY_CONFIG } from "../../lib/rarity-config"
import { CardThumbnail } from "../molecules/CardThumbnail"

interface ScrollButtonProps {
  direction: "left" | "right"
  onClick: () => void
  show: boolean
}

function ScrollButton({ direction, onClick, show }: ScrollButtonProps) {
  if (!show) return null
  const isLeft = direction === "left"
  return (
    <button
      onClick={onClick}
      className={`absolute ${isLeft ? "left-0" : "right-0"} top-1/2 -translate-y-1/2 z-20 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full p-1 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all opacity-40 hover:opacity-100 group-hover/scroll:opacity-100 focus:opacity-100`}
      style={{ width: "20px", height: "20px" }}
      title={isLeft ? "左へスクロール" : "右へスクロール"}
      data-testid={
        isLeft ? "handbar-scroll-left-btn" : "handbar-scroll-right-btn"
      }
      type="button">
      {isLeft ? (
        <ChevronLeft className="w-3 h-3" />
      ) : (
        <ChevronRight className="w-3 h-3" />
      )}
    </button>
  )
}

function HandBarThumbnailItem({
  card,
  index,
  shouldStack,
  unpinCard,
  onOpenDetailCard
}: {
  card: StyleCard
  index: number
  shouldStack: boolean
  unpinCard: (id: string) => Promise<void>
  onOpenDetailCard?: (card: StyleCard) => void
}) {
  const config = RARITY_CONFIG[card.tier]
  const stackClass = shouldStack && index > 0 ? "ml-[-16px]" : ""
  return (
    <div
      onClick={() => onOpenDetailCard?.(card)}
      style={{ zIndex: index, position: "relative" }}
      className={`cursor-pointer flex-shrink-0 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:z-30 ${stackClass}`}>
      <CardThumbnail
        imageUrl={card.thumbnailData}
        thumbnailImages={card.selectedThumbnails}
        alt={card.name}
        tier={card.tier}
        size="sm"
        onDeleteClick={(e) => {
          e.stopPropagation()
          unpinCard(card.id)
        }}
        className={`flex-shrink-0 border-2 transition-all ${config.borderClass}`}
        draggable={true}
        onDragStart={(e) => {
          const text = buildPromptString(card.promptSegments, card.parameters)
          e.dataTransfer.setData("text/plain", text)
        }}
      />
    </div>
  )
}

function ScrollOverlay({
  direction,
  show
}: {
  direction: "left" | "right"
  show: boolean
}) {
  if (!show) return null
  const isLeft = direction === "left"
  return (
    <div
      className={`absolute ${
        isLeft ? "left-4 bg-gradient-to-r" : "right-4 bg-gradient-to-l"
      } top-0 bottom-0 w-8 from-white/95 dark:from-slate-900/95 to-transparent pointer-events-none z-10`}
    />
  )
}

export interface HandBarScrollAreaProps {
  pinnedCards: StyleCard[]
  scrollRef: React.RefObject<HTMLDivElement>
  showLeftArrow: boolean
  showRightArrow: boolean
  checkScroll: () => void
  unpinCard: (id: string) => Promise<void>
  onOpenDetailCard?: (card: StyleCard) => void
  onNavigateToWorkbench?: () => void
}

export function HandBarScrollArea(props: HandBarScrollAreaProps) {
  const shouldStack = props.pinnedCards.length >= 4

  return (
    <div className="relative group/scroll px-4">
      <ScrollOverlay direction="left" show={props.showLeftArrow} />
      <ScrollButton
        direction="left"
        show={props.showLeftArrow}
        onClick={() =>
          props.scrollRef.current?.scrollBy({ left: -80, behavior: "smooth" })
        }
      />

      <div
        ref={props.scrollRef}
        className={`flex overflow-x-auto pb-1.5 custom-scrollbar scroll-smooth ${
          shouldStack ? "gap-1" : "gap-2"
        }`}
        onScroll={props.checkScroll}>
        {props.pinnedCards.map((card, index) => (
          <HandBarThumbnailItem
            key={card.id}
            card={card}
            index={index}
            shouldStack={shouldStack}
            unpinCard={props.unpinCard}
            onOpenDetailCard={props.onOpenDetailCard}
          />
        ))}
        <button
          onClick={props.onNavigateToWorkbench}
          className="flex-shrink-0 w-12 h-12 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all bg-slate-50 dark:bg-slate-800/50"
          title="Workbenchを開く"
          data-testid="navigate-to-workbench-btn">
          <BookUp2 className="w-5 h-5" />
        </button>
      </div>

      <ScrollOverlay direction="right" show={props.showRightArrow} />
      <ScrollButton
        direction="right"
        show={props.showRightArrow}
        onClick={() =>
          props.scrollRef.current?.scrollBy({ left: 80, behavior: "smooth" })
        }
      />
    </div>
  )
}
