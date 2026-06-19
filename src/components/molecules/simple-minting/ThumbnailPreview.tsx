import React from "react"

interface ThumbnailPreviewProps {
  imageUrl: string
  altText: string
}

export const ThumbnailPreview: React.FC<ThumbnailPreviewProps> = ({
  imageUrl,
  altText
}) => (
  <div className="relative group rounded-xl overflow-hidden shadow-md border border-slate-100 aspect-video bg-slate-950">
    <img
      src={imageUrl}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      alt={altText}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
  </div>
)
