import { Sparkles, X } from "lucide-react"
import React from "react"

import { RARITY_CONFIG, type RarityTier } from "../../lib/rarity-config"
import { Button } from "../atoms/Button"
import { RarityBadge } from "../atoms/RarityBadge"
import {
  EvolutionCardDisplay,
  EvolutionConfetti,
  MODAL_CSS,
  useEvolutionAnimation
} from "./EvolutionModalHelper"

interface EvolutionSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  cardName: string
  thumbnailData?: string
  selectedThumbnails?: string[]
  oldTier: RarityTier
  newTier: RarityTier
  translation: {
    title?: string
    desc?: string
    close?: string
  }
}

export const EvolutionSuccessModal: React.FC<EvolutionSuccessModalProps> = ({
  isOpen,
  onClose,
  cardName,
  thumbnailData,
  selectedThumbnails,
  oldTier,
  newTier,
  translation
}) => {
  const { isFlipped, confetti, tilt, handleMouseMove, handleMouseLeave } =
    useEvolutionAnimation(isOpen, newTier)

  if (!isOpen) return null

  const config = RARITY_CONFIG[newTier]
  const oldConfig = RARITY_CONFIG[oldTier]

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
      <EvolutionConfetti confetti={confetti} />
      <style dangerouslySetInnerHTML={{ __html: MODAL_CSS }} />

      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center overflow-hidden animate-in zoom-in-95 duration-500 z-20">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{ backgroundColor: config.color }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{ backgroundColor: config.color }}
        />

        {isFlipped && (newTier === "Legendary" || newTier === "Epic") && (
          <div
            className="absolute w-[500px] h-[500px] rounded-full opacity-10 blur-sm pointer-events-none animate-god-rays z-0"
            style={{
              background: `repeating-conic-gradient(from 0deg, transparent 0deg, ${config.color} 15deg, transparent 30deg)`
            }}
          />
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close modal">
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2 mb-2 text-yellow-400 animate-bounce">
          <Sparkles className="w-6 h-6 fill-current" />
          <h2 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-200">
            {translation.title || "EVOLUTION COMPLETE!"}
          </h2>
          <Sparkles className="w-6 h-6 fill-current" />
        </div>

        <p className="text-slate-400 text-xs text-center mb-6 max-w-[280px]">
          {translation.desc || "Your style card has evolved to a higher tier!"}
        </p>

        <EvolutionCardDisplay
          tilt={tilt}
          isFlipped={isFlipped}
          oldTier={oldTier}
          newTier={newTier}
          cardName={cardName}
          thumbnailData={thumbnailData}
          selectedThumbnails={selectedThumbnails}
          oldConfig={oldConfig}
          config={config}
          handleMouseMove={handleMouseMove}
          handleMouseLeave={handleMouseLeave}
        />

        <h3 className="text-md font-bold text-white text-center mb-2 z-10">
          {cardName}
        </h3>

        <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-1.5 rounded-full border border-slate-800 mb-6 z-10">
          <RarityBadge tier={oldTier} />
          <span className="text-slate-500 font-bold text-xs">→</span>
          <RarityBadge tier={newTier} />
        </div>

        <Button
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2.5 shadow-lg z-10"
          onClick={onClose}>
          {translation.close || "Close"}
        </Button>
      </div>
    </div>
  )
}
