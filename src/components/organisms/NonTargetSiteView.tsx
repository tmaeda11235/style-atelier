import React from "react"
import { Compass, ExternalLink } from "lucide-react"

interface NonTargetSiteViewProps {
  onOpenMidjourney: () => void
  onOpenDiscord: () => void
}

export function NonTargetSiteView({ onOpenMidjourney, onOpenDiscord }: NonTargetSiteViewProps) {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6 text-slate-200 font-sans select-none overflow-hidden">
      <div className="relative w-full max-w-sm flex flex-col items-center text-center space-y-6">
        
        {/* Glow effect in background */}
        <div className="absolute -top-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

        {/* Animated icon container */}
        <div className="relative z-10 w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-900/30 animate-pulse duration-[3000ms]">
          <Compass className="w-10 h-10 text-white" style={{ animation: "spin 8s linear infinite" }} />
          
          {/* Decorative mini card floating around */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-lg shadow transform rotate-12 flex items-center justify-center text-[10px]">
            🎴
          </div>
        </div>

        {/* Text descriptions */}
        <div className="space-y-2 z-10">
          <h2 className="text-xl font-black tracking-tight text-white bg-gradient-to-r from-blue-200 via-indigo-100 to-white bg-clip-text text-transparent">
            Style Atelier
          </h2>
          <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            Waiting for Connection
          </div>
          <p className="text-sm text-slate-400 max-w-[260px] mx-auto leading-relaxed pt-2">
            本拡張機能は Midjourney または Discord のページでのみご利用いただけます。
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="w-full flex flex-col gap-3 pt-4 z-10">
          <button
            onClick={onOpenMidjourney}
            className="group w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-900/40 hover:shadow-indigo-800/60 active:scale-98 transition-all duration-200 flex items-center justify-center gap-2"
          >
            Midjourneyを開く
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
          
          <button
            onClick={onOpenDiscord}
            className="w-full py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            Discordを開く
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>

        {/* Bottom branding footer */}
        <div className="text-[10px] text-slate-600 pt-8 z-10">
          Style Atelier &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
