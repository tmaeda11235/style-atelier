import { AlertCircle, ArrowRight, Sparkles, Tags } from "lucide-react"
import React, { useEffect } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useAiMetadataGenerator } from "../../hooks/useAiMetadataGenerator"
import { Button } from "../atoms/Button"
import { AiDownloadStatus } from "../molecules/AiDownloadStatus"

interface AiStyleAnalysisSectionProps {
  promptText: string
  customTags: string[]
  setCustomTags: (tags: string[]) => void
  setCustomName: (name: string) => void
  setMutationNote?: (note: string) => void
}

interface GenreBadgeProps {
  genre: string
}

function GenreBadge({ genre }: GenreBadgeProps) {
  if (!genre) return null
  return (
    <div className="flex items-center gap-2 bg-indigo-50/50 border border-indigo-100/50 dark:bg-indigo-950/30 dark:border-indigo-900/30 p-2.5 rounded-lg">
      <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
        Genre:
      </span>
      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
        {genre}
      </span>
    </div>
  )
}

interface RecommendTagsProps {
  tags: string[]
  customTags: string[]
  onToggle: (tag: string) => void
  t: any
}

function RecommendTags({ tags, customTags, onToggle, t }: RecommendTagsProps) {
  if (!tags || tags.length === 0) return null
  return (
    <div>
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
        <Tags className="w-3.5 h-3.5" />
        {t.minting.aiRecommendTags}
      </span>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => {
          const normalized = tag.toLowerCase()
          const isSelected = customTags.includes(normalized)
          return (
            <button
              key={i}
              type="button"
              onClick={() => onToggle(tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-200 hover:scale-105 font-medium ${
                isSelected
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-600 shadow-sm shadow-blue-200 dark:shadow-none"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:border-slate-600"
              }`}>
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface SummaryCardProps {
  summary: string
  onApply: () => void
  t: any
}

function SummaryCard({ summary, onApply, t }: SummaryCardProps) {
  if (!summary) return null
  return (
    <div className="bg-slate-50 border border-slate-200/60 dark:bg-slate-950 dark:border-slate-800 p-3 rounded-lg space-y-2">
      <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
        {t.minting.aiSummary}
      </span>
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-100 dark:border-slate-800">
        "{summary}"
      </p>
      <Button
        type="button"
        size="xs"
        variant="outline"
        onClick={onApply}
        className="flex items-center gap-1 border-slate-300 bg-white hover:bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300">
        {t.minting.aiUseSummary}
        <ArrowRight className="w-3 h-3" />
      </Button>
    </div>
  )
}

interface AiAnalysisResultsProps {
  result: { genre: string; tags: string[]; summary: string } | null
  customTags: string[]
  onToggleTag: (tag: string) => void
  onApplySummary: () => void
  t: any
}

function AiAnalysisResults({
  result,
  customTags,
  onToggleTag,
  onApplySummary,
  t
}: AiAnalysisResultsProps) {
  if (!result) return null

  return (
    <div className="space-y-4 pt-2 animate-fade-in">
      <GenreBadge genre={result.genre} />
      <RecommendTags
        tags={result.tags}
        customTags={customTags}
        onToggle={onToggleTag}
        t={t}
      />
      <SummaryCard summary={result.summary} onApply={onApplySummary} t={t} />
    </div>
  )
}

interface AiReadySectionProps {
  promptText: string
  generateMetadata: (prompt: string) => void
  loading: boolean
  error: string | null
  result: any
  customTags: string[]
  handleToggleTag: (tag: string) => void
  handleApplySummary: () => void
  t: any
}

function AiReadySection({
  promptText,
  generateMetadata,
  loading,
  error,
  result,
  customTags,
  handleToggleTag,
  handleApplySummary,
  t
}: AiReadySectionProps) {
  return (
    <div className="space-y-4">
      <Button
        type="button"
        onClick={() => generateMetadata(promptText)}
        disabled={loading}
        className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white flex items-center justify-center gap-2 py-2 shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all font-semibold">
        <Sparkles className="w-4 h-4" />
        {loading ? t.minting.aiAnalysisLoading : t.minting.aiAnalysisBtn}
      </Button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 dark:bg-red-950/30 dark:border-red-900/30 dark:text-red-400 rounded-lg text-red-600 text-xs flex items-start gap-1.5 shadow-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{t.minting.aiAnalysisError.replace("{{error}}", error)}</span>
        </div>
      )}

      <AiAnalysisResults
        result={result}
        customTags={customTags}
        onToggleTag={handleToggleTag}
        onApplySummary={handleApplySummary}
        t={t}
      />
    </div>
  )
}

function useAiHandlers(
  result: any,
  customTags: string[],
  setCustomTags: (tags: string[]) => void,
  setCustomName: (name: string) => void,
  setMutationNote?: (note: string) => void
) {
  useEffect(() => {
    if (result?.summary && setMutationNote) {
      setMutationNote(result.summary)
    }
  }, [result, setMutationNote])

  const handleToggleTag = (tag: string) => {
    const normalized = tag.toLowerCase()
    if (customTags.includes(normalized)) {
      setCustomTags(customTags.filter((t) => t !== normalized))
    } else {
      setCustomTags([...customTags, normalized])
    }
  }

  const handleApplySummary = () => {
    if (result?.summary) {
      setCustomName(result.summary)
    }
  }

  return { handleToggleTag, handleApplySummary }
}

function StyleAnalysisHeader({ t }: { t: any }) {
  return (
    <>
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20 rounded-full blur-2xl -z-10" />
      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
        {t.minting.aiAnalysis}
      </h3>
    </>
  )
}

export function AiStyleAnalysisSection({
  promptText,
  customTags,
  setCustomTags,
  setCustomName,
  setMutationNote
}: AiStyleAnalysisSectionProps) {
  const { t } = useLanguage()
  const gen = useAiMetadataGenerator()
  const { handleToggleTag, handleApplySummary } = useAiHandlers(
    gen.result,
    customTags,
    setCustomTags,
    setCustomName,
    setMutationNote
  )

  const isReady = gen.status === "ready"

  return (
    <div className="p-4 bg-white border border-slate-100 dark:bg-slate-900 dark:border-slate-800/80 rounded-xl shadow-sm space-y-4 relative overflow-hidden">
      <StyleAnalysisHeader t={t} />
      {isReady ? (
        <AiReadySection
          promptText={promptText}
          generateMetadata={gen.generateMetadata}
          loading={gen.loading}
          error={gen.error}
          result={gen.result}
          customTags={customTags}
          handleToggleTag={handleToggleTag}
          handleApplySummary={handleApplySummary}
          t={t}
        />
      ) : (
        <AiDownloadStatus
          status={gen.status}
          progress={gen.progress}
          speed={gen.speed}
          eta={gen.eta}
          retryCount={gen.retryCount}
          maxRetries={gen.maxRetries}
          text={gen.text}
          webLlmError={gen.webLlmError}
          startDownload={gen.startDownload}
          t={t}
        />
      )}
    </div>
  )
}
