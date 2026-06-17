import React from "react"
import iconUrl from "url:../../../assets/icon.png"

import { OpfsImage } from "../atoms/OpfsImage"

interface CardThumbnailImagesProps {
  imageUrl?: string
  thumbnailImages?: string[]
  alt: string
}

interface GridLayoutProps {
  images: string[]
  alt: string
}

function FourImagesGrid({ images, alt }: GridLayoutProps) {
  const getBorder = (i: number) => {
    if (i === 0) return "border-r border-b"
    if (i === 1) return "border-b"
    if (i === 2) return "border-r"
    return ""
  }

  return (
    <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
      {images.map((img, i) => (
        <OpfsImage
          key={i}
          src={img}
          alt={`${alt} - Thumbnail ${i + 1}`}
          className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${getBorder(i)} border-white/20`}
        />
      ))}
    </div>
  )
}

function ThreeImagesGrid({ images, alt }: GridLayoutProps) {
  return (
    <div className="grid grid-cols-3 w-full h-full">
      <div className="col-span-2 h-full">
        <OpfsImage
          src={images[0]}
          alt={`${alt} - Thumbnail 1`}
          className="w-full h-full object-cover border-r border-white/20 transition-transform group-hover:scale-105"
        />
      </div>
      <div className="grid grid-rows-2 h-full">
        <OpfsImage
          src={images[1]}
          alt={`${alt} - Thumbnail 2`}
          className="w-full h-full object-cover border-b border-white/20 transition-transform group-hover:scale-105"
        />
        <OpfsImage
          src={images[2]}
          alt={`${alt} - Thumbnail 3`}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
    </div>
  )
}

function TwoImagesGrid({ images, alt }: GridLayoutProps) {
  return (
    <div className="flex w-full h-full">
      <OpfsImage
        src={images[0]}
        alt={`${alt} - Thumbnail 1`}
        className="w-1/2 h-full object-cover border-r border-white/20 transition-transform group-hover:scale-105"
      />
      <OpfsImage
        src={images[1]}
        alt={`${alt} - Thumbnail 2`}
        className="w-1/2 h-full object-cover transition-transform group-hover:scale-105"
      />
    </div>
  )
}

function SingleImageGrid({ src, alt }: { src?: string; alt: string }) {
  return (
    <OpfsImage
      src={src || iconUrl}
      alt={alt}
      className="w-full h-full object-cover transition-transform group-hover:scale-110"
    />
  )
}

function ThumbnailGridLayout({ images, alt }: GridLayoutProps) {
  if (images.length === 4) return <FourImagesGrid images={images} alt={alt} />
  if (images.length === 3) return <ThreeImagesGrid images={images} alt={alt} />
  if (images.length === 2) return <TwoImagesGrid images={images} alt={alt} />
  return <SingleImageGrid src={images[0]} alt={alt} />
}

export function CardThumbnailImages({
  imageUrl,
  thumbnailImages,
  alt
}: CardThumbnailImagesProps) {
  const images = (
    thumbnailImages && thumbnailImages.length > 0
      ? thumbnailImages.slice(0, 4)
      : ([imageUrl].filter(Boolean) as string[])
  ).map((img) => (img === "assets/icon.png" ? iconUrl : img))

  return <ThumbnailGridLayout images={images} alt={alt} />
}
