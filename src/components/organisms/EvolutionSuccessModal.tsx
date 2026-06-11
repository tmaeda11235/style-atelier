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
  x: number
  y: number
  size: number
  color: string
  delay: number
  duration: number
  rotation: number
  rotationSpeed: number
  shape: "circle" | "diamond" | "strip"
}

const getConfettiColors = (tier: RarityTier): string[] => {
  switch (tier) {
    case "Rare":
      return ["#3b82f6", "#60a5fa", "#93c5fd", "#1d4ed8", "#ffffff"]
    case "Epic":
      return ["#a855f7", "#c084fc", "#e879f9", "#7e22ce", "#ffffff"]
    case "Legendary":
      return ["#eab308", "#facc15", "#fde047", "#fbbf24", "#d97706", "#ffffff"]
    default:
      return ["#94a3b8", "#cbd5e1", "#cbd5e1", "#475569", "#ffffff"]
  }
}

const useEvolutionAnimation = (isOpen: boolean, newTier: RarityTier) => {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isAnimating) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTilt({
      x: -((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 15,
      y: ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 15
    })
  }

  useEffect(() => {
    let t1: NodeJS.Timeout, t2: NodeJS.Timeout, t3: NodeJS.Timeout
    if (isOpen) {
      setIsFlipped(false)
      setIsAnimating(true)
      setConfetti([])
      t1 = setTimeout(() => setIsFlipped(true), 600)
      t2 = setTimeout(() => setIsAnimating(false), 1400)
      t3 = setTimeout(() => {
        const colors = getConfettiColors(newTier)
        const shapes: Array<"circle" | "diamond" | "strip"> = [
          "circle",
          "diamond",
          "strip"
        ]
        setConfetti(
          Array.from({ length: 90 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: -20 - Math.random() * 50,
            size: Math.random() * 10 + 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            delay: Math.random() * 1.0,
            duration: Math.random() * 2.0 + 2.0,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 360 - 180,
            shape: shapes[Math.floor(Math.random() * shapes.length)]
          }))
        )
      }, 1000)
    } else {
      setIsFlipped(false)
      setIsAnimating(false)
      setConfetti([])
      setTilt({ x: 0, y: 0 })
    }
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [isOpen, newTier])

  return {
    isFlipped,
    confetti,
    tilt,
    handleMouseMove,
    handleMouseLeave: () => setTilt({ x: 0, y: 0 })
  }
}

const EvolutionConfetti: React.FC<{ confetti: ConfettiPiece[] }> = ({
  confetti
}) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
    {confetti.map((piece) => {
      const borderRadius = piece.shape === "circle" ? "50%" : "2px"
      const transform = `rotate(${piece.rotation + (piece.shape === "diamond" ? 45 : 0)}deg)`
      return (
        <div
          key={piece.id}
          className="absolute opacity-85"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}px`,
            width: `${piece.size}px`,
            height:
              piece.shape === "strip"
                ? `${piece.size * 1.8}px`
                : `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius,
            animation: `confetti-fall ${piece.duration}s linear infinite`,
            animationDelay: `${piece.delay}s`,
            transform,
            ["--rotation-speed" as any]: `${piece.rotationSpeed}deg`
          }}
        />
      )
    })}
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

const EvolutionCardDisplay: React.FC<EvolutionCardDisplayProps> = ({
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
    </div>
  </div>
)

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

const MODAL_CSS = `
  @keyframes confetti-fall {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(var(--rotation-speed, 360deg)); opacity: 0; }
  }
  @keyframes card-shine {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes god-rays {
    0% { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(180deg) scale(1.1); }
    100% { transform: rotate(360deg) scale(1); }
  }
  @keyframes flash-shine {
    0% { opacity: 0; left: -100%; }
    50% { opacity: 0.8; }
    100% { opacity: 0; left: 100%; }
  }
  .animate-god-rays { animation: god-rays 20s linear infinite; }
  .holo-shine {
    background: linear-gradient(135deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 70%);
    background-size: 200% 200%;
    animation: card-shine 3s ease infinite;
  }
  .flash-effect {
    position: absolute;
    top: 0;
    height: 100%;
    width: 50%;
    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.8), transparent);
    transform: skewX(-25deg);
    pointer-events: none;
    z-index: 10;
  }
  .perspective-1000 { perspective: 1000px; }
  .card-flipper {
    width: 100%;
    height: 100%;
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  .card-flipper.flipped { transform: rotateY(180deg); }
  .card-face {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    top: 0;
    left: 0;
  }
  .card-face-front { transform: rotateY(0deg); z-index: 2; }
  .card-face-back { transform: rotateY(180deg); }
`
