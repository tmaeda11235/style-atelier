import {
  ChevronRight,
  Gem,
  Hammer,
  Layers,
  MousePointerClick,
  Move,
  Sparkles,
  Type,
  Zap
} from "lucide-react"
import React from "react"

export interface Step {
  title: string
  description: string
  icon: React.ReactNode
  color: string
  illustration: React.ReactNode
}

export const MoveIllustration: React.FC = () => (
  <div className="relative w-full h-32 bg-slate-900/50 rounded-lg flex items-center justify-center border border-slate-700/50 overflow-hidden">
    <div className="absolute top-2 left-2 text-[10px] text-slate-500 font-mono">
      Midjourney Web UI
    </div>
    <div className="absolute top-2 right-2 text-[10px] text-slate-500 font-mono">
      Side Panel
    </div>
    <div className="w-16 h-16 bg-slate-800 rounded border border-slate-700 flex items-center justify-center shadow-lg animate-pulse">
      <span className="text-xl">🖼️</span>
    </div>
    <div className="mx-4 flex items-center justify-center text-slate-400 animate-bounce">
      <ChevronRight className="w-8 h-8 text-blue-400" />
    </div>
    <div className="w-20 h-20 bg-slate-800/80 rounded border-2 border-dashed border-blue-500/50 flex flex-col items-center justify-center p-1">
      <div className="w-full h-full bg-blue-500/10 rounded flex items-center justify-center">
        <span className="text-xs text-blue-400 font-bold font-sans">
          Drop Here
        </span>
      </div>
    </div>
  </div>
)

export const MintIllustration: React.FC = () => (
  <div className="w-full h-32 bg-slate-900/50 rounded-lg flex flex-col items-center justify-center border border-slate-700/50 p-4">
    <div className="bg-slate-800 p-2 rounded-lg border border-slate-700 w-full max-w-[200px] flex justify-between items-center shadow-md">
      <div className="flex items-center gap-2">
        <span className="text-lg">🖼️</span>
        <span className="text-[10px] text-slate-400 font-mono">#1234</span>
      </div>
      <button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold py-1 px-3 rounded shadow-lg shadow-orange-500/20 flex items-center gap-1 animate-pulse">
        <Sparkles className="w-3 h-3" /> Mint
      </button>
    </div>
  </div>
)

export const TitleIllustration: React.FC = () => (
  <div className="w-full h-32 bg-slate-900/50 rounded-lg flex flex-col items-center justify-center border border-slate-700/50 p-4 gap-2">
    <label className="text-xs text-purple-300 font-bold self-start pl-4">
      Card Name
    </label>
    <div className="relative w-full max-w-[220px]">
      <input
        type="text"
        readOnly
        value="Neon Cyberpunk Samurai"
        className="w-full bg-slate-800 border border-purple-500/50 rounded px-3 py-1.5 text-xs text-white shadow-inner focus:outline-none"
      />
      <span className="absolute right-2 top-2 text-[10px] text-purple-400 font-bold animate-pulse">
        Title
      </span>
    </div>
  </div>
)

export const BubblesIllustration: React.FC = () => (
  <div className="w-full h-32 bg-slate-900/50 rounded-lg flex flex-col items-center justify-center border border-slate-700/50 p-3 gap-2">
    <div className="text-[10px] text-slate-400 font-bold self-start">
      Prompt Bubbles
    </div>
    <div className="flex flex-wrap gap-1.5 justify-center">
      <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-300">
        A samurai
      </span>
      <span className="bg-emerald-500/20 border-2 border-emerald-400 px-2 py-0.5 rounded text-[10px] text-emerald-300 font-bold animate-pulse flex items-center gap-0.5">
        [Slot: neon hair] ✏️
      </span>
      <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-300">
        detailed illustration
      </span>
    </div>
  </div>
)

export const RarityIllustration: React.FC = () => (
  <div className="w-full h-32 bg-slate-900/50 rounded-lg flex items-center justify-center border border-slate-700/50 p-4 gap-2">
    <div className="flex gap-2">
      <span className="opacity-40 scale-90 border border-slate-700 bg-slate-800 text-[10px] font-bold px-2.5 py-1 rounded">
        Common
      </span>
      <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-lg shadow-cyan-500/30 animate-bounce ring-2 ring-cyan-300 flex items-center gap-1">
        <Gem className="w-3 h-3 text-cyan-200" /> Rare
      </span>
      <span className="opacity-40 scale-90 border border-purple-900/50 bg-purple-950/30 text-purple-400 text-[10px] font-bold px-2.5 py-1 rounded">
        Epic
      </span>
    </div>
  </div>
)

export const ClickCardIllustration: React.FC = () => (
  <div className="relative w-full h-32 bg-slate-900/50 rounded-lg flex flex-col items-center justify-end border border-slate-700/50 p-2 overflow-hidden">
    <div className="w-16 h-20 bg-gradient-to-b from-slate-800 to-slate-950 border border-rose-500/50 rounded p-1 shadow-lg flex flex-col justify-between absolute top-2 animate-pulse cursor-pointer">
      <div className="w-full h-8 bg-slate-700 rounded-sm"></div>
      <div className="text-[7px] text-center text-rose-400 font-bold">
        Click Card
      </div>
    </div>
    <div className="w-full bg-slate-950/80 border border-slate-800 rounded p-1.5 flex gap-2 justify-center z-10">
      <div className="w-10 h-6 bg-rose-500/10 border border-rose-500/40 rounded flex items-center justify-center">
        <span className="text-[8px] text-rose-400 font-bold">Active Card</span>
      </div>
      <div className="w-10 h-6 bg-slate-800 border border-slate-700 rounded flex items-center justify-center">
        <span className="text-[8px] text-slate-500">+</span>
      </div>
    </div>
  </div>
)

export const WorkbenchEditorIllustration: React.FC = () => (
  <div className="w-full h-32 bg-slate-900/50 rounded-lg flex flex-col items-center justify-center border border-slate-700/50 p-4 gap-2">
    <div className="w-full max-w-[240px] bg-slate-800 border border-indigo-500/30 rounded p-2 flex flex-col gap-1.5 shadow-md">
      <div className="flex justify-between items-center border-b border-slate-700 pb-1">
        <span className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
          <Hammer className="w-3 h-3 text-indigo-400" /> Workbench Editor
        </span>
        <span className="text-[8px] bg-indigo-500/20 text-indigo-400 font-mono px-1 rounded">
          Active
        </span>
      </div>
      <div className="flex items-center gap-1 bg-slate-900/60 p-1.5 rounded border border-slate-700">
        <span className="text-[9px] text-slate-400">Hair Color:</span>
        <span className="text-[9px] text-white font-bold bg-indigo-500/20 border border-indigo-500/50 px-1.5 py-0.5 rounded animate-pulse">
          neon cyan ✏️
        </span>
      </div>
    </div>
  </div>
)

const getStep1 = (t: any): Step => ({
  title: t.onboarding.steps[0].title,
  description: t.onboarding.steps[0].description,
  icon: <Move className="w-6 h-6 text-blue-400" />,
  color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30",
  illustration: <MoveIllustration />
})

const getStep2 = (t: any): Step => ({
  title: t.onboarding.steps[1].title,
  description: t.onboarding.steps[1].description,
  icon: <Zap className="w-6 h-6 text-amber-400" />,
  color: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
  illustration: <MintIllustration />
})

const getStep3 = (t: any): Step => ({
  title: t.onboarding.steps[2].title,
  description: t.onboarding.steps[2].description,
  icon: <Type className="w-6 h-6 text-purple-400" />,
  color: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
  illustration: <TitleIllustration />
})

const getStep4 = (t: any): Step => ({
  title: t.onboarding.steps[3].title,
  description: t.onboarding.steps[3].description,
  icon: <Layers className="w-6 h-6 text-emerald-400" />,
  color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
  illustration: <BubblesIllustration />
})

const getStep5 = (t: any): Step => ({
  title: t.onboarding.steps[4].title,
  description: t.onboarding.steps[4].description,
  icon: <Gem className="w-6 h-6 text-cyan-400" />,
  color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
  illustration: <RarityIllustration />
})

const getStep6 = (t: any): Step => ({
  title: t.onboarding.steps[5].title,
  description: t.onboarding.steps[5].description,
  icon: <MousePointerClick className="w-6 h-6 text-rose-400" />,
  color: "from-rose-500/20 to-red-500/20 border-rose-500/30",
  illustration: <ClickCardIllustration />
})

const getStep7 = (t: any): Step => ({
  title: t.onboarding.steps[6].title,
  description: t.onboarding.steps[6].description,
  icon: <Hammer className="w-6 h-6 text-indigo-400" />,
  color: "from-indigo-500/20 to-violet-500/20 border-indigo-500/30",
  illustration: <WorkbenchEditorIllustration />
})

export function getSteps(t: any): Step[] {
  return [
    getStep1(t),
    getStep2(t),
    getStep3(t),
    getStep4(t),
    getStep5(t),
    getStep6(t),
    getStep7(t)
  ]
}
