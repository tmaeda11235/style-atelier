/* eslint-disable max-lines-per-function, react/forbid-elements */
import React, { useEffect, useRef, useState } from "react"

import { Button } from "~components/atoms/Button"
import type { ClipSettings } from "~shared/lib/db-schema"

interface ClipAdjusterProps {
  imageUrl: string
  clipSettings?: ClipSettings
  onChange: (clip: ClipSettings) => void
  onClose: () => void
}

export function ClipAdjuster({
  imageUrl,
  clipSettings,
  onChange,
  onClose
}: ClipAdjusterProps) {
  const [zoom, setZoom] = useState(clipSettings?.zoom ?? 1.0)
  const [xOffset, setXOffset] = useState(clipSettings?.xOffset ?? 0.0)
  const [yOffset, setYOffset] = useState(clipSettings?.yOffset ?? 0.0)

  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const startOffset = useRef({ x: 0, y: 0 })

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextZoom = parseFloat(e.target.value)
    setZoom(nextZoom)
  }

  const handleStart = (clientX: number, clientY: number) => {
    isDragging.current = true
    startPos.current = { x: clientX, y: clientY }
    startOffset.current = { x: xOffset, y: yOffset }
  }

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const dx = clientX - startPos.current.x
    const dy = clientY - startPos.current.y

    // ズームレベルに応じた感度調整
    let nextX = startOffset.current.x - dx / (rect.width * zoom)
    let nextY = startOffset.current.y - dy / (rect.height * zoom)

    if (nextX < -0.5) nextX = -0.5
    if (nextX > 0.5) nextX = 0.5
    if (nextY < -0.5) nextY = -0.5
    if (nextY > 0.5) nextY = 0.5

    setXOffset(nextX)
    setYOffset(nextY)
  }

  useEffect(() => {
    const handleMouseUp = () => {
      isDragging.current = false
    }
    window.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("touchend", handleMouseUp)
    return () => {
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("touchend", handleMouseUp)
    }
  }, [])

  const handleSave = () => {
    onChange({
      zoom,
      xOffset,
      yOffset
    })
    onClose()
  }

  const previewStyle: React.CSSProperties = {
    transform: `scale(${zoom}) translate(${-xOffset * 100}%, ${-yOffset * 100}%)`,
    transition: isDragging.current ? "none" : "transform 0.1s ease-out",
    transformOrigin: "center center"
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col justify-end sm:justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-auto overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">画像をクリップ調整</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
            aria-label="Close">
            &times;
          </button>
        </div>

        <div
          ref={containerRef}
          className="relative w-full aspect-square bg-slate-950 overflow-hidden cursor-move touch-none"
          onMouseDown={(e) => {
            e.preventDefault()
            handleStart(e.clientX, e.clientY)
          }}
          onMouseMove={(e) => {
            if (isDragging.current) {
              e.preventDefault()
              handleMove(e.clientX, e.clientY)
            }
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              handleStart(e.touches[0].clientX, e.touches[0].clientY)
            }
          }}
          onTouchMove={(e) => {
            if (isDragging.current && e.touches.length === 1) {
              handleMove(e.touches[0].clientX, e.touches[0].clientY)
            }
          }}>
          <img
            src={imageUrl}
            alt="Adjust clip"
            className="w-full h-full object-cover select-none pointer-events-none"
            style={previewStyle}
          />
          <div className="absolute inset-0 border border-white/20 pointer-events-none flex items-center justify-center">
            <div className="w-1/3 h-1/3 border border-dashed border-white/30"></div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-500 w-12">
              ズーム
            </span>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.05"
              value={zoom}
              onChange={handleZoomChange}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-xs font-bold text-slate-600 w-10 text-right">
              {zoom.toFixed(2)}x
            </span>
          </div>

          <div className="text-xs text-slate-400 text-center">
            画像をドラッグして位置調整、スライダーでズームを変更できます
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <Button variant="ghost" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave}>適用</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
