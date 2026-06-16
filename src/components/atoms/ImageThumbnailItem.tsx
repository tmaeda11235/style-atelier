import { CheckCircle2 } from "lucide-react"
import React from "react"
import iconUrl from "url:../../../assets/icon.png"

export interface ImageThumbnailItemProps {
  imgUrl: string
  alt: string
  isSelected: boolean
  orderLabel: string
  onClick: () => void
}

export const ImageThumbnailItem: React.FC<ImageThumbnailItemProps> = ({
  imgUrl,
  alt,
  isSelected,
  orderLabel,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
        isSelected
          ? "border-blue-500 ring-2 ring-blue-100 shadow-md"
          : "border-slate-200 hover:border-slate-400"
      }`}>
      <img
        src={imgUrl === "assets/icon.png" ? iconUrl : imgUrl}
        className="w-full h-full object-cover"
        alt={alt}
      />
      {isSelected && (
        <div className="absolute top-1.5 left-1.5 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>{orderLabel}</span>
        </div>
      )}
    </div>
  )
}
