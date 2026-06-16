import React from "react"

interface SpotlightOverlayProps {
  spotlightRect: {
    top: number
    left: number
    width: number
    height: number
  } | null
}

export function SpotlightOverlay({ spotlightRect }: SpotlightOverlayProps) {
  const bg = "rgba(2, 6, 23, 0.75)"
  const base: React.CSSProperties = {
    position: "fixed",
    background: bg,
    pointerEvents: "none"
  }

  if (!spotlightRect) {
    return (
      <div
        style={{ ...base, inset: 0, pointerEvents: "none" }}
        aria-label="Tutorial overlay"
      />
    )
  }

  const { top, left, width, height } = spotlightRect
  const right = left + width
  const bottom = top + height

  return (
    <>
      {/* Top */}
      <div style={{ ...base, top: 0, left: 0, right: 0, height: top }} />
      {/* Bottom */}
      <div style={{ ...base, top: bottom, left: 0, right: 0, bottom: 0 }} />
      {/* Left */}
      <div style={{ ...base, top, left: 0, width: left, height }} />
      {/* Right */}
      <div style={{ ...base, top, left: right, right: 0, height }} />
    </>
  )
}
