import { Send, Sparkles } from "lucide-react"
import React from "react"

import type { PromptSegment, StyleCard } from "../../lib/db-schema"
import { Button } from "../atoms/Button"
import { HelpTooltip } from "../atoms/HelpTooltip"
import { RarityBadge } from "../atoms/RarityBadge"
import { PromptBubble } from "../molecules/PromptBubble"
import { ParameterEditor } from "./ParameterEditor"
import { PromptBubbleEditor } from "./PromptBubbleEditor"

interface RecipeHeaderProps {
  isEvolutionMode: boolean
  isMixingMode: boolean
  targetCard: StyleCard | undefined
  t: any
  i18n: any
}

const RecipeHeader: React.FC<RecipeHeaderProps> = ({
  isEvolutionMode,
  isMixingMode,
  targetCard,
  t,
  i18n
}) => (
  <div className="flex items-center justify-between">
    <h3 className="flex items-center gap-1 text-sm font-bold text-slate-700">
      {isEvolutionMode ? t.evolution : t.variationRecipe}
      {isMixingMode && (
        <HelpTooltip
          content={i18n.helpTooltips.multiCard}
          position="bottom-left"
        />
      )}
    </h3>
    {isEvolutionMode && targetCard && <RarityBadge tier={targetCard.tier} />}
  </div>
)

interface PromptSegmentSectionProps {
  expertFeatures: any
  editedSegments: PromptSegment[]
  setEditedSegments: (seg: PromptSegment[]) => void
  isEvolutionMode: boolean
  targetCard: StyleCard | undefined
  t: any
  i18n: any
}

const PromptSegmentSection: React.FC<PromptSegmentSectionProps> = ({
  expertFeatures,
  editedSegments,
  setEditedSegments,
  isEvolutionMode,
  targetCard,
  t,
  i18n
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-500">
        {t.promptSegments}
      </span>
      {expertFeatures.cardEditing && (
        <HelpTooltip
          content={i18n.helpTooltips.cardEditing}
          position="bottom-left"
        />
      )}
    </div>
    <div className="bg-white">
      {expertFeatures.cardEditing ? (
        <PromptBubbleEditor
          initialSegments={editedSegments}
          onChange={setEditedSegments}
          tier={isEvolutionMode ? targetCard?.tier : "Common"}
        />
      ) : (
        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg min-h-[50px] items-start content-start">
          {editedSegments.map((segment, index) => (
            <PromptBubble
              key={index}
              segment={segment}
              tier={
                segment.type === "text"
                  ? undefined
                  : isEvolutionMode
                    ? targetCard?.tier
                    : "Common"
              }
            />
          ))}
        </div>
      )}
    </div>
  </div>
)

interface ParameterDisplaySectionProps {
  expertFeatures: any
  editedParams: any
  setEditedParams: (p: any) => void
  hasParams: boolean
  t: any
}

const ParameterItem: React.FC<{ label: string; value: string | string[] }> = ({
  label,
  value
}) => {
  const displayVal = Array.isArray(value) ? value.join(", ") : value
  return displayVal && displayVal.length > 0 ? (
    <div>
      <span className="font-bold text-slate-500">{label}</span> {displayVal}
    </div>
  ) : null
}

const ParameterDisplaySection: React.FC<ParameterDisplaySectionProps> = ({
  expertFeatures,
  editedParams,
  setEditedParams,
  hasParams,
  t
}) => {
  if (expertFeatures.cardEditing) {
    return (
      <ParameterEditor parameters={editedParams} onChange={setEditedParams} />
    )
  }

  return (
    <div className="space-y-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-xs">
      <ParameterItem label={t.aspectRatio} value={editedParams.ar} />
      <ParameterItem label={t.personalization} value={editedParams.p} />
      <ParameterItem label={t.imagePrompts} value={editedParams.imagePrompts} />
      <ParameterItem label={t.styleReference} value={editedParams.sref} />
      <ParameterItem label={t.characterReference} value={editedParams.cref} />
      {!hasParams && (
        <div className="text-slate-400 italic">{t.noParameters}</div>
      )}
    </div>
  )
}

interface ActionButtonSectionProps {
  isEvolutionMode: boolean
  isMixingMode: boolean
  targetCard: StyleCard | undefined
  canEvolveTarget: boolean | undefined
  expertFeatures: any
  handleEvolve: () => Promise<void>
  handleMintVariation: () => void
  handleInjectPrompt: () => void
  isInjecting: boolean
  t: any
}

const ActionButtonSection: React.FC<ActionButtonSectionProps> = ({
  isEvolutionMode,
  isMixingMode,
  targetCard,
  canEvolveTarget,
  expertFeatures,
  handleEvolve,
  handleMintVariation,
  handleInjectPrompt,
  isInjecting,
  t
}) => (
  <div className="space-y-2 pt-2">
    {isEvolutionMode && targetCard && expertFeatures.stack && (
      <div className="border-t border-slate-100 pt-2">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="text-slate-500">{t.usageProgress}</span>
          <span className="font-mono font-bold text-blue-600">
            {targetCard.usageCount} {t.uses}
          </span>
        </div>
        {canEvolveTarget ? (
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
            onClick={handleEvolve}>
            <Sparkles className="w-4 h-4 mr-2" /> {t.evolveBtn}
          </Button>
        ) : (
          <p className="text-[10px] text-slate-400 italic text-center">
            {t.evolveNeedMore}
          </p>
        )}
      </div>
    )}

    {isMixingMode && expertFeatures.stack && (
      <Button
        className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md mb-2"
        onClick={handleMintVariation}>
        <Sparkles className="w-4 h-4 mr-2" /> {t.mintBlended}
      </Button>
    )}

    <Button
      className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200"
      onClick={handleInjectPrompt}
      disabled={isInjecting}>
      <Send className="w-4 h-4 mr-2" />
      {isInjecting ? t.injecting : t.tryOnMidjourney}
    </Button>
  </div>
)

export interface RecipeFormProps {
  isEvolutionMode: boolean
  isMixingMode: boolean
  targetCard: StyleCard | undefined
  canEvolveTarget: boolean | undefined
  t: any
  i18n: any
  expertFeatures: any
  editedSegments: PromptSegment[]
  setEditedSegments: (seg: PromptSegment[]) => void
  editedParams: any
  setEditedParams: (p: any) => void
  hasParams: boolean
  handleEvolve: () => Promise<void>
  handleMintVariation: () => void
  handleInjectPrompt: () => void
  isInjecting: boolean
}

export const RecipeForm: React.FC<RecipeFormProps> = (props) => (
  <>
    <RecipeHeader
      isEvolutionMode={props.isEvolutionMode}
      isMixingMode={props.isMixingMode}
      targetCard={props.targetCard}
      t={props.t}
      i18n={props.i18n}
    />
    <PromptSegmentSection
      expertFeatures={props.expertFeatures}
      editedSegments={props.editedSegments}
      setEditedSegments={props.setEditedSegments}
      isEvolutionMode={props.isEvolutionMode}
      targetCard={props.targetCard}
      t={props.t}
      i18n={props.i18n}
    />
    <ParameterDisplaySection
      expertFeatures={props.expertFeatures}
      editedParams={props.editedParams}
      setEditedParams={props.setEditedParams}
      hasParams={props.hasParams}
      t={props.t}
    />
    <ActionButtonSection
      isEvolutionMode={props.isEvolutionMode}
      isMixingMode={props.isMixingMode}
      targetCard={props.targetCard}
      canEvolveTarget={props.canEvolveTarget}
      expertFeatures={props.expertFeatures}
      handleEvolve={props.handleEvolve}
      handleMintVariation={props.handleMintVariation}
      handleInjectPrompt={props.handleInjectPrompt}
      isInjecting={props.isInjecting}
      t={props.t}
    />
  </>
)
