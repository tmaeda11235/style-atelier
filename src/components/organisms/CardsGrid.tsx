import React from "react"

import type { StyleCard } from "../../lib/db-schema"
import { LibraryCardItem } from "../molecules/LibraryCardItem"

interface CardsGridProps {
  styleCards: StyleCard[]
  isEasyMode: boolean
  onOpenSimpleWorkbench?: (card: StyleCard) => void
  togglePin: any
  advanceIfStep: any
  onOpenDetailCard: (card: StyleCard) => void
  handleCardClick: any
  setSharingCard: (card: StyleCard) => void
  categories: any[]
  handleQuickSend: (card: StyleCard, e: React.MouseEvent) => void
  moveCardToCategory: any
  onCardReorder?: (draggedId: string, targetId: string) => void
  hasMore: boolean
  loadMore: () => void
  t: any
  cardSlotThemeClass?: string
}

function useCardsDragAndDrop(
  onCardReorder?: (draggedId: string, targetId: string) => void
) {
  const [draggedCardId, setDraggedCardId] = React.useState<string | null>(null)
  const [dragOverCardId, setDragOverCardId] = React.useState<string | null>(
    null
  )

  const handleDragStartGlobal = (e: React.DragEvent, cardId: string) => {
    setDraggedCardId(cardId)
    e.dataTransfer.setData("cardId", cardId)
  }

  const handleDragOverGlobal = (e: React.DragEvent, cardId: string) => {
    e.preventDefault()
    if (draggedCardId && draggedCardId !== cardId) {
      setDragOverCardId(cardId)
    }
  }

  const handleDragLeaveGlobal = (e: React.DragEvent, cardId: string) => {
    if (dragOverCardId === cardId) {
      setDragOverCardId(null)
    }
  }

  const handleDropGlobal = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData("cardId") || draggedCardId
    if (draggedId && draggedId !== targetCardId) {
      onCardReorder?.(draggedId, targetCardId)
    }
    setDraggedCardId(null)
    setDragOverCardId(null)
  }

  const handleDragEndGlobal = () => {
    setDraggedCardId(null)
    setDragOverCardId(null)
  }

  return {
    draggedCardId,
    dragOverCardId,
    handleDragStartGlobal,
    handleDragOverGlobal,
    handleDragLeaveGlobal,
    handleDropGlobal,
    handleDragEndGlobal
  }
}

function buildDragAndDropPropsForCard(cardId: string, dnd: any) {
  return {
    onDragStartGlobal: dnd.handleDragStartGlobal,
    onDragOverGlobal: dnd.handleDragOverGlobal,
    onDragLeaveGlobal: dnd.handleDragLeaveGlobal,
    onDropGlobal: dnd.handleDropGlobal,
    onDragEndGlobal: dnd.handleDragEndGlobal,
    isDragged: dnd.draggedCardId === cardId,
    isDragOver: dnd.dragOverCardId === cardId
  }
}

export function CardsGrid(props: CardsGridProps) {
  const dnd = useCardsDragAndDrop(props.onCardReorder)

  return (
    <div className="flex flex-col gap-4">
      <div
        data-tutorial="library-card-grid"
        className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3">
        {props.styleCards.map((card, idx) => (
          <LibraryCardItem
            key={card.id}
            card={card}
            idx={idx}
            isEasyMode={props.isEasyMode}
            onOpenSimpleWorkbench={props.onOpenSimpleWorkbench}
            togglePin={props.togglePin}
            advanceIfStep={props.advanceIfStep}
            onOpenDetailCard={props.onOpenDetailCard}
            handleCardClick={props.handleCardClick}
            setSharingCard={props.setSharingCard}
            categories={props.categories}
            onQuickSend={props.handleQuickSend}
            moveCardToCategory={props.moveCardToCategory}
            cardSlotThemeClass={props.cardSlotThemeClass}
            {...buildDragAndDropPropsForCard(card.id, dnd)}
          />
        ))}
      </div>
      {props.hasMore && (
        <div className="flex justify-center pt-2">
          <button
            id="library-load-more-btn"
            data-testid="show-more-button"
            onClick={props.loadMore}
            className="px-6 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer">
            {props.t.loadMore || "さらに読み込む"}
          </button>
        </div>
      )}
    </div>
  )
}
