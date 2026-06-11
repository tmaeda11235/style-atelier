import React from "react"

import { type ConfettiPiece } from "../../hooks/useEvolutionAnimation"

interface EvolutionConfettiProps {
  confetti: ConfettiPiece[]
}

export const EvolutionConfetti: React.FC<EvolutionConfettiProps> = ({
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
