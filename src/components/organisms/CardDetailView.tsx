import { useLiveQuery } from "dexie-react-hooks"
import { AlertCircle, Download, Save, Send, Trash2, X } from "lucide-react"
import React, { useState } from "react"
import iconUrl from "url:../../../assets/icon.png"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useCardDetailsForm } from "../../hooks/useCardDetailsForm"
import { useCardExporter } from "../../hooks/useCardExporter"
import { useHand } from "../../hooks/useHand"
import { db } from "../../lib/db"
import type { PromptSegment, StyleCard } from "../../lib/db-schema"
import { buildPromptString } from "../../lib/prompt-utils"
import { Button } from "../atoms/Button"
import { HelpTooltip } from "../atoms/HelpTooltip"
import { Input } from "../atoms/Input"
import { AssociatedImageGallery } from "../molecules/AssociatedImageGallery"
import type { AlertType } from "../molecules/ConnectionAlert"
import { DeleteConfirmModal } from "../molecules/DeleteConfirmModal"
import { GenealogySection } from "../molecules/GenealogySection"
import { PromptBubble } from "../molecules/PromptBubble"
import { RaritySelector } from "../molecules/RaritySelector"
import { TagEditor } from "../molecules/TagEditor"
import { ParameterEditor } from "./ParameterEditor"
import { PromptBubbleEditor } from "./PromptBubbleEditor"

/**
 * Props for the CardDetailView component.
 */
interface CardDetailViewProps {
  /** The StyleCard object being viewed or edited */
  card: StyleCard
  /** Callback to close the detail panel */
  onClose: () => void
  /** Callback to inject the built prompt into the target application page */
  onInject: (prompt: string) => Promise<void>
  /** Callback to save the updated StyleCard object to storage */
  onSave: (updatedCard: StyleCard) => Promise<void>
  /** Callback to update the alert state */
  setAlertType: (type: AlertType) => void
  /** Callback when a parent card is clicked */
  onCardSelect?: (cardId: string) => void
  /** Callback to delete the StyleCard */
  onDelete?: (cardId: string) => Promise<void>
}

/**
 * CardDetailView component renders the full inspection and modification panel
 * for a specific StyleCard. It enables users to rename cards, edit prompt recipes/bubbles,
 * set parameter options, manage tags, select thumbnail images, and export the card.
 */
export function CardDetailView({
  card,
  onClose,
  onInject,
  onSave,
  setAlertType,
  onCardSelect,
  onDelete
}: CardDetailViewProps) {
  const { pinnedCards } = useHand()
  const hasPinnedCards = pinnedCards.length > 0
  const { expertFeatures } = useSettings()
  const { t } = useLanguage()

  const categoriesList = useLiveQuery(() => db.getAllCategories()) || []

  const {
    name,
    setName,
    tier,
    setTier,
    promptSegments,
    setPromptSegments,
    parameters,
    setParameters,
    isSrefHidden,
    setIsSrefHidden,
    isPHidden,
    setIsPHidden,
    category,
    setCategory,
    tags,
    setTags,
    selectedThumbs,
    parents,
    images,
    handleToggleThumbnail,
    handleSaveChanges
  } = useCardDetailsForm(card, onSave)

  const { isExporting, errorMessage, handleExportCard } = useCardExporter(
    card,
    name,
    tier,
    promptSegments,
    parameters,
    tags,
    images,
    selectedThumbs,
    category || undefined
  )

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const hasParams = Object.values(parameters).some((v) =>
    Array.isArray(v) ? v.length > 0 : !!v
  )

  const handleTryOnMidjourney = async () => {
    const maskedKeys: (keyof StyleCard["parameters"])[] = []
    if (isSrefHidden) maskedKeys.push("sref")
    if (isPHidden) maskedKeys.push("p")

    const fullPrompt = buildPromptString(promptSegments, parameters, maskedKeys)
    await onInject(fullPrompt)
  }

  return (
    <div
      data-testid="card-detail-view-container"
      className={`absolute inset-0 bg-slate-50 z-20 flex flex-col ${hasPinnedCards ? "pb-[110px]" : ""}`}>
      {/* Header */}
      <div className="p-4 bg-white shadow-sm flex items-center justify-between border-b">
        <h2 className="text-lg font-bold text-slate-800">
          {t.cardDetail.title}
        </h2>
        <Button
          variant="ghost"
          size="xs"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {errorMessage && (
          <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[11px] flex items-start gap-1.5 shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
        {/* Card Metadata Section */}
        <div className="p-4 bg-white border rounded-lg shadow-sm space-y-4">
          <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
            {t.cardDetail.identity}
            {expertFeatures.cardEditing && (
              <HelpTooltip
                content={t.helpTooltips.cardEditing}
                position="bottom-left"
              />
            )}
          </h3>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {t.cardDetail.cardName}
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.cardDetail.cardNamePlaceholder}
              className="font-bold text-slate-800 text-sm"
              disabled={!expertFeatures.cardEditing}
            />
          </div>

          {/* Category Selector */}
          {expertFeatures.categories && (
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1">
                {t.cardDetail.category}
                <HelpTooltip
                  content={t.helpTooltips.categories}
                  position="top-left"
                />
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm border rounded bg-white p-2"
                disabled={!expertFeatures.cardEditing}>
                <option value="">{t.cardDetail.noCategory}</option>
                {categoriesList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.iconEmoji || "🖼️"} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Color Palette Display */}
          {(card.dominantColor || card.accentColor) && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">
                {t.cardDetail.detectedPalette}
              </label>
              <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {card.dominantColor && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border border-slate-300 shadow-sm"
                      style={{ backgroundColor: card.dominantColor }}
                      title="Dominant Color"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      {t.cardDetail.dominant} ({card.dominantColor})
                    </span>
                  </div>
                )}
                {card.accentColor && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border border-slate-300 shadow-sm"
                      style={{ backgroundColor: card.accentColor }}
                      title="Accent Color"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      {t.cardDetail.accent} ({card.accentColor})
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags Editor */}
          {expertFeatures.tags && (
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1.5">
                {t.cardDetail.tags}
                <HelpTooltip
                  content={t.helpTooltips.tags}
                  position="top-left"
                />
              </label>
              {expertFeatures.cardEditing ? (
                <TagEditor tags={tags} onChange={setTags} />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                      {t}
                    </span>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-xs text-slate-400 italic">
                      {t.cardDetail.noTags}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Genealogy (Ancestry) Section */}
        <GenealogySection
          card={card}
          parents={parents}
          onCardSelect={onCardSelect}
        />

        {/* Gallery & Thumbnail Selector Section */}
        {expertFeatures.multiImage && (
          <div className="p-4 bg-white border rounded-lg shadow-sm">
            <AssociatedImageGallery
              images={images}
              selectedThumbs={selectedThumbs}
              onToggleThumbnail={handleToggleThumbnail}
            />
          </div>
        )}

        {/* Prompt segments bubble editor */}
        <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t.cardDetail.promptRecipe}
          </h3>
          {expertFeatures.cardEditing ? (
            <PromptBubbleEditor
              initialSegments={promptSegments}
              onChange={setPromptSegments}
              tier={tier}
            />
          ) : (
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg min-h-[50px] items-start content-start">
              {promptSegments.map((segment, index) => (
                <PromptBubble
                  key={index}
                  segment={segment}
                  tier={segment.type === "text" ? undefined : tier}
                />
              ))}
            </div>
          )}
        </div>

        {/* Parameters editor */}
        <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t.cardDetail.parameters}
          </h3>
          {expertFeatures.cardEditing ? (
            <ParameterEditor parameters={parameters} onChange={setParameters} />
          ) : (
            <div className="space-y-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-xs">
              {parameters.ar && (
                <div>
                  <span className="font-bold text-slate-500">
                    {t.cardDetail.aspectRatio}
                  </span>{" "}
                  {parameters.ar}
                </div>
              )}
              {parameters.p && parameters.p.length > 0 && (
                <div>
                  <span className="font-bold text-slate-500">
                    {t.cardDetail.personalization}
                  </span>{" "}
                  {parameters.p.join(", ")}
                </div>
              )}
              {parameters.imagePrompts &&
                parameters.imagePrompts.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-500">
                      {t.cardDetail.imagePrompts}
                    </span>{" "}
                    {parameters.imagePrompts.join(", ")}
                  </div>
                )}
              {parameters.sref && parameters.sref.length > 0 && (
                <div>
                  <span className="font-bold text-slate-500">
                    {t.cardDetail.styleReference}
                  </span>{" "}
                  {parameters.sref.join(", ")}
                </div>
              )}
              {parameters.cref && parameters.cref.length > 0 && (
                <div>
                  <span className="font-bold text-slate-500">
                    {t.cardDetail.characterReference}
                  </span>{" "}
                  {parameters.cref.join(", ")}
                </div>
              )}
              {!hasParams && (
                <div className="text-slate-400 italic">
                  {t.cardDetail.noParameters}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sealing options */}
        <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t.cardDetail.sealingOptions}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="detail-hide-sref"
                checked={isSrefHidden}
                onChange={(e) => setIsSrefHidden(e.target.checked)}
                disabled={!expertFeatures.cardEditing}
              />
              <label
                htmlFor="detail-hide-sref"
                className="text-xs text-slate-600">
                {t.cardDetail.hideSref}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="detail-hide-p"
                checked={isPHidden}
                onChange={(e) => setIsPHidden(e.target.checked)}
                disabled={!expertFeatures.cardEditing}
              />
              <label htmlFor="detail-hide-p" className="text-xs text-slate-600">
                {t.cardDetail.hideP}
              </label>
            </div>
          </div>
        </div>

        {/* Rarity selector */}
        {expertFeatures.rarity && (
          <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
            <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              {t.cardDetail.rarityFrame}
              <HelpTooltip
                content={t.helpTooltips.rarity}
                position="top-left"
              />
            </h3>
            <RaritySelector selected={tier} onSelect={setTier} />
          </div>
        )}
      </div>

      <div className="p-4 bg-white shadow-t-sm flex flex-col gap-2 border-t z-10">
        {/* Row 1: Secondary Actions (Delete, Cancel, Export) */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex gap-1.5">
            {onDelete && (
              <Button
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1"
                data-testid="delete-card-button">
                <Trash2 className="w-3.5 h-3.5" />
                {t.cardDetail.delete}
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} className="px-2">
              {t.cardDetail.cancel}
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={handleExportCard}
            disabled={isExporting}
            className="flex items-center gap-1 border-slate-300 hover:bg-slate-50 text-slate-700 px-2.5"
            data-testid="export-card-button">
            <Download className="w-3.5 h-3.5" />
            {isExporting ? t.cardDetail.exporting : t.cardDetail.export}
          </Button>
        </div>

        {/* Row 2: Primary Actions (Inject, Save) */}
        <div className="flex gap-2 mt-1">
          <Button
            variant="secondary"
            onClick={handleTryOnMidjourney}
            className="flex-1 flex items-center justify-center gap-1.5 py-2">
            <Send className="w-4 h-4" />
            {t.cardDetail.inject}
          </Button>
          {expertFeatures.cardEditing && (
            <Button
              onClick={handleSaveChanges}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 py-2">
              <Save className="w-4 h-4" />
              {t.cardDetail.save}
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        cardName={name}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          if (onDelete) {
            await onDelete(card.id)
          }
          setShowDeleteConfirm(false)
        }}
      />
    </div>
  )
}
