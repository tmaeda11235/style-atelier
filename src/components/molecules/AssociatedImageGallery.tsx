import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { HelpTooltip } from "../atoms/HelpTooltip"
import { ImageThumbnailItem } from "../atoms/ImageThumbnailItem"

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
          {t.minting.associatedImages.replace("{0}", String(images.length))}
          <HelpTooltip
            content={t.helpTooltips.multiImage}
            position="top-left"
          />
        </h3>
        <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
          {t.minting.selectedCount.replace(
            "{0}",
            String(selectedThumbs.length)
          )}
        </span>
      </div>
      <p className="text-[11px] text-slate-400">{t.minting.galleryTip}</p>

      <div className="grid grid-cols-2 gap-3">
        {images.map((imgUrl, index) => {
          const selectedIdx = selectedThumbs.indexOf(imgUrl)
          const isSelected = selectedIdx !== -1
          const orderLabels = t.minting.orders
          const orderLabel = orderLabels[selectedIdx] || `${selectedIdx + 1}th`

          return (
            <ImageThumbnailItem
              key={index}
              imgUrl={imgUrl}
              alt={`Card Image ${index + 1}`}
              isSelected={isSelected}
              orderLabel={orderLabel}
              onClick={() => onToggleThumbnail(imgUrl)}
            />
          )
        })}
      </div>
    </div>
  )
}
