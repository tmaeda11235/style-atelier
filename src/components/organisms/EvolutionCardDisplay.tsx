import React from "react"

import { type RarityTier } from "../../lib/rarity-config"
import { CardThumbnail } from "../molecules/CardThumbnail"

interface CardFaceFrontProps {
  oldConfig: any
  thumbnailData?: string
  selectedThumbnails?: string[]
  cardName: string
  oldTier: RarityTier
}

const CardFaceFront: React.FC<CardFaceFrontProps> = ({
  oldConfig,
  thumbnailData,
  selectedThumbnails,
  cardName,
  oldTier
}) => (
  <div className="card-face card-face-front">
    <div
      className={`p-1.5 rounded-xl transition-all duration-1000 ${oldConfig.glowClass}`}
      style={{ background: oldConfig.color }}>
      <div className="relative bg-slate-950 rounded-lg overflow-hidden w-48 h-48">
        <CardThumbnail
          imageUrl={thumbnailData}
          thumbnailImages={selectedThumbnails}
          alt={cardName}
          tier={oldTier}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  </div>
)

interface CardFaceBackProps {
  config: any
  thumbnailData?: string
  selectedThumbnails?: string[]
  cardName: string
  newTier: RarityTier
  isFlipped: boolean
}

const CardFaceBack: React.FC<CardFaceBackProps> = ({
  config,
  thumbnailData,
  selectedThumbnails,
  cardName,
  newTier,
  isFlipped
}) => (
  <div className="card-face card-face-back">
    <div
      className={`p-1.5 rounded-xl transition-all duration-1000 ${config.glowClass}`}
      style={{ background: config.color }}>
      <div className="relative bg-slate-950 rounded-lg overflow-hidden w-48 h-48">
        <CardThumbnail
          imageUrl={thumbnailData}
          thumbnailImages={selectedThumbnails}
          alt={cardName}
          tier={newTier}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 holo-shine pointer-events-none mix-blend-overlay" />
        {isFlipped && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg z-10">
            <div
              className="flash-effect"
              style={{
                animation: "flash-shine 0.8s ease-in-out forwards",
                animationDelay: "0.2s"
              }}
            />
          </div>
        )}
      </div>
    </div>
  </div>
)

interface EvolutionCardDisplayProps {
  tilt: { x: number; y: number }
  isFlipped: boolean
  oldTier: RarityTier
  newTier: RarityTier
  cardName: string
  thumbnailData?: string
  selectedThumbnails?: string[]
  oldConfig: any
  config: any
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
  handleMouseLeave: () => void
}

export const EvolutionCardDisplay: React.FC<EvolutionCardDisplayProps> = ({
  tilt,
  isFlipped,
  oldTier,
  newTier,
  cardName,
  thumbnailData,
  selectedThumbnails,
  oldConfig,
  config,
  handleMouseMove,
  handleMouseLeave
}) => (
  <div
    className="relative group mb-6 z-10 cursor-grab active:cursor-grabbing perspective-1000 w-[204px] h-[204px]"
    onMouseMove={handleMouseMove}
    onMouseLeave={handleMouseLeave}
    style={{
      transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      transition: "transform 0.1s ease-out"
    }}>
    <div className={`card-flipper ${isFlipped ? "flipped" : ""}`}>
      <CardFaceFront
        oldConfig={oldConfig}
        thumbnailData={thumbnailData}
        selectedThumbnails={selectedThumbnails}
        cardName={cardName}
        oldTier={oldTier}
      />
      <CardFaceBack
        config={config}
        thumbnailData={thumbnailData}
        selectedThumbnails={selectedThumbnails}
        cardName={cardName}
        newTier={newTier}
        isFlipped={isFlipped}
      />
    </div>
  </div>
)
