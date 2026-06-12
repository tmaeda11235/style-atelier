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
    return (
      <CardSelectionView
        t={manager.t}
        libraryCards={manager.libraryCards}
        iconCardId={manager.iconCardId}
        handleSelectCard={manager.handleSelectCard}
      />
    )
  }
  if (activeTab === "create") {
    return (
      <CategoryForm
        t={manager.t}
        name={manager.name}
        setName={manager.setName}
        parentId={manager.parentId}
        setParentId={manager.setParentId}
        emoji={manager.emoji}
        handleEmojiChange={manager.handleEmojiChange}
        iconUrl={manager.iconUrl}
        setIsSelectingCard={manager.setIsSelectingCard}
        parentOptions={parentOptions}
        editingCategory={manager.editingCategory}
        handleCancelEdit={manager.handleCancelEdit}
        handleClearImage={manager.handleClearImage}
        handleSave={manager.handleSave}
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
