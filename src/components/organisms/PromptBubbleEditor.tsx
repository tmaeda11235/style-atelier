import React from "react"

import { usePromptBubbleEditorState } from "../../hooks/usePromptBubbleEditorState"
import type { PromptSegment } from "../../lib/db-schema"
import type { RarityTier } from "../../lib/rarity-config"
import { PromptBubble } from "../molecules/PromptBubble"
import { AiDeclutterControl } from "./PromptDeclutterControls"

interface PromptBubbleEditorProps {
  initialSegments: PromptSegment[]
  onChange?: (segments: PromptSegment[]) => void
  tier?: RarityTier
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

interface EditorInputProps {
  inputRef: React.RefObject<HTMLInputElement>
  inputValue: string
  onChange: (val: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onBlur: () => void
  showPlaceholder: boolean
}

function EditorInput({
  inputRef,
  inputValue,
  onChange,
  onKeyDown,
  onBlur,
  showPlaceholder
}: EditorInputProps) {
  return (
    <input
      ref={inputRef}
      type="text"
      className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm py-1 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
      placeholder={showPlaceholder ? "Type something or select cards..." : ""}
      value={inputValue}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    />
  )
}

interface PromptBubblesListProps {
  segments: PromptSegment[]
  removeSegment: (idx: number) => void
  toggleSegmentType: (idx: number) => void
  expertFeatures: { slot?: boolean }
  tier?: RarityTier
}

function PromptBubblesList({
  segments,
  removeSegment,
  toggleSegmentType,
  expertFeatures,
  tier
}: PromptBubblesListProps) {
  return (
    <>
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
    </>
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
        <PromptBubblesList
          segments={segments}
          removeSegment={removeSegment}
          toggleSegmentType={toggleSegmentType}
          expertFeatures={expertFeatures}
          tier={tier}
        />
        <EditorInput
          inputRef={inputRef}
          inputValue={inputValue}
          onChange={setInputValue}
          onKeyDown={handleKeyDown}
          onBlur={() => addToken(inputValue)}
          showPlaceholder={initialSegments.length === 0}
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
