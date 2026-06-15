import { AlertCircle, Download, RefreshCw, Sparkles } from "lucide-react"
import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useAiPromptDeclutter } from "../../hooks/useAiPromptDeclutter"
import { usePromptBubbleEditorState } from "../../hooks/usePromptBubbleEditorState"
import type { PromptSegment } from "../../lib/db-schema"
import type { RarityTier } from "../../lib/rarity-config"
import { AiStatusBadge } from "../atoms/AiStatusBadge"
import { PromptBubble } from "../molecules/PromptBubble"

interface PromptBubbleEditorProps {
  initialSegments: PromptSegment[]
  onChange?: (segments: PromptSegment[]) => void
  tier?: RarityTier
}

interface AiDeclutterProps {
  segments: PromptSegment[]
  setSegments: (segs: PromptSegment[]) => void
  inputValue: string
  setInputValue: (val: string) => void
  onChange?: (segments: PromptSegment[]) => void
}

interface ActionAreaProps {
  status: string
  progress: number
  loading: boolean
  onDeclutter: () => void
  onDownload: () => void
  t: Record<string, any>
}

function DeclutterStatusLabel() {
  return (
    <div className="flex items-center gap-2">
      <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
        <span>AI Prompt Organizer</span>
      </div>
      <AiStatusBadge />
    </div>
  )
}

function ActionProgress({
  progress,
  label
}: {
  progress: number
  label: string
}) {
  return (
    <div className="flex flex-col items-end gap-1 w-[110px]">
      <span className="text-[8px] text-slate-500 dark:text-slate-400 font-bold truncate max-w-full">
        {label.replace("{{progress}}", String(Math.round(progress)))}
      </span>
      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
        <div
          className="bg-indigo-600 dark:bg-indigo-500 h-1 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function ActionDownloadButton({
  onClick,
  label
}: {
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-0.5 text-[9px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md font-bold transition-all duration-150 flex items-center gap-1 cursor-pointer">
      <Download className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" />
      {label}
    </button>
  )
}

function ActionErrorButton({
  onClick,
  label
}: {
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-0.5 text-[9px] bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md font-bold transition-all duration-150 flex items-center gap-1 cursor-pointer">
      <AlertCircle className="w-2.5 h-2.5 text-red-500" />
      {label}
    </button>
  )
}

function DeclutterActionArea({
  status,
  progress,
  loading,
  onDeclutter,
  onDownload,
  t
}: ActionAreaProps) {
  return (
    <div className="flex items-center gap-1.5">
      {status === "idle" && (
        <ActionDownloadButton
          onClick={onDownload}
          label={t.minting.aiDeclutterDownload || "Download AI"}
        />
      )}
      {(status === "checking" ||
        status === "downloading" ||
        status === "verifying") && (
        <ActionProgress
          progress={progress}
          label={
            t.minting.aiDeclutterDownloading || "Downloading {{progress}}%"
          }
        />
      )}
      {status === "error" && (
        <ActionErrorButton
          onClick={onDownload}
          label={t.minting.aiDeclutterError || "Try Again"}
        />
      )}
      {status === "insufficient-quota" && (
        <span className="text-red-500 font-bold flex items-center gap-1 text-[9px]">
          <AlertCircle className="w-2.5 h-2.5" />
          Insufficient Space (1.5GB required)
        </span>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={onDeclutter}
        className={`px-2 py-0.5 text-[10px] text-white rounded-md shadow-sm font-bold transition-all duration-150 flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
          status === "ready"
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            : "bg-slate-500 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500"
        }`}>
        {loading ? (
          <>
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            {status === "ready"
              ? t.minting.aiDecluttering
              : t.minting.aiDecluttering || "Organizing..."}
          </>
        ) : (
          <>
            <Sparkles className="w-2.5 h-2.5" />
            {status === "ready"
              ? t.minting.aiDeclutter
              : t.minting.aiDeclutterFallback || "Organize (Fallback)"}
          </>
        )}
      </button>
    </div>
  )
}

function getCombinedText(
  segments: PromptSegment[],
  inputValue: string
): string {
  const textVals = segments
    .map((s) =>
      s.type === "text" ? s.value : s.type === "slot" ? s.label : ""
    )
    .filter(Boolean)
  if (inputValue.trim()) {
    textVals.push(inputValue.trim())
  }
  return textVals.join(", ")
}

function AiDeclutterControl({
  segments,
  setSegments,
  inputValue,
  setInputValue,
  onChange
}: AiDeclutterProps) {
  const { t } = useLanguage()
  const { status, progress, startDownload, loading, error, declutterPrompt } =
    useAiPromptDeclutter()

  const handleDeclutter = async () => {
    const combinedText = getCombinedText(segments, inputValue)
    if (!combinedText) return

    const decluttered = await declutterPrompt(combinedText)
    if (decluttered) {
      setSegments(decluttered)
      setInputValue("")
      if (onChange) onChange(decluttered)
    }
  }

  return (
    <div className="mt-2.5 flex flex-col gap-1 text-[11px] border-t border-slate-100 dark:border-slate-800 pt-2 font-sans select-none">
      <div className="flex items-center justify-between min-h-[28px]">
        <DeclutterStatusLabel />
        <DeclutterActionArea
          status={status}
          progress={progress}
          loading={loading}
          onDeclutter={handleDeclutter}
          onDownload={startDownload}
          t={t}
        />
      </div>
      {error && (
        <span className="text-[10px] text-red-500 font-semibold mt-1">
          Error: {error}
        </span>
      )}
    </div>
  )
}

interface EditorContainerProps {
  children: React.ReactNode
  onClick: () => void
}

function EditorContainer({ children, onClick }: EditorContainerProps) {
  return (
    <div
      className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg min-h-[100px] cursor-text items-start content-start transition-colors focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-400"
      onClick={onClick}>
      {children}
    </div>
  )
}

export const PromptBubbleEditor: React.FC<PromptBubbleEditorProps> = ({
  initialSegments = [],
  onChange,
  tier
}) => {
  const {
    segments,
    setSegments,
    inputValue,
    setInputValue,
    inputRef,
    addToken,
    removeSegment,
    toggleSegmentType,
    handleKeyDown,
    expertFeatures
  } = usePromptBubbleEditorState({ initialSegments, onChange })

  return (
    <div className="flex flex-col w-full font-sans">
      <EditorContainer onClick={() => inputRef.current?.focus()}>
        {segments.map((segment, index) => (
          <PromptBubble
            key={`${index}-${segment.type === "text" ? segment.value : segment.type === "slot" ? segment.label : segment.kind}`}
            segment={segment}
            onRemove={() => removeSegment(index)}
            onClick={
              segment.type !== "chip" &&
              (segment.type !== "text" || expertFeatures.slot)
                ? () => toggleSegmentType(index)
                : undefined
            }
            tier={segment.type === "text" ? undefined : tier}
            enableSlotAction={expertFeatures.slot}
          />
        ))}
        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm py-1 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          placeholder={
            initialSegments.length === 0
              ? "Type something or select cards..."
              : ""
          }
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addToken(inputValue)}
        />
      </EditorContainer>
      <AiDeclutterControl
        segments={segments}
        setSegments={setSegments}
        inputValue={inputValue}
        setInputValue={setInputValue}
        onChange={onChange}
      />
    </div>
  )
}
