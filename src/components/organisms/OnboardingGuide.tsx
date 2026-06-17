import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react"
import React, { useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { getSteps } from "./OnboardingGuideComponents"

interface OnboardingGuideProps {
  isOpen: boolean
  onClose: () => void
}

interface HeaderProps {
  currentStep: number
  totalSteps: number
  onClose: () => void
  t: any
}

const OnboardingHeader = ({
  currentStep,
  totalSteps,
  onClose,
  t
}: HeaderProps) => (
  <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/40">
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {t.onboarding.quickGuide} ({currentStep + 1} / {totalSteps})
      </span>
    </div>
    <button
      onClick={onClose}
      className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all"
      aria-label="Close Guide">
      <X className="w-4 h-4" />
    </button>
  </div>
)

interface ContentProps {
  step: any
  currentStep: number
  totalSteps: number
  setCurrentStep: (step: number) => void
}

const OnboardingContent = ({
  step,
  currentStep,
  totalSteps,
  setCurrentStep
}: ContentProps) => (
  <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
    {/* Main Card Graphic */}
    <div
      className={`p-4 rounded-xl border bg-gradient-to-br ${step.color} flex flex-col gap-3 transition-all duration-300 shadow-inner`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-900/80 border border-slate-700/50 rounded-lg shadow-md">
          {step.icon}
        </div>
        <h3 className="text-sm font-bold text-white tracking-wide">
          {step.title}
        </h3>
      </div>

      {step.illustration}
    </div>

    {/* Text Description */}
    <div className="min-h-[72px]">
      <p className="text-xs text-slate-300 leading-relaxed font-sans text-center px-2">
        {step.description}
      </p>
    </div>

    {/* Dots Indicator */}
    <div className="flex justify-center gap-1.5 my-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <button
          key={index}
          onClick={() => setCurrentStep(index)}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            index === currentStep
              ? "w-5 bg-blue-500"
              : "w-1.5 bg-slate-700 hover:bg-slate-600"
          }`}
          aria-label={`Go to step ${index + 1}`}
        />
      ))}
    </div>
  </div>
)

interface FooterProps {
  currentStep: number
  totalSteps: number
  handlePrev: () => void
  handleNext: () => void
  t: any
}

const OnboardingFooter = ({
  currentStep,
  totalSteps,
  handlePrev,
  handleNext,
  t
}: FooterProps) => (
  <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex justify-between gap-3">
    <button
      onClick={handlePrev}
      disabled={currentStep === 0}
      className={`flex items-center justify-center gap-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
        currentStep === 0
          ? "border-slate-800 text-slate-600 cursor-not-allowed"
          : "border-slate-800 text-slate-300 bg-slate-900 hover:bg-slate-800 hover:border-slate-700"
      }`}>
      <ChevronLeft className="w-4 h-4" /> {t.onboarding.back}
    </button>
    <button
      onClick={handleNext}
      className="flex-1 flex items-center justify-center gap-1 py-2 px-4 text-xs font-bold text-white rounded-lg bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-900/30 transition-all">
      {currentStep === totalSteps - 1 ? (
        <React.Fragment>
          {t.onboarding.letsStart} <Sparkles className="w-3.5 h-3.5 ml-1" />
        </React.Fragment>
      ) : (
        <React.Fragment>
          {t.onboarding.next} <ChevronRight className="w-4 h-4 ml-0.5" />
        </React.Fragment>
      )}
    </button>
  </div>
)

export function OnboardingGuide({ isOpen, onClose }: OnboardingGuideProps) {
  const { t } = useLanguage()
  const [currentStep, setCurrentStep] = useState(0)

  if (!isOpen) return null

  const steps = getSteps(t)
  const handleNext = () =>
    currentStep < steps.length - 1 ? setCurrentStep(currentStep + 1) : onClose()
  const handlePrev = () => currentStep > 0 && setCurrentStep(currentStep - 1)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-slate-950/80 backdrop-blur-sm p-4 font-sans select-none animate-in fade-in duration-200"
      data-testid="onboarding-modal">
      <div className="w-full max-w-sm max-h-[calc(100vh-2rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 animate-in zoom-in-95 duration-200">
        <OnboardingHeader
          currentStep={currentStep}
          totalSteps={steps.length}
          onClose={onClose}
          t={t}
        />
        <OnboardingContent
          step={steps[currentStep]}
          currentStep={currentStep}
          totalSteps={steps.length}
          setCurrentStep={setCurrentStep}
        />
        <OnboardingFooter
          currentStep={currentStep}
          totalSteps={steps.length}
          handlePrev={handlePrev}
          handleNext={handleNext}
          t={t}
        />
      </div>
    </div>
  )
}
