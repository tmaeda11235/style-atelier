import React, { useState } from "react"
import {
  X,
  ChevronRight,
  ChevronLeft,
  Move,
  Zap,
  Type,
  Layers,
  Gem,
  MousePointerClick,
  Hammer,
  Sparkles
} from "lucide-react"

interface OnboardingGuideProps {
  isOpen: boolean
  onClose: () => void
}

interface Step {
  title: string
  description: string
  icon: React.ReactNode
  color: string
  illustration: React.ReactNode
}

export function OnboardingGuide({ isOpen, onClose }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)

  if (!isOpen) return null

  const steps: Step[] = [
    {
      title: "1. History to Panel",
      description: "Drag and drop any generated image from Midjourney directly into the History tab of the Side Panel to import it.",
      icon: <Move className="w-6 h-6 text-blue-400" />,
      color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30",
      illustration: (
        <div className="relative w-full h-32 bg-slate-900/50 rounded-lg flex items-center justify-center border border-slate-700/50 overflow-hidden">
          <div className="absolute top-2 left-2 text-[10px] text-slate-500 font-mono">Midjourney Web UI</div>
          <div className="absolute top-2 right-2 text-[10px] text-slate-500 font-mono">Side Panel</div>
          <div className="w-16 h-16 bg-slate-800 rounded border border-slate-700 flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-xl">🖼️</span>
          </div>
          <div className="mx-4 flex items-center justify-center text-slate-400 animate-bounce">
            <ChevronRight className="w-8 h-8 text-blue-400" />
          </div>
          <div className="w-20 h-20 bg-slate-800/80 rounded border-2 border-dashed border-blue-500/50 flex flex-col items-center justify-center p-1">
            <div className="w-full h-full bg-blue-500/10 rounded flex items-center justify-center">
              <span className="text-xs text-blue-400 font-bold font-sans">Drop Here</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "2. Mint Your Card",
      description: "Click the 'Mint' button on the imported history item to start crafting your custom Style Card.",
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      color: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
      illustration: (
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
    },
    {
      title: "3. Name Your Creation",
      description: "Enter a descriptive and unique title for your new card. This helps you identify and search for it later in your Library.",
      icon: <Type className="w-6 h-6 text-purple-400" />,
      color: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
      illustration: (
        <div className="w-full h-32 bg-slate-900/50 rounded-lg flex flex-col items-center justify-center border border-slate-700/50 p-4 gap-2">
          <label className="text-xs text-purple-300 font-bold self-start pl-4">Card Name</label>
          <div className="relative w-full max-w-[220px]">
            <input
              type="text"
              readOnly
              value="Neon Cyberpunk Samurai"
              className="w-full bg-slate-800 border border-purple-500/50 rounded px-3 py-1.5 text-xs text-white shadow-inner focus:outline-none"
            />
            <span className="absolute right-2 top-2 text-[10px] text-purple-400 font-bold animate-pulse">Title</span>
          </div>
        </div>
      )
    },
    {
      title: "4. Parameter Slotting",
      description: "Select specific segments of your prompt text to convert them into editable 'Slots' (variables).",
      icon: <Layers className="w-6 h-6 text-emerald-400" />,
      color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
      illustration: (
        <div className="w-full h-32 bg-slate-900/50 rounded-lg flex flex-col items-center justify-center border border-slate-700/50 p-3 gap-2">
          <div className="text-[10px] text-slate-400 font-bold self-start">Prompt Bubbles</div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-300">A samurai</span>
            <span className="bg-emerald-500/20 border-2 border-emerald-400 px-2 py-0.5 rounded text-[10px] text-emerald-300 font-bold animate-pulse flex items-center gap-0.5">
              [Slot: neon hair] ✏️
            </span>
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-300">detailed illustration</span>
          </div>
        </div>
      )
    },
    {
      title: "5. Choose Rarity",
      description: "Assign a rarity tier to your card. Premium rarities feature stunning visual designs and holographic frames in the Library.",
      icon: <Gem className="w-6 h-6 text-cyan-400" />,
      color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
      illustration: (
        <div className="w-full h-32 bg-slate-900/50 rounded-lg flex items-center justify-center border border-slate-700/50 p-4 gap-2">
          <div className="flex gap-2">
            <span className="opacity-40 scale-90 border border-slate-700 bg-slate-800 text-[10px] font-bold px-2.5 py-1 rounded">Common</span>
            <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-lg shadow-cyan-500/30 animate-bounce ring-2 ring-cyan-300 flex items-center gap-1">
              <Gem className="w-3 h-3 text-cyan-200" /> Rare
            </span>
            <span className="opacity-40 scale-90 border border-purple-900/50 bg-purple-950/30 text-purple-400 text-[10px] font-bold px-2.5 py-1 rounded">Epic</span>
          </div>
        </div>
      )
    },
    {
      title: "6. Add to Your Hand",
      description: "Simply click any Style Card in your Library. It will instantly move to your HandBar at the bottom of the screen.",
      icon: <MousePointerClick className="w-6 h-6 text-rose-400" />,
      color: "from-rose-500/20 to-red-500/20 border-rose-500/30",
      illustration: (
        <div className="relative w-full h-32 bg-slate-900/50 rounded-lg flex flex-col items-center justify-end border border-slate-700/50 p-2 overflow-hidden">
          <div className="w-16 h-20 bg-gradient-to-b from-slate-800 to-slate-950 border border-rose-500/50 rounded p-1 shadow-lg flex flex-col justify-between absolute top-2 animate-pulse cursor-pointer">
            <div className="w-full h-8 bg-slate-700 rounded-sm"></div>
            <div className="text-[7px] text-center text-rose-400 font-bold">Click Card</div>
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
    },
    {
      title: "7. Edit in Workbench",
      description: "Navigate to the Workbench tab to customize the variables of your cards, combine different styles, and generate final prompt strings.",
      icon: <Hammer className="w-6 h-6 text-indigo-400" />,
      color: "from-indigo-500/20 to-violet-500/20 border-indigo-500/30",
      illustration: (
        <div className="w-full h-32 bg-slate-900/50 rounded-lg flex flex-col items-center justify-center border border-slate-700/50 p-4 gap-2">
          <div className="w-full max-w-[240px] bg-slate-800 border border-indigo-500/30 rounded p-2 flex flex-col gap-1.5 shadow-md">
            <div className="flex justify-between items-center border-b border-slate-700 pb-1">
              <span className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
                <Hammer className="w-3 h-3 text-indigo-400" /> Workbench Editor
              </span>
              <span className="text-[8px] bg-indigo-500/20 text-indigo-400 font-mono px-1 rounded">Active</span>
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
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-sans select-none animate-in fade-in duration-200"
      data-testid="onboarding-modal"
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Quick Guide ({currentStep + 1} / {steps.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all"
            aria-label="Close Guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col gap-4">
          {/* Main Card Graphic */}
          <div className={`p-4 rounded-xl border bg-gradient-to-br ${steps[currentStep].color} flex flex-col gap-3 transition-all duration-300 shadow-inner`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900/80 border border-slate-700/50 rounded-lg shadow-md">
                {steps[currentStep].icon}
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                {steps[currentStep].title}
              </h3>
            </div>
            
            {steps[currentStep].illustration}
          </div>

          {/* Text Description */}
          <div className="min-h-[72px]">
            <p className="text-xs text-slate-300 leading-relaxed font-sans text-center px-2">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-1.5 my-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep ? "w-5 bg-blue-500" : "w-1.5 bg-slate-700 hover:bg-slate-600"
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex justify-between gap-3">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center justify-center gap-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
              currentStep === 0
                ? "border-slate-800 text-slate-600 cursor-not-allowed"
                : "border-slate-800 text-slate-300 bg-slate-900 hover:bg-slate-800 hover:border-slate-700"
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-1 py-2 px-4 text-xs font-bold text-white rounded-lg bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-900/30 transition-all"
          >
            {currentStep === steps.length - 1 ? (
              <>Let's Start! <Sparkles className="w-3.5 h-3.5 ml-1" /></>
            ) : (
              <>Next <ChevronRight className="w-4 h-4 ml-0.5" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
