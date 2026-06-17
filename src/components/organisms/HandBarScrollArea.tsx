import { BookUp2 } from "lucide-react"
import React from "react"

import type { StyleCard } from "../../lib/db-schema"
import { buildPromptString } from "../../lib/prompt-utils"
import { RARITY_CONFIG } from "../../lib/rarity-config"
import { CardThumbnail } from "../molecules/CardThumbnail"
import { ScrollButton } from "./HandBarScrollButton"

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
  t: any
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
        t={props.t}
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
          title={props.t.workbench.openWorkbench}
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
        t={props.t}
      />
    </div>
  )
}
