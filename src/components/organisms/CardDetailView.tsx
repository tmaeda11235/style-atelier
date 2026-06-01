import React, { useState, useEffect } from "react";
import type { StyleCard, PromptSegment } from "../../lib/db-schema";
import { PromptBubbleEditor } from "./PromptBubbleEditor";
import { ParameterEditor } from "./ParameterEditor";
import { RaritySelector } from "../molecules/RaritySelector";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Input";
import { useHand } from "../../hooks/useHand";
import { db } from "../../lib/db";
import { buildPromptString } from "../../lib/prompt-utils";
import { X, Send, Save, Download } from "lucide-react";
import type { AlertType } from "../molecules/ConnectionAlert";
import { useLiveQuery } from "dexie-react-hooks";
import { exportCardAsImage } from "../../lib/export-utils";
import { TagEditor } from "../molecules/TagEditor";
import { AssociatedImageGallery } from "../molecules/AssociatedImageGallery";

/**
 * Props for the CardDetailView component.
 */
interface CardDetailViewProps {
  /** The StyleCard object being viewed or edited */
  card: StyleCard;
  /** Callback to close the detail panel */
  onClose: () => void;
  /** Callback to inject the built prompt into the target application page */
  onInject: (prompt: string) => Promise<void>;
  /** Callback to save the updated StyleCard object to storage */
  onSave: (updatedCard: StyleCard) => Promise<void>;
  /** Callback to update the alert state */
  setAlertType: (type: AlertType) => void;
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
}: CardDetailViewProps) {
  const { pinnedCards } = useHand();
  const hasPinnedCards = pinnedCards.length > 0;

  const categoriesList = useLiveQuery(() => db.categories.toArray()) || [];

  const [name, setName] = useState(card.name);
  const [tier, setTier] = useState(card.tier);
  const [promptSegments, setPromptSegments] = useState<PromptSegment[]>(card.promptSegments || []);
  const [parameters, setParameters] = useState<StyleCard["parameters"]>(card.parameters || {});
  const [isSrefHidden, setIsSrefHidden] = useState(card.masking?.isSrefHidden || false);
  const [isPHidden, setIsPHidden] = useState(card.masking?.isPHidden || false);
  const [category, setCategory] = useState(card.category || "");
  
  // Tags editing state
  const [tags, setTags] = useState<string[]>(card.tags || []);

  // Image and Thumbnail Selection state
  const images = card.images && card.images.length > 0 ? card.images : [card.thumbnailData].filter(Boolean);
  const [selectedThumbs, setSelectedThumbs] = useState<string[]>(card.selectedThumbnails || (card.thumbnailData ? [card.thumbnailData] : []));
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCard = async () => {
    setIsExporting(true);
    try {
      const primaryThumb = selectedThumbs[0] || images[0] || "assets/icon.png";
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
      };
      await exportCardAsImage(tempCard);
    } catch (err) {
      console.error("Failed to export card:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Sync state if card changes
  useEffect(() => {
    setName(card.name);
    setTier(card.tier);
    setPromptSegments(card.promptSegments || []);
    setParameters(card.parameters || {});
    setIsSrefHidden(card.masking?.isSrefHidden || false);
    setIsPHidden(card.masking?.isPHidden || false);
    setCategory(card.category || "");
    setTags(card.tags || []);
    setSelectedThumbs(card.selectedThumbnails || (card.thumbnailData ? [card.thumbnailData] : []));
  }, [card]);

  const handleToggleThumbnail = (imgUrl: string) => {
    if (selectedThumbs.includes(imgUrl)) {
      // Remove it
      setSelectedThumbs(selectedThumbs.filter((url) => url !== imgUrl));
    } else {
      // Add it. If already 4 selected, shift the queue
      if (selectedThumbs.length < 4) {
        setSelectedThumbs([...selectedThumbs, imgUrl]);
      } else {
        setSelectedThumbs([...selectedThumbs.slice(1), imgUrl]);
      }
    }
  };

  const handleSaveChanges = async () => {
    // Fallback thumbnail data for older fields compatibility
    const primaryThumb = selectedThumbs[0] || images[0] || "assets/icon.png";

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
    };

    try {
      await onSave(updatedCard);
    } catch (err) {
      console.error("Failed to save style card updates:", err);
    }
  };

  const handleTryOnMidjourney = async () => {
    const maskedKeys: (keyof StyleCard["parameters"])[] = [];
    if (isSrefHidden) maskedKeys.push("sref");
    if (isPHidden) maskedKeys.push("p");

    const fullPrompt = buildPromptString(promptSegments, parameters, maskedKeys);
    await onInject(fullPrompt);
  };

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
          <TagEditor tags={tags} onChange={setTags} />
        </div>

        {/* Gallery & Thumbnail Selector Section */}
        <div className="p-4 bg-white border rounded-lg shadow-sm">
          <AssociatedImageGallery
            images={images}
            selectedThumbs={selectedThumbs}
            onToggleThumbnail={handleToggleThumbnail}
          />
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
  );
}
