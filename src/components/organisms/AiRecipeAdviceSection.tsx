import { ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import React, { useState } from "react"

import { useAiRecipeAdvice } from "../../hooks/useAiRecipeAdvice"
import { useWebLlm } from "../../hooks/useWebLlm"
import { AdviceSectionContent } from "../molecules/AiRecipeAdviceOverlay"

export interface AiRecipeAdviceSectionProps {
  cards: any[]
  t: any
}

interface AdviceSectionHeaderProps {
  isOpen: boolean
  onClick: () => void
  t: any
}

function AdviceSectionHeader({ isOpen, onClick, t }: AdviceSectionHeaderProps) {
  return (
    <button
      id="ai-recipe-advice-toggle"
      data-testid="ai-recipe-advice-toggle"
      onClick={onClick}
      className="w-full flex items-center justify-between p-2.5 text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-950/40 transition-colors duration-200 cursor-pointer"
      type="button">
      <span className="flex items-center gap-1.5 font-sans">
        <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
        {t.aiAdviceTitle || "🔮 AI Recipe Advice"}
      </span>
      {isOpen ? (
        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      )}
    </button>
  )
}

export const AiRecipeAdviceSection: React.FC<AiRecipeAdviceSectionProps> = ({
  cards,
  t
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const { advice, loading, error, isModelReady, status, isEngineInitializing } =
    useAiRecipeAdvice(cards)
  const llm = useWebLlm()

  if (cards.length < 2) return null

  return (
    <div
      className="border border-slate-200 dark:border-indigo-950 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl overflow-hidden transition-all duration-300"
      id="ai-recipe-advice-section"
      data-testid="ai-recipe-advice-section">
      <AdviceSectionHeader
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        t={t}
      />

      {isOpen && (
        <div className="p-3 border-t border-slate-200 dark:border-indigo-950 bg-white/40 dark:bg-slate-950/40 text-[11px] leading-relaxed font-sans text-slate-700 dark:text-slate-300">
          <AdviceSectionContent
            isModelReady={isModelReady}
            isEngineInitializing={isEngineInitializing}
            status={status}
            progress={llm.progress}
            speed={llm.speed}
            eta={llm.eta}
            retryCount={llm.retryCount}
            maxRetries={llm.maxRetries}
            text={llm.text}
            webLlmError={llm.error}
            startDownload={llm.startDownload}
            loading={loading}
            error={error}
            advice={advice}
            t={t}
          />
        </div>
      )}
    </div>
  )
}
