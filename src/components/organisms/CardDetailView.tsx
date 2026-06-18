import React, { useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useCategories } from "../../hooks/useCategories"
import { useHand } from "../../hooks/useHand"
import type { StyleCard } from "../../shared/lib/db-schema"
import { AssociatedImageGallery } from "../molecules/AssociatedImageGallery"
import type { AlertType } from "../molecules/ConnectionAlert"
import { DeleteConfirmModal } from "../molecules/DeleteConfirmModal"
import { ExportSuccessModal } from "../molecules/ExportSuccessModal"
import { GenealogySection } from "../molecules/GenealogySection"
import { ActionButtons } from "./CardDetailView/ActionButtons"
import { IdentitySection } from "./CardDetailView/IdentitySection"
import { ParametersSection } from "./CardDetailView/ParametersSection"
import {
  AlertsSection,
  HeaderSection,
  PromptRecipeSection,
  RaritySection,
  SealingOptionsSection
} from "./CardDetailView/SubSections"
import { useCardDetailView } from "./CardDetailView/useCardDetailView"
import { VersionHistorySection } from "./CardDetailView/VersionHistorySection"

interface CardDetailViewProps {
  card: StyleCard
  onClose: () => void
  onInject: (prompt: string) => Promise<void>
  onSave: (updatedCard: StyleCard) => Promise<void>
  setAlertType: (type: AlertType) => void
  onCardSelect?: (cardId: string) => void
  onDelete?: (cardId: string) => Promise<void>
  onSendToWorkbench?: (card: StyleCard) => Promise<void>
}

function AdvancedOptionsBlock({ t, expertFeatures, logic, card }: any) {
  return (
    <>
      <SealingOptionsSection
        t={t}
        expertFeatures={expertFeatures}
        isSrefHidden={logic.form.isSrefHidden}
        setIsSrefHidden={logic.form.setIsSrefHidden}
        isPHidden={logic.form.isPHidden}
        setIsPHidden={logic.form.setIsPHidden}
      />
      <RaritySection
        t={t}
        expertFeatures={expertFeatures}
        tier={logic.form.tier}
        setTier={logic.form.setTier}
      />
      <VersionHistorySection
        t={t}
        expertFeatures={expertFeatures}
        versionHistory={card.versionHistory}
        triggerRollback={logic.triggerRollback}
      />
    </>
  )
}

function IdentityBlock({
  t,
  expertFeatures,
  logic,
  categoriesList,
  card,
  onCardSelect
}: any) {
  return (
    <>
      <IdentitySection
        t={t}
        expertFeatures={expertFeatures}
        name={logic.form.name}
        setName={logic.form.setName}
        category={logic.form.category}
        setCategory={logic.form.setCategory}
        categoriesList={categoriesList}
        dominantColor={card.dominantColor}
        accentColor={card.accentColor}
        tags={logic.form.tags}
        setTags={logic.form.setTags}
      />
      <GenealogySection
        card={card}
        parents={logic.form.parents}
        onCardSelect={onCardSelect}
      />
    </>
  )
}

function ImageGalleryBlock({
  expertFeatures,
  images,
  selectedThumbs,
  handleToggleThumbnail
}: any) {
  if (!expertFeatures.multiImage) return null
  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <AssociatedImageGallery
        images={images}
        selectedThumbs={selectedThumbs}
        onToggleThumbnail={handleToggleThumbnail}
      />
    </div>
  )
}

function DeleteModalBlock({ isOpen, cardName, onClose, onConfirm }: any) {
  return (
    <DeleteConfirmModal
      isOpen={isOpen}
      cardName={cardName}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}

function DetailsScrollContentBlock1({
  t,
  logic,
  expertFeatures,
  categoriesList,
  card,
  onCardSelect
}: any) {
  return (
    <>
      <AlertsSection
        t={t}
        showRollbackNotice={logic.showRollbackNotice}
        setShowRollbackNotice={logic.setShowRollbackNotice}
        errorMessage={logic.exporter.errorMessage}
      />
      <IdentityBlock
        t={t}
        expertFeatures={expertFeatures}
        logic={logic}
        categoriesList={categoriesList}
        card={card}
        onCardSelect={onCardSelect}
      />
      <ImageGalleryBlock
        expertFeatures={expertFeatures}
        images={logic.form.images}
        selectedThumbs={logic.form.selectedThumbs}
        handleToggleThumbnail={logic.form.handleToggleThumbnail}
      />
    </>
  )
}

function DetailsScrollContentBlock2({ t, expertFeatures, logic, card }: any) {
  return (
    <>
      <PromptRecipeSection
        t={t}
        expertFeatures={expertFeatures}
        promptSegments={logic.form.promptSegments}
        setPromptSegments={logic.form.setPromptSegments}
        tier={logic.form.tier}
      />
      <ParametersSection
        t={t}
        expertFeatures={expertFeatures}
        parameters={logic.form.parameters}
        setParameters={logic.form.setParameters}
      />
      <AdvancedOptionsBlock
        t={t}
        expertFeatures={expertFeatures}
        logic={logic}
        card={card}
      />
    </>
  )
}

function DetailsScrollContent({
  card,
  logic,
  t,
  expertFeatures,
  categoriesList,
  onCardSelect
}: any) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <DetailsScrollContentBlock1
        t={t}
        logic={logic}
        expertFeatures={expertFeatures}
        categoriesList={categoriesList}
        card={card}
        onCardSelect={onCardSelect}
      />
      <DetailsScrollContentBlock2
        t={t}
        expertFeatures={expertFeatures}
        logic={logic}
        card={card}
      />
    </div>
  )
}

/* eslint-disable-next-line max-lines-per-function */
function CardDetailViewLayout({
  props,
  logic,
  t,
  expertFeatures,
  categoriesList,
  pinnedCards,
  showDeleteConfirm,
  setShowDeleteConfirm
}: any) {
  const hasPinned = pinnedCards.length > 0
  const handleDeleteConfirm = async () => {
    if (props.onDelete) await props.onDelete(props.card.id)
    setShowDeleteConfirm(false)
  }

  return (
    <div
      data-testid="card-detail-view-container"
      className={`absolute inset-0 bg-slate-50 z-20 flex flex-col ${hasPinned ? "pb-[110px]" : ""}`}>
      <HeaderSection t={t} onClose={props.onClose} />
      <DetailsScrollContent
        card={props.card}
        logic={logic}
        t={t}
        expertFeatures={expertFeatures}
        categoriesList={categoriesList}
        onCardSelect={props.onCardSelect}
      />
      <ActionButtons
        t={t}
        expertFeatures={expertFeatures}
        card={props.card}
        onDelete={props.onDelete}
        onClose={props.onClose}
        handleExportCard={logic.exporter.handleExportCard}
        isExporting={logic.exporter.isExporting}
        onSendToWorkbench={props.onSendToWorkbench}
        handleTryOnMidjourney={logic.handleTryOnMidjourney}
        onSaveClick={logic.onSaveClick}
        setShowDeleteConfirm={setShowDeleteConfirm}
      />
      <DeleteModalBlock
        isOpen={showDeleteConfirm}
        cardName={logic.form.name}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
      />
      <ExportSuccessModal
        isOpen={logic.exporter.showSuccessModal}
        onClose={() => logic.exporter.setShowSuccessModal(false)}
        exportedFile={logic.exporter.exportedFile}
      />
    </div>
  )
}

export function CardDetailView(props: CardDetailViewProps) {
  const { pinnedCards } = useHand()
  const { expertFeatures } = useSettings()
  const { t } = useLanguage()
  const categoriesList = useCategories()
  const logic = useCardDetailView({
    card: props.card,
    onSave: props.onSave,
    onInject: props.onInject
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <CardDetailViewLayout
      props={props}
      logic={logic}
      t={t}
      expertFeatures={expertFeatures}
      categoriesList={categoriesList}
      pinnedCards={pinnedCards}
      showDeleteConfirm={showDeleteConfirm}
      setShowDeleteConfirm={setShowDeleteConfirm}
    />
  )
}
