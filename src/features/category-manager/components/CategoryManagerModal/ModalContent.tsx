import React from "react"

import { CardSelectionView } from "./CardSelectionView"
import { CategoryForm } from "./CategoryForm"
import { CategoryList } from "./CategoryList"

interface ModalContentProps {
  manager: any
  activeTab: string
  parentOptions: any[]
  onClose: () => void
  systemCategoryIds: string[]
}

export function ModalContent({
  manager,
  activeTab,
  parentOptions,
  onClose,
  systemCategoryIds
}: ModalContentProps) {
  if (manager.isSelectingCard) {
    const iconCardId =
      manager.selectionType === "cover" ? "" : manager.iconCardId
    return (
      <CardSelectionView
        t={manager.t}
        libraryCards={manager.libraryCards}
        iconCardId={iconCardId}
        handleSelectCard={manager.handleSelectCard}
      />
    )
  }
  if (activeTab === "create") {
    return (
      <CategoryForm
        {...manager}
        parentOptions={parentOptions}
        onClose={onClose}
      />
    )
  }
  return (
    <CategoryList
      t={manager.t}
      categories={manager.categories}
      systemCategoryIds={systemCategoryIds}
      handleStartEdit={manager.handleStartEdit}
      handleDelete={manager.handleDelete}
    />
  )
}
