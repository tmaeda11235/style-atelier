import React from "react"

import { useCategoryManager } from "~hooks/useCategoryManager"

import { CategoryModalHeader } from "./CategoryManagerModal/CategoryModalHeader"
import { ModalContent } from "./CategoryManagerModal/ModalContent"

interface CategoryManagerModalProps {
  onClose: () => void
  addLog: (msg: string) => void
}

const SYSTEM_CATEGORY_IDS = [
  "style",
  "character",
  "landscape",
  "lighting",
  "camera",
  "abstract",
  "other"
]

function getDescendants(catId: string, allCats: any[]): string[] {
  const children = allCats.filter((c) => c.parentId === catId)
  const childIds = children.map((c) => c.id)
  return [...childIds, ...childIds.flatMap((id) => getDescendants(id, allCats))]
}

function ModalContainer({
  onClose,
  manager,
  parentOptions,
  handleCloseIcon
}: any) {
  return (
    <div className="absolute inset-0 bg-black/20 dark:bg-slate-900/60 backdrop-blur-sm z-[100] flex flex-col justify-end">
      <div className="bg-white rounded-t-xl max-h-[85%] flex flex-col shadow-2xl transition-all duration-300 transform translate-y-0">
        <CategoryModalHeader
          t={manager.t}
          isSelectingCard={manager.isSelectingCard}
          activeTab={manager.activeTab}
          setActiveTab={manager.setActiveTab}
          editingCategory={manager.editingCategory}
          handleCancelEdit={manager.handleCancelEdit}
          handleCloseIcon={handleCloseIcon}
        />

        <div className="flex-1 overflow-y-auto p-4">
          <ModalContent
            manager={manager}
            activeTab={manager.activeTab}
            parentOptions={parentOptions}
            onClose={onClose}
            systemCategoryIds={SYSTEM_CATEGORY_IDS}
          />
        </div>
      </div>
    </div>
  )
}

export function CategoryManagerModal({
  onClose,
  addLog
}: CategoryManagerModalProps) {
  const manager = useCategoryManager({ onClose, addLog })

  const excludedIds = manager.editingCategory
    ? [
        manager.editingCategory.id,
        ...getDescendants(manager.editingCategory.id, manager.categories)
      ]
    : []

  const parentOptions = manager.categories.filter(
    (c) => !excludedIds.includes(c.id)
  )

  const handleCloseIcon = manager.isSelectingCard
    ? () => manager.setIsSelectingCard(false)
    : onClose

  return (
    <ModalContainer
      onClose={onClose}
      manager={manager}
      parentOptions={parentOptions}
      handleCloseIcon={handleCloseIcon}
    />
  )
}
