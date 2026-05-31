import React, { useState, useEffect } from "react"
import type { StyleCard, PromptSegment } from "../../lib/db-schema"
import { PromptBubbleEditor } from "./PromptBubbleEditor"
import { ParameterEditor } from "./ParameterEditor"
import { RaritySelector } from "../molecules/RaritySelector"
import { Button } from "../atoms/Button"
import { Input } from "../atoms/Input"
import { useHand } from "../../hooks/useHand"
import { db } from "../../lib/db"
import { buildPromptString } from "../../lib/prompt-utils"
import { X, Send, Save, Trash2, CheckCircle2, Download } from "lucide-react"
import type { AlertType } from "../molecules/ConnectionAlert"
import { useLiveQuery } from "dexie-react-hooks"
import { exportCardAsImage } from "../../lib/export-utils"

interface CardDetailViewProps {
  card: StyleCard
  onClose: () => void
  onInject: (prompt: string) => Promise<void>
  onSave: (updatedCard: StyleCard) => Promise<void>
  setAlertType: (type: AlertType) => void
}

export function CardDetailView({
  card,
  onClose,
  onInject,
  onSave,
  setAlertType,
}: CardDetailViewProps) {
  const { pinnedCards } = useHand()
  const hasPinnedCards = pinnedCards.length > 0

  const categoriesList = useLiveQuery(() => db.categories.toArray()) || []

  const [name, setName] = useState(card.name)
  const [tier, setTier] = useState(card.tier)
  const [promptSegments, setPromptSegments] = useState<PromptSegment[]>(card.promptSegments || [])
  const [parameters, setParameters] = useState<StyleCard["parameters"]>(card.parameters || {})
  const [isSrefHidden, setIsSrefHidden] = useState(card.masking?.isSrefHidden || false)
  const [isPHidden, setIsPHidden] = useState(card.masking?.isPHidden || false)
  const [category, setCategory] = useState(card.category || "")
  
  // Tags editing state
  const [tags, setTags] = useState<string[]>(card.tags || [])
  const [newTagInput, setNewTagInput] = useState("")

  // Image and Thumbnail Selection state
  const images = card.images && card.images.length > 0 ? card.images : [card.thumbnailData].filter(Boolean)
  const [selectedThumbs, setSelectedThumbs] = useState<string[]>(card.selectedThumbnails || (card.thumbnailData ? [card.thumbnailData] : []))
  const [isExporting, setIsExporting] = useState(false)

  const handleExportCard = async () => {
    setIsExporting(true)
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
        accentColor: card.accentColor,
      }
      await exportCardAsImage(tempCard)
    } catch (err) {
      console.error("Failed to export card:", err)
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
    const initialImages = card.images && card.images.length > 0 ? card.images : [card.thumbnailData].filter(Boolean)
    setSelectedThumbs(card.selectedThumbnails || (card.thumbnailData ? [card.thumbnailData] : []))
  }, [card])

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newTagInput.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setNewTagInput("")
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

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

    const updatedCard: StyleCard = {
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
      masking: {
        isSrefHidden,
        isPHidden,
      },
      updatedAt: Date.now(),
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
      className={`absolute inset-0 bg-slate-50 z-20 flex flex-col ${hasPinnedCards ? "pb-[110px]" : ""}`}
    >
      {/* Header */}
      <div className="p-4 bg-white shadow-sm flex items-center justify-between border-b">
        <h2 className="text-lg font-bold text-slate-800">Card Details</h2>
        <Button variant="ghost" size="xs" onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Card Metadata Section */}
        <div className="p-4 bg-white border rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Identity</h3>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Card Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Card Name"
              className="font-bold text-slate-800 text-sm"
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm border rounded bg-white p-2"
            >
              <option value="">No Category</option>
              {categoriesList.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.iconEmoji || "🖼️"} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Color Palette Display */}
          {(card.dominantColor || card.accentColor) && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Detected Palette</label>
              <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {card.dominantColor && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border border-slate-300 shadow-sm"
                      style={{ backgroundColor: card.dominantColor }}
                      title="Dominant Color"
                    />
                    <span className="text-xs font-bold text-slate-700">Dominant ({card.dominantColor})</span>
                  </div>
                )}
                {card.accentColor && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border border-slate-300 shadow-sm"
                      style={{ backgroundColor: card.accentColor }}
                      title="Accent Color"
                    />
                    <span className="text-xs font-bold text-slate-700">Accent ({card.accentColor})</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags Editor */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-slate-400 hover:text-red-500 text-[10px]"
                  >
                    &times;
                  </button>
                </span>
              ))}
              {tags.length === 0 && (
                <span className="text-xs text-slate-400 italic">No tags added yet.</span>
              )}
            </div>
            <form onSubmit={handleAddTag} className="flex gap-2">
              <Input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="Add new tag..."
                className="text-xs py-1"
              />
              <Button type="submit" size="xs" variant="secondary">
                Add
              </Button>
            </form>
          </div>
        </div>

        {/* Gallery & Thumbnail Selector Section */}
        <div className="p-4 bg-white border rounded-lg shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Associated Images ({images.length})</h3>
            <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
              Selected: {selectedThumbs.length} / 4
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Click on images to toggle their use as the card's thumbnail (up to four). The selection order determines display layout.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {images.map((imgUrl, index) => {
              const selectedIdx = selectedThumbs.indexOf(imgUrl)
              const isSelected = selectedIdx !== -1
              const orderLabels = ["1st", "2nd", "3rd", "4th"]
              const orderLabel = orderLabels[selectedIdx] || `${selectedIdx + 1}th`
              return (
                <div
                  key={index}
                  onClick={() => handleToggleThumbnail(imgUrl)}
                  className={`relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
                    isSelected ? "border-blue-500 ring-2 ring-blue-100 shadow-md" : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <img src={imgUrl} className="w-full h-full object-cover" alt={`Card Image ${index + 1}`} />
                  {isSelected && (
                    <div className="absolute top-1.5 left-1.5 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{orderLabel}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Prompt segments bubble editor */}
        <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Prompt Recipe</h3>
          <PromptBubbleEditor
            initialSegments={promptSegments}
            onChange={setPromptSegments}
            tier={tier}
          />
        </div>

        {/* Parameters editor */}
        <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Parameters</h3>
          <ParameterEditor parameters={parameters} onChange={setParameters} />
        </div>

        {/* Sealing options */}
        <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Sealing Options</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="detail-hide-sref"
                checked={isSrefHidden}
                onChange={(e) => setIsSrefHidden(e.target.checked)}
              />
              <label htmlFor="detail-hide-sref" className="text-xs text-slate-600">
                Hide --sref when sharing
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="detail-hide-p"
                checked={isPHidden}
                onChange={(e) => setIsPHidden(e.target.checked)}
              />
              <label htmlFor="detail-hide-p" className="text-xs text-slate-600">
                Hide --p when sharing
              </label>
            </div>
          </div>
        </div>

        {/* Rarity selector */}
        <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Rarity & Frame</h3>
          <RaritySelector selected={tier} onSelect={setTier} />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-white shadow-t-sm flex justify-between gap-2 border-t z-10">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCard}
            disabled={isExporting}
            className="flex items-center gap-1.5 border-slate-300 hover:bg-slate-50 text-slate-700"
            data-testid="export-card-button"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleTryOnMidjourney}
            className="flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            Inject
          </Button>
          <Button
            onClick={handleSaveChanges}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
