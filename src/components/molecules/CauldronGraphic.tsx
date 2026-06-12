import { Sparkles } from "lucide-react"
import React from "react"

interface CauldronSubProps {
  isDragOver: boolean
}

const CauldronGradients: React.FC = () => (
  <defs>
    <linearGradient id="liquid-grad-idle" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#7c3aed" />
      <stop offset="100%" stopColor="#312e81" />
    </linearGradient>
    <linearGradient id="liquid-grad-active" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#06b6d4" />
      <stop offset="50%" stopColor="#10b981" />
      <stop offset="100%" stopColor="#1e1b4b" />
    </linearGradient>
    <linearGradient id="cauldron-metal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#334155" />
      <stop offset="50%" stopColor="#1e293b" />
      <stop offset="100%" stopColor="#0f172a" />
    </linearGradient>
    <linearGradient id="cauldron-rim" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#475569" />
      <stop offset="50%" stopColor="#64748b" />
      <stop offset="100%" stopColor="#334155" />
    </linearGradient>
    <linearGradient id="fire-grad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
      <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.9" />
      <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
    </linearGradient>
    <linearGradient id="fire-grad-active" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
      <stop offset="60%" stopColor="#22c55e" stopOpacity="0.9" />
      <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0" />
    </linearGradient>
  </defs>
)

const MagicFire: React.FC<CauldronSubProps> = ({ isDragOver }) => (
  <g className="origin-[60px_95px]">
    <path
      d="M 35 95 L 85 92"
      stroke="#475569"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M 40 91 L 80 96"
      stroke="#334155"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <path
      d="M 45 92 C 40 75, 50 65, 53 60 C 56 65, 60 70, 60 92 Z"
      fill={isDragOver ? "url(#fire-grad-active)" : "url(#fire-grad)"}
      className={`transition-all duration-500 origin-[53px_92px] ${
        isDragOver
          ? "animate-cauldron-fire-active"
          : "animate-cauldron-fire-idle"
      }`}
    />
    <path
      d="M 58 92 C 55 80, 65 72, 67 68 C 69 72, 75 78, 72 92 Z"
      fill={isDragOver ? "url(#fire-grad-active)" : "url(#fire-grad)"}
      className={`transition-all duration-500 origin-[65px_92px] ${
        isDragOver
          ? "animate-cauldron-fire-active"
          : "animate-cauldron-fire-idle"
      } [animation-delay:0.2s]`}
    />
    <path
      d="M 50 93 C 48 85, 55 80, 56 75 C 57 80, 62 82, 60 93 Z"
      fill="#fef08a"
      opacity={isDragOver ? 0.9 : 0.6}
      className={`transition-all duration-500 origin-[55px_93px] ${
        isDragOver
          ? "animate-cauldron-fire-active"
          : "animate-cauldron-fire-idle"
      } [animation-delay:0.1s]`}
    />
  </g>
)

/* prettier-ignore */
const CauldronMainBody: React.FC<CauldronSubProps> = ({ isDragOver }) => (
  <>
    <path d="M 32 80 C 28 88, 32 94, 34 94 C 36 94, 38 88, 38 80 Z" fill="#0f172a" />
    <path d="M 88 80 C 92 88, 88 94, 86 94 C 84 94, 82 88, 82 80 Z" fill="#0f172a" />
    <path d="M 60 83 C 58 92, 60 96, 60 96 C 60 96, 62 92, 60 83 Z" fill="#090d16" />
    <path
      d="M 24 50 C 20 82, 40 90, 60 90 C 80 90, 100 82, 96 50 C 96 50, 96 46, 90 46 C 84 46, 36 46, 30 46 C 24 46, 24 50, 24 50 Z"
      fill="url(#cauldron-metal)"
      stroke={isDragOver ? "#06b6d4" : "#475569"}
      strokeWidth="2"
      className="transition-colors duration-500"
    />
    <path d="M 25 55 C 17 55, 17 67, 25 67" fill="none" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
    <path d="M 95 55 C 103 55, 103 67, 95 67" fill="none" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
    <path
      d="M 50 68 H 70 M 60 58 V 78"
      stroke={isDragOver ? "#22d3ee" : "#334155"}
      strokeWidth="3"
      strokeLinecap="round"
      opacity={isDragOver ? 0.9 : 0.4}
      className="transition-all duration-500"
    />
    <circle
      cx="60"
      cy="68"
      r="13"
      fill="none"
      stroke={isDragOver ? "#22d3ee" : "#334155"}
      strokeWidth="2"
      opacity={isDragOver ? 0.8 : 0.3}
      strokeDasharray="4 3"
      className={`transition-all duration-500 ${isDragOver ? "animate-cauldron-spin" : ""}`}
    />
  </>
)

const CauldronBubbles: React.FC<CauldronSubProps> = ({ isDragOver }) => (
  <g opacity="0.8">
    <circle
      cx="45"
      cy="45"
      r="1.8"
      fill={isDragOver ? "#34d399" : "#c084fc"}
      className={`origin-[45px_45px] ${
        isDragOver
          ? "animate-cauldron-bubble-fast"
          : "animate-cauldron-bubble-slow"
      }`}
    />
    <circle
      cx="75"
      cy="46"
      r="2.2"
      fill={isDragOver ? "#22d3ee" : "#a78bfa"}
      className={`origin-[75px_46px] ${
        isDragOver
          ? "animate-cauldron-bubble-fast"
          : "animate-cauldron-bubble-slow"
      } [animation-delay:0.5s]`}
    />
    <circle
      cx="58"
      cy="44"
      r="1.2"
      fill={isDragOver ? "#6ee7b7" : "#e9d5ff"}
      className={`origin-[58px_44px] ${
        isDragOver
          ? "animate-cauldron-bubble-fast"
          : "animate-cauldron-bubble-slow"
      } [animation-delay:1.2s]`}
    />
    <circle
      cx="68"
      cy="45"
      r="2"
      fill={isDragOver ? "#22d3ee" : "#c084fc"}
      className={`origin-[68px_45px] ${
        isDragOver
          ? "animate-cauldron-bubble-fast"
          : "animate-cauldron-bubble-slow"
      } [animation-delay:0.8s]`}
    />
  </g>
)

const CauldronRimAndLiquid: React.FC<CauldronSubProps> = ({ isDragOver }) => (
  <>
    <ellipse
      cx="60"
      cy="46"
      rx="36"
      ry="7.5"
      fill="url(#cauldron-rim)"
      stroke={isDragOver ? "#06b6d4" : "#334155"}
      strokeWidth="1.5"
      className="transition-colors duration-500"
    />
    <ellipse
      cx="60"
      cy="46"
      rx="33.5"
      ry="5.5"
      fill={isDragOver ? "url(#liquid-grad-active)" : "url(#liquid-grad-idle)"}
      className="transition-all duration-500"
    />
    <path
      d="M 33 46 Q 45 42 60 46 T 87 46"
      fill="none"
      stroke={isDragOver ? "#a7f3d0" : "#d8b4fe"}
      strokeWidth="1"
      opacity={isDragOver ? 0.8 : 0.5}
      className="transition-all duration-500"
    />
    <CauldronBubbles isDragOver={isDragOver} />
  </>
)

export const CauldronGraphic: React.FC<CauldronSubProps> = ({ isDragOver }) => (
  <div
    className={`relative w-28 h-28 flex items-center justify-center transition-all duration-500 ${
      isDragOver ? "scale-110" : "scale-100"
    }`}
    data-testid="workbench-cauldron-graphic">
    <div
      className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 ${
        isDragOver ? "bg-cyan-500/20 animate-pulse" : "bg-purple-500/5"
      }`}
    />
    {isDragOver && (
      <>
        <Sparkles className="absolute top-2 left-6 w-3 h-3 text-cyan-400 animate-pulse" />
        <Sparkles className="absolute top-1 right-6 w-4 h-4 text-emerald-400 animate-pulse [animation-delay:0.3s]" />
        <Sparkles className="absolute bottom-6 left-2 w-3.5 h-3.5 text-indigo-400 animate-pulse [animation-delay:0.6s]" />
      </>
    )}
    <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-md z-10">
      <CauldronGradients />
      <MagicFire isDragOver={isDragOver} />
      <CauldronMainBody isDragOver={isDragOver} />
      <CauldronRimAndLiquid isDragOver={isDragOver} />
    </svg>
  </div>
)
