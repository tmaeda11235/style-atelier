import React, { useEffect, useState } from "react"

import { type RarityTier } from "../lib/rarity-config"

export interface ConfettiPiece {
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

export const getConfettiColors = (tier: RarityTier): string[] => {
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

export const generateConfettiPieces = (
  newTier: RarityTier
): ConfettiPiece[] => {
  const colors = getConfettiColors(newTier)
  const shapes: Array<"circle" | "diamond" | "strip"> = [
    "circle",
    "diamond",
    "strip"
  ]
  return Array.from({ length: 90 }).map((_, i) => ({
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
}

export const useEvolutionAnimation = (isOpen: boolean, newTier: RarityTier) => {
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
      t3 = setTimeout(() => setConfetti(generateConfettiPieces(newTier)), 1000)
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
