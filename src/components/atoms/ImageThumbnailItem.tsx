import { type VariantProps } from "class-variance-authority"
import { CheckCircle2 } from "lucide-react"
import React from "react"
import iconUrl from "url:../../../assets/icon.png"

import { cn } from "../../lib/utils"
import {
  imageThumbnailBadgeVariants,
  imageThumbnailItemVariants
} from "./ImageThumbnailItem.variants"

export interface ImageThumbnailItemProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof imageThumbnailItemVariants>, "selected"> {
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
  onClick,
  className,
  ...props
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        imageThumbnailItemVariants({ selected: isSelected }),
        className
      )}
      {...props}>
      <img
        src={imgUrl === "assets/icon.png" ? iconUrl : imgUrl}
        className="w-full h-full object-cover"
        alt={alt}
      />
      {isSelected && (
        <div className={cn(imageThumbnailBadgeVariants())}>
          <CheckCircle2 className="w-3 h-3" />
          <span>{orderLabel}</span>
        </div>
      )}
    </div>
  )
}
