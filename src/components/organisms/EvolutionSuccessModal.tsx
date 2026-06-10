import { Sparkles, X } from "lucide-react"
import React, { useEffect, useState } from "react"

import { RARITY_CONFIG, type RarityTier } from "../../lib/rarity-config"
import { Button } from "../atoms/Button"
import { RarityBadge } from "../atoms/RarityBadge"
import { CardThumbnail } from "../molecules/CardThumbnail"

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

interface ConfettiPiece {
  id: number
  x: number // % position
  y: number // px start position
  size: number
  color: string
  delay: number
  duration: number
  rotation: number
  rotationSpeed: number
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
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    const tiltX = -(y / (rect.height / 2)) * 15
    const tiltY = (x / (rect.width / 2)) * 15
    setTilt({ x: tiltX, y: tiltY })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  useEffect(() => {
    if (isOpen) {
      // Generate confetti pieces
      const colors = [
        "#ffd700",
        "#ff6b6b",
        "#4dabf7",
        "#51cf66",
        "#f783ac",
        "#cc5de8",
        "#22b8cf"
      ]
      const pieces: ConfettiPiece[] = Array.from({ length: 80 }).map(
        (_, i) => ({
          id: i,
          x: Math.random() * 100,
          y: -20 - Math.random() * 50,
          size: Math.random() * 10 + 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 1.5,
          duration: Math.random() * 2.5 + 2,
          rotation: Math.random() * 360,
          rotationSpeed: Math.random() * 360 - 180
        })
      )
      setConfetti(pieces)
    } else {
      setConfetti([])
    }
  }, [isOpen])

  if (!isOpen) return null

  const config = RARITY_CONFIG[newTier]
  const oldConfig = RARITY_CONFIG[oldTier]

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
      {/* Dynamic Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className="absolute opacity-85"
            style={{
              left: `${piece.x}%`,
              top: `${piece.y}px`,
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              backgroundColor: piece.color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              animation: `confetti-fall ${piece.duration}s linear infinite`,
              animationDelay: `${piece.delay}s`,
              transform: `rotate(${piece.rotation}deg)`,
              // Custom CSS Variables for animation keyframe properties
              ["--rotation-speed" as any]: `${piece.rotationSpeed}deg`
            }}
          />
        ))}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(var(--rotation-speed, 360deg));
            opacity: 0;
          }
        }
        @keyframes card-shine {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        @keyframes god-rays {
          0% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(1.1);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }
        .animate-god-rays {
          animation: god-rays 20s linear infinite;
        }
        .holo-shine {
          background: linear-gradient(135deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 70%);
          background-size: 200% 200%;
          animation: card-shine 3s ease infinite;
        }
      `
        }}
      />

      {/* Main Container */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center overflow-hidden animate-in zoom-in-95 duration-500 z-20">
        {/* Glow Background Layer */}
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{ backgroundColor: config.color }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{ backgroundColor: config.color }}
        />

        {/* Rotating God Rays for Legendary and Epic */}
        {(newTier === "Legendary" || newTier === "Epic") && (
          <div
            className="absolute w-[500px] h-[500px] rounded-full opacity-10 blur-sm pointer-events-none animate-god-rays z-0"
            style={{
              background: `repeating-conic-gradient(from 0deg, transparent 0deg, ${config.color} 15deg, transparent 30deg)`
            }}
          />
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close modal">
          <X className="w-6 h-6" />
        </button>

        {/* Sparkles / Header */}
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

        {/* Card Display Area */}
        <div
          className="relative group mb-6 z-10 cursor-grab active:cursor-grabbing"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: "transform 0.1s ease-out"
          }}>
          {/* Card Border & Glow */}
          <div
            className={`p-1.5 rounded-xl transition-all duration-1000 ${config.glowClass}`}
            style={{
              background: `linear-gradient(135deg, ${oldConfig.color}, ${config.color})`
            }}>
            <div className="relative bg-slate-950 rounded-lg overflow-hidden w-48 h-48">
              <CardThumbnail
                imageUrl={thumbnailData}
                thumbnailImages={selectedThumbnails}
                alt={cardName}
                tier={newTier}
                className="w-full h-full object-cover animate-in zoom-in-90 duration-700"
              />
              {/* Holographic overlay */}
              <div className="absolute inset-0 holo-shine pointer-events-none mix-blend-overlay" />
            </div>
          </div>
        </div>

        {/* Card Info */}
        <h3 className="text-md font-bold text-white text-center mb-2 z-10">
          {cardName}
        </h3>

        {/* Rarity transition badge */}
        <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-1.5 rounded-full border border-slate-800 mb-6 z-10">
          <RarityBadge tier={oldTier} />
          <span className="text-slate-500 font-bold text-xs">→</span>
          <RarityBadge tier={newTier} />
        </div>

        {/* Action Button */}
        <Button
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2.5 shadow-lg z-10"
          onClick={onClose}>
          {translation.close || "Close"}
        </Button>
      </div>
    </div>
  )
}
