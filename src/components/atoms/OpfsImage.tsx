import { useOpfsImage } from "@/hooks/useOpfsImage"
import React, { useEffect, useRef, useState } from "react"
import iconUrl from "url:../../../assets/icon.png"

interface OpfsImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string
  alt: string
}

function checkIsOpfsPath(src?: string): boolean {
  if (!src) return false
  return (
    !src.startsWith("data:") &&
    !src.startsWith("http") &&
    !src.startsWith("chrome-extension") &&
    !src.startsWith("url:") &&
    src !== "assets/icon.png"
  )
}

function useIntersectionLoader(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean
): boolean {
  const [isVisible, setIsVisible] = useState(!enabled)

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "100px" }
    )

    const currentEl = ref.current
    if (currentEl) {
      observer.observe(currentEl)
    }

    return () => {
      observer.disconnect()
    }
  }, [enabled, ref])

  return isVisible
}

export function OpfsImage({ src, alt, className, ...props }: OpfsImageProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const isOpfsPath = checkIsOpfsPath(src)
  const isVisible = useIntersectionLoader(imgRef, isOpfsPath)

  const { imageUrl, isLoading } = useOpfsImage(
    isOpfsPath && isVisible ? src : undefined
  )

  const finalSrc = isOpfsPath ? (isVisible ? imageUrl : undefined) : src

  return (
    <img
      ref={imgRef}
      src={finalSrc || iconUrl}
      alt={alt}
      className={`${className || ""} ${isLoading ? "animate-pulse" : ""}`}
      {...props}
    />
  )
}
