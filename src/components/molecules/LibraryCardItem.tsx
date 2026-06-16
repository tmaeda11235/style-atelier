import React from "react"

import type { StyleCard } from "../../lib/db-schema"
import { buildPromptString } from "../../lib/prompt-utils"
import { RARITY_CONFIG } from "../../lib/rarity-config"
import { CardThumbnail } from "./CardThumbnail"

interface LibraryCardItemProps {
  card: StyleCard
  idx: number
  isEasyMode: boolean
  onOpenSimpleWorkbench?: (card: StyleCard) => void
  togglePin: (card: StyleCard, e: React.MouseEvent) => void
  advanceIfStep: (step: string) => void
  onOpenDetailCard: (card: StyleCard) => void
  handleCardClick: (card: StyleCard) => void
  setSharingCard: (card: StyleCard | null) => void
  categories: Array<{ id: string; name: string }>
  onQuickSend?: (card: StyleCard, e: React.MouseEvent) => void
  cardSlotThemeClass?: string
  onDragStartGlobal?: (e: React.DragEvent, cardId: string) => void
  onDragOverGlobal?: (e: React.DragEvent, cardId: string) => void
  onDragLeaveGlobal?: (e: React.DragEvent, cardId: string) => void
  onDropGlobal?: (e: React.DragEvent, cardId: string) => void
  onDragEndGlobal?: (e: React.DragEvent) => void
  isDragged?: boolean
  isDragOver?: boolean
}

const CardFooter = ({
  name,
  borderClass,
  bgClass
}: {
  name: string
  borderClass: string
  bgClass: string
}) => (
  <div className={`p-2 border-t ${borderClass} bg-opacity-5 ${bgClass}`}>
    <p className="text-xs font-bold text-slate-800 truncate">{name}</p>
  </div>
)

interface LibraryCardThumbnailProps {
  card: StyleCard
  cardCategory?: { id: string; name: string }
  onPinClick: ((e: React.MouseEvent) => void) | undefined
  onQuickSendClick: ((e: React.MouseEvent) => void) | undefined
  onEditClick: (card: StyleCard) => void
  onInjectClick: (card: StyleCard) => void
  onShareClick: (card: StyleCard) => void
  onDragStart: (e: React.DragEvent) => void
}

function LibraryCardThumbnail({
  card,
  cardCategory,
  onPinClick,
  onQuickSendClick,
  onEditClick,
  onInjectClick,
  onShareClick,
  onDragStart
}: LibraryCardThumbnailProps) {
  return (
    <CardThumbnail
      imageUrl={card.thumbnailPath || card.thumbnailData}
      thumbnailImages={card.selectedThumbnails}
      alt={card.name}
      tier={card.tier}
      isPinned={card.isPinned}
      usageCount={card.usageCount}
      onPinClick={onPinClick}
      onQuickSendClick={onQuickSendClick}
      onEditClick={(e) => {
        e.stopPropagation()
        onEditClick(card)
      }}
      onInjectClick={(e) => {
        e.stopPropagation()
        onInjectClick(card)
      }}
      onShareClick={(e) => {
        e.stopPropagation()
        onShareClick(card)
      }}
      category={cardCategory}
      draggable={true}
      onDragStart={onDragStart}
    />
  )
}

export function setupDragStart(e: React.DragEvent, card: StyleCard) {
  e.dataTransfer.setData(
    "text/plain",
    buildPromptString(card.promptSegments, card.parameters)
  )
  e.dataTransfer.setData("cardId", card.id)
}

export function handleCardClickHelper(
  e: React.MouseEvent,
  card: StyleCard,
  isEasyMode: boolean,
  togglePin: (card: StyleCard, e: React.MouseEvent) => void,
  advanceIfStep: (step: string) => void,
  onOpenSimpleWorkbench?: (card: StyleCard) => void
) {
  if (isEasyMode) {
    onOpenSimpleWorkbench?.(card)
  } else {
    togglePin(card, e)
    advanceIfStep("card-to-hand")
  }
}

export function getLibraryCardItemClassName(
  isDragged: boolean,
  isDragOver: boolean,
  cardSlotThemeClass: string | undefined,
  config: { borderClass: string; glowClass?: string }
): string {
  const base =
    "group bg-white border-2 rounded-lg shadow-sm cursor-grab active:cursor-grabbing overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 active:scale-[0.98]"
  const dragged = isDragged ? "opacity-40 scale-[0.96]" : ""
  const dragOver = isDragOver
    ? "border-indigo-500 scale-[1.04] ring-2 ring-indigo-500/20 z-10"
    : cardSlotThemeClass
      ? cardSlotThemeClass
      : `${config?.borderClass || "border-slate-200"} ${config?.glowClass || ""}`
  return `${base} ${dragged} ${dragOver}`
}

function getDragAndDropProps(props: any, handleDragStart: any) {
  return {
    draggable: true,
    onDragStart: handleDragStart,
    onDragOver: (e: React.DragEvent) =>
      props.onDragOverGlobal?.(e, props.card.id),
    onDragLeave: (e: React.DragEvent) =>
      props.onDragLeaveGlobal?.(e, props.card.id),
    onDrop: (e: React.DragEvent) => props.onDropGlobal?.(e, props.card.id),
    onDragEnd: props.onDragEndGlobal
  }
}

function LibraryCardItemInner({
  card,
  cardCategory,
  config,
  isEasyMode,
  togglePin,
  handleQuickSend,
  onOpenDetailCard,
  handleCardClick,
  setSharingCard,
  handleDragStart
}: any) {
  return (
    <>
      <LibraryCardThumbnail
        card={card}
        cardCategory={cardCategory}
        onPinClick={isEasyMode ? undefined : (e: any) => togglePin(card, e)}
        onQuickSendClick={isEasyMode ? undefined : handleQuickSend}
        onEditClick={onOpenDetailCard}
        onInjectClick={handleCardClick}
        onShareClick={setSharingCard}
        onDragStart={handleDragStart}
      />
      <CardFooter
        name={card.name}
        borderClass={config.borderClass}
        bgClass={config.bgClass}
      />
    </>
  )
}

export function LibraryCardItem(props: LibraryCardItemProps) {
  const { card, categories, isDragged, isDragOver, cardSlotThemeClass } = props
  const config = RARITY_CONFIG[card.tier]
  const cardCategory = categories.find((c) => c.id === card.category)

  const handleDragStart = (e: React.DragEvent) => {
    setupDragStart(e, card)
    props.onDragStartGlobal?.(e, card.id)
  }

  const handleQuickSend = props.onQuickSend
    ? (e: React.MouseEvent) => {
        e.stopPropagation()
        props.onQuickSend?.(card, e)
      }
    : undefined

  const handleClick = (e: React.MouseEvent) => {
    handleCardClickHelper(
      e,
      card,
      props.isEasyMode,
      props.togglePin,
      props.advanceIfStep,
      props.onOpenSimpleWorkbench
    )
  }

  return (
    <div
      data-tutorial={props.idx === 0 ? "library-card" : undefined}
      {...getDragAndDropProps(props, handleDragStart)}
      onClick={handleClick}
      className={getLibraryCardItemClassName(
        isDragged,
        isDragOver,
        cardSlotThemeClass,
        config
      )}>
      <LibraryCardItemInner
        card={card}
        cardCategory={cardCategory}
        config={config}
        isEasyMode={props.isEasyMode}
        togglePin={props.togglePin}
        handleQuickSend={handleQuickSend}
        onOpenDetailCard={props.onOpenDetailCard}
        handleCardClick={props.handleCardClick}
        setSharingCard={props.setSharingCard}
        handleDragStart={handleDragStart}
      />
    </div>
  )
}
