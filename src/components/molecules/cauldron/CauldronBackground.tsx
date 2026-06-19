import React from "react"

interface CauldronBackgroundProps {
  isGlobalDragging: boolean
  isDragOver: boolean
}

export const CauldronBackground: React.FC<CauldronBackgroundProps> = ({
  isGlobalDragging,
  isDragOver
}) => (
  <>
    <div
      className={`absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] transition-all duration-500 pointer-events-none ${
        isDragOver
          ? "from-blue-900/40 via-slate-950 to-slate-950"
          : isGlobalDragging
            ? "from-indigo-900/30 via-slate-950 to-slate-950"
            : "from-indigo-950/40 via-slate-950 to-slate-950"
      }`}
    />
    <div
      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-all duration-500 ${
        isDragOver
          ? "w-64 h-64 bg-blue-500/15 blur-3xl"
          : isGlobalDragging
            ? "w-56 h-56 bg-indigo-500/10 blur-3xl animate-pulse"
            : "w-48 h-48 bg-blue-500/5 blur-3xl animate-pulse"
      }`}
    />
  </>
)
