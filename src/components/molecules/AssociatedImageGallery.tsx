import { CheckCircle2 } from "lucide-react"
import React from "react"
import iconUrl from "url:../../../assets/icon.png"

import { useLanguage } from "../../contexts/LanguageContext"
import { HelpTooltip } from "../atoms/HelpTooltip"

/**
 * Props for the AssociatedImageGallery component.
 */
export interface AssociatedImageGalleryProps {
  /** Array of all image URLs associated with this card */
  images: string[]
  /** Array of currently selected thumbnail URLs in order */
  selectedThumbs: string[]
  /** Callback triggered when a thumbnail is selected or deselected */
  onToggleThumbnail: (imgUrl: string) => void
}

/**
 * AssociatedImageGallery displays a list of images linked to the style card.
 * Users can click on images to toggle/select them as thumbnails (up to four),
 * showing their order in the layout.
 */
export const AssociatedImageGallery: React.FC<AssociatedImageGalleryProps> = ({
  images,
  selectedThumbs,
  onToggleThumbnail
}) => {
  const { t } = useLanguage()
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          Associated Images ({images.length})
          <HelpTooltip
            content={t.helpTooltips.multiImage}
            position="top-left"
          />
        </h3>
        <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
          Selected: {selectedThumbs.length} / 4
        </span>
      </div>
      <p className="text-[11px] text-slate-400">
        Click on images to toggle their use as the card's thumbnail (up to
        four). The selection order determines display layout.
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
              onClick={() => onToggleThumbnail(imgUrl)}
              className={`relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
                isSelected
                  ? "border-blue-500 ring-2 ring-blue-100 shadow-md"
                  : "border-slate-200 hover:border-slate-400"
              }`}>
              <img
                src={imgUrl === "assets/icon.png" ? iconUrl : imgUrl}
                className="w-full h-full object-cover"
                alt={`Card Image ${index + 1}`}
              />
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
  )
}
