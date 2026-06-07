import { useLiveQuery } from "dexie-react-hooks"
import { AlertCircle, Download, Save, Send, Trash2, X } from "lucide-react"
import React, { useEffect, useState } from "react"
import iconUrl from "url:../../../assets/icon.png"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useHand } from "../../hooks/useHand"
import { db } from "../../lib/db"
import type { PromptSegment, StyleCard } from "../../lib/db-schema"
import { exportCardAsImage } from "../../lib/export-utils"
import { createThumbnailDataUrl } from "../../lib/image-utils"
import { buildPromptString } from "../../lib/prompt-utils"
import { Button } from "../atoms/Button"
import { HelpTooltip } from "../atoms/HelpTooltip"
import { Input } from "../atoms/Input"
import { AssociatedImageGallery } from "../molecules/AssociatedImageGallery"
import type { AlertType } from "../molecules/ConnectionAlert"
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

  const [name, setName] = useState(card.name)
  const [tier, setTier] = useState(card.tier)
  const [promptSegments, setPromptSegments] = useState<PromptSegment[]>(
    card.promptSegments || []
  )
  const [parameters, setParameters] = useState<StyleCard["parameters"]>(
    card.parameters || {}
  )
  const [isSrefHidden, setIsSrefHidden] = useState(
    card.masking?.isSrefHidden || false
  )
  const [isPHidden, setIsPHidden] = useState(card.masking?.isPHidden || false)
  const [category, setCategory] = useState(card.category || "")

  // Tags editing state
  const [tags, setTags] = useState<string[]>(card.tags || [])

  // Image and Thumbnail Selection state
  const images =
    card.images && card.images.length > 0
      ? card.images
      : [card.thumbnailData].filter(Boolean)
  const [selectedThumbs, setSelectedThumbs] = useState<string[]>(
    card.selectedThumbnails || (card.thumbnailData ? [card.thumbnailData] : [])
  )
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [parents, setParents] = useState<(StyleCard | null)[]>([])
  const hasParams = Object.values(parameters).some((v) =>
    Array.isArray(v) ? v.length > 0 : !!v
  )

  useEffect(() => {
    const fetchParents = async () => {
      if (card.genealogy?.parentIds && card.genealogy.parentIds.length > 0) {
        try {
          const fetched = await Promise.all(
            card.genealogy.parentIds.map(async (id) => {
              const parent = await db.getCard(id)
              return parent || null
            })
          )
          setParents(fetched)
        } catch (err) {
          console.error("Failed to fetch parent cards:", err)
          setParents(card.genealogy.parentIds.map(() => null))
        }
      } else {
        setParents([])
      }
    }

    fetchParents()
  }, [card])

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleExportCard = async () => {
    setIsExporting(true)
    setErrorMessage(null)
    try {
      const primaryThumb = selectedThumbs[0] || images[0] || "assets/icon.png"
      const tempCard: StyleCard = {
        ...card,
        name,
        tier,
        promptSegments,
        parameters,
        tags,
        images,
        selectedThumbnails: selectedThumbs,
        thumbnailData: primaryThumb,
        category: category || undefined,
        dominantColor: card.dominantColor,
        accentColor: card.accentColor
      }
      await exportCardAsImage(tempCard)
    } catch (err: any) {
      console.error("Failed to export card:", err)
      setErrorMessage(`Failed to export card: ${err.message || err}`)
    } finally {
      setIsExporting(false)
    }
  }

  // Sync state if card changes
  useEffect(() => {
    setName(card.name)
    setTier(card.tier)
    setPromptSegments(card.promptSegments || [])
    setParameters(card.parameters || {})
    setIsSrefHidden(card.masking?.isSrefHidden || false)
    setIsPHidden(card.masking?.isPHidden || false)
    setCategory(card.category || "")
    setTags(card.tags || [])
    setSelectedThumbs(
      card.selectedThumbnails ||
        (card.thumbnailData ? [card.thumbnailData] : [])
    )
  }, [card])

  const handleToggleThumbnail = (imgUrl: string) => {
    if (selectedThumbs.includes(imgUrl)) {
      // Remove it
      setSelectedThumbs(selectedThumbs.filter((url) => url !== imgUrl))
    } else {
      // Add it. If already 4 selected, shift the queue
      if (selectedThumbs.length < 4) {
        setSelectedThumbs([...selectedThumbs, imgUrl])
      } else {
        setSelectedThumbs([...selectedThumbs.slice(1), imgUrl])
      }
    }
  }

  const handleSaveChanges = async () => {
    // Fallback thumbnail data for older fields compatibility
    const primaryThumb = selectedThumbs[0] || images[0] || "assets/icon.png"

    let thumbnailData = primaryThumb
    try {
      thumbnailData = await createThumbnailDataUrl(primaryThumb)
    } catch (err) {
      console.error("Failed to convert thumbnail to Base64:", err)
    }

    const updatedCard: StyleCard = {
      ...card,
      name,
      tier,
      promptSegments,
      parameters,
      tags,
      images,
      selectedThumbnails: selectedThumbs,
      thumbnailData,
      category: category || undefined,
      masking: {
        isSrefHidden,
        isPHidden
      },
      updatedAt: Date.now()
    }

    try {
      await onSave(updatedCard)
    } catch (err) {
      console.error("Failed to save style card updates:", err)
    }
  }

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
        <h2 className="text-lg font-bold text-slate-800">Card Details</h2>
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
            Identity
            {expertFeatures.cardEditing && (
              <HelpTooltip
                content={t.helpTooltips.cardEditing}
                position="top"
              />
            )}
          </h3>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Card Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Card Name"
              className="font-bold text-slate-800 text-sm"
              disabled={!expertFeatures.cardEditing}
            />
          </div>

          {/* Category Selector */}
          {expertFeatures.categories && (
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1">
                Category
                <HelpTooltip
                  content={t.helpTooltips.categories}
                  position="top"
                />
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm border rounded bg-white p-2"
                disabled={!expertFeatures.cardEditing}>
                <option value="">No Category</option>
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
                Detected Palette
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
                      Dominant ({card.dominantColor})
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
                      Accent ({card.accentColor})
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
                Tags
                <HelpTooltip content={t.helpTooltips.tags} position="top" />
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
                      No tags.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Genealogy (Ancestry) Section */}
        <div className="p-4 bg-white border rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Ancestry & Evolution
          </h3>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Generation
            </span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-bold border border-blue-100">
              Gen {card.genealogy?.generation || 1}
            </span>
          </div>

          {/* Mutation Note */}
          {card.genealogy?.mutationNote && (
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1">
                Mutation Note
              </span>
              <div className="text-xs bg-slate-50 text-slate-600 p-2.5 rounded border border-slate-100 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {card.genealogy.mutationNote}
              </div>
            </div>
          )}

          {/* Parent Cards */}
          {card.genealogy?.parentIds && card.genealogy.parentIds.length > 0 && (
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-2">
                Parent Cards
              </span>
              <div className="grid grid-cols-2 gap-2">
                {parents.map((parent, idx) => {
                  const parentId = card.genealogy.parentIds[idx]
                  if (!parent) {
                    return (
                      <div
                        key={parentId || idx}
                        className="flex items-center gap-2 p-2 bg-slate-50 border rounded-lg text-slate-400 select-none opacity-60"
                        title="This parent card has been deleted">
                        <div className="w-8 h-8 rounded bg-slate-200 border flex items-center justify-center text-xs">
                          🗑️
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">
                            Deleted Card
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            ID: {parentId.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <button
                      key={parent.id}
                      onClick={() => onCardSelect && onCardSelect(parent.id)}
                      className="flex items-center gap-2 p-2 bg-white hover:bg-slate-50 border hover:border-slate-300 rounded-lg text-left transition-all group w-full">
                      {parent.thumbnailData ? (
                        <img
                          src={parent.thumbnailData}
                          alt={parent.name}
                          className="w-8 h-8 rounded object-cover border border-slate-100 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-slate-100 border flex items-center justify-center text-xs">
                          🎨
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                          {parent.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          Gen {parent.genealogy?.generation || 1}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

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
            Prompt Recipe
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
            Parameters
          </h3>
          {expertFeatures.cardEditing ? (
            <ParameterEditor parameters={parameters} onChange={setParameters} />
          ) : (
            <div className="space-y-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-xs">
              {parameters.ar && (
                <div>
                  <span className="font-bold text-slate-500">
                    Aspect Ratio:
                  </span>{" "}
                  {parameters.ar}
                </div>
              )}
              {parameters.p && parameters.p.length > 0 && (
                <div>
                  <span className="font-bold text-slate-500">
                    Personalization (--p):
                  </span>{" "}
                  {parameters.p.join(", ")}
                </div>
              )}
              {parameters.imagePrompts &&
                parameters.imagePrompts.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-500">
                      Image Prompts:
                    </span>{" "}
                    {parameters.imagePrompts.join(", ")}
                  </div>
                )}
              {parameters.sref && parameters.sref.length > 0 && (
                <div>
                  <span className="font-bold text-slate-500">
                    Style Reference (--sref):
                  </span>{" "}
                  {parameters.sref.join(", ")}
                </div>
              )}
              {parameters.cref && parameters.cref.length > 0 && (
                <div>
                  <span className="font-bold text-slate-500">
                    Character Reference (--cref):
                  </span>{" "}
                  {parameters.cref.join(", ")}
                </div>
              )}
              {!hasParams && (
                <div className="text-slate-400 italic">
                  No parameters defined.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sealing options */}
        <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Sealing Options
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
                Hide --sref when sharing
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
                Hide --p when sharing
              </label>
            </div>
          </div>
        </div>

        {/* Rarity selector */}
        {expertFeatures.rarity && (
          <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
            <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              Rarity & Frame
              <HelpTooltip content={t.helpTooltips.rarity} position="top" />
            </h3>
            <RaritySelector selected={tier} onSelect={setTier} />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-white shadow-t-sm flex justify-between gap-2 border-t z-10">
        <div className="flex gap-2">
          {onDelete && (
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5"
              data-testid="delete-card-button">
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCard}
            disabled={isExporting}
            className="flex items-center gap-1.5 border-slate-300 hover:bg-slate-50 text-slate-700"
            data-testid="export-card-button">
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleTryOnMidjourney}
            className="flex items-center gap-1.5">
            <Send className="w-4 h-4" />
            Inject
          </Button>
          {expertFeatures.cardEditing && (
            <Button
              onClick={handleSaveChanges}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5">
              <Save className="w-4 h-4" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          data-testid="delete-confirm-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center">
                Cardを削除しますか？
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed text-center">
                この操作は取り消せません。"{name}"
                をライブラリから完全に削除します。
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowDeleteConfirm(false)}
                data-testid="delete-confirm-cancel-button">
                キャンセル
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={async () => {
                  if (onDelete) {
                    await onDelete(card.id)
                  }
                  setShowDeleteConfirm(false)
                }}
                data-testid="delete-confirm-ok-button">
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
