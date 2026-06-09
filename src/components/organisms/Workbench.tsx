import { BookUp2, Layers, Send, Sparkles, X } from "lucide-react"
import React, { useEffect, useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useChromeTabConnection } from "../../hooks/useChromeTabConnection"
import { useEvolution } from "../../hooks/useEvolution"
import { usePromptInjector } from "../../hooks/usePromptInjector"
import { useWorkbench } from "../../hooks/useWorkbench"
import type { PromptSegment } from "../../lib/db-schema"
import { buildPromptString, mergePromptSegments } from "../../lib/prompt-utils"
import { Button } from "../atoms/Button"
import { HelpTooltip } from "../atoms/HelpTooltip"
import { RarityBadge } from "../atoms/RarityBadge"
import { CardThumbnail } from "../molecules/CardThumbnail"
import { type AlertType } from "../molecules/ConnectionAlert"
import { PromptBubble } from "../molecules/PromptBubble"
import { EvolutionSuccessModal } from "./EvolutionSuccessModal"
import { MergeStackModal } from "./MergeStackModal"
import { ParameterEditor } from "./ParameterEditor"
import { PromptBubbleEditor } from "./PromptBubbleEditor"
import { SlotVariablesSection } from "./SlotVariablesSection"

/**
 * Props for the Workbench component.
 */
interface WorkbenchProps {
  /** Callback triggered when a variation minting starts */
  onStartVariationMinting?: (base: any) => void
  /** Callback to add log messages */
  addLog?: (msg: string) => void
  /** Callback to set system alert type */
  setAlertType: (type: AlertType | null) => void
}

/**
 * Workbench component acts as the main sandbox where users can blend multiple style cards,
 * evolve rare cards, fill slot variables, and inject prompts directly into Midjourney.
 */
export const Workbench: React.FC<WorkbenchProps> = ({
  onStartVariationMinting,
  addLog,
  setAlertType
}) => {
  const {
    workbenchCards,
    handCards,
    toggleCardSelection,
    clearWorkbench,
    slotHistory,
    saveSlotHistory,
    addCard,
    incrementCardUsage
  } = useWorkbench()
  const { canEvolve, evolveCard } = useEvolution()
  const { expertFeatures } = useSettings()
  const { t: i18n } = useLanguage()
  const t = i18n.workbench

  const [editedSegments, setEditedSegments] = useState<PromptSegment[]>([])
  const [editedParams, setEditedParams] = useState<any>({})
  const [slotValues, setSlotValues] = useState<Record<string, string>>({})
  const [isEvolutionSuccessOpen, setIsEvolutionSuccessOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [evolvedCardData, setEvolvedCardData] = useState<{
    name: string
    thumbnailData?: string
    selectedThumbnails?: string[]
    oldTier: any
    newTier: any
  } | null>(null)

  const hasParams = Object.values(editedParams).some((v) =>
    Array.isArray(v) ? v.length > 0 : !!v
  )

  const isEvolutionMode = workbenchCards.length === 1
  const isMixingMode = workbenchCards.length >= 2
  const targetCard = workbenchCards[0]
  const canEvolveTarget = targetCard && canEvolve(targetCard)

  const workbenchCardsDependency = workbenchCards
    .map((c) => `${c.id}-${c.updatedAt || 0}`)
    .join(",")

  // Check connection on mount
  useChromeTabConnection({
    workbenchCardsDependency,
    setAlertType,
    addLog
  })

  // Load segments, parameters, and initialize slotValues when workbenchCards changes
  useEffect(() => {
    if (workbenchCards.length === 0) {
      setEditedSegments([])
      setEditedParams({})
      setSlotValues({})
      return
    }

    let nextSegments: PromptSegment[]
    let nextParams: any

    if (workbenchCards.length === 1) {
      const target = workbenchCards[0]
      nextSegments = target.promptSegments || []
      nextParams = target.parameters || {}
    } else {
      const allSegments = workbenchCards.flatMap((p) => p.promptSegments || [])
      nextSegments = mergePromptSegments(allSegments)

      const mainParent = workbenchCards[0]
      nextParams = { ...mainParent.parameters }
      workbenchCards.slice(1).forEach((parent) => {
        if (parent.parameters?.sref) {
          const combinedSref = [
            ...(parent.parameters.sref || []),
            ...(nextParams.sref || [])
          ]
          nextParams.sref = Array.from(new Set(combinedSref)).slice(0, 5)
        }
        if (parent.parameters?.cref) {
          const combinedCref = [
            ...(parent.parameters.cref || []),
            ...(nextParams.cref || [])
          ]
          nextParams.cref = Array.from(new Set(combinedCref)).slice(0, 5)
        }
        if (parent.parameters?.imagePrompts) {
          const combinedIP = [
            ...(parent.parameters.imagePrompts || []),
            ...(nextParams.imagePrompts || [])
          ]
          nextParams.imagePrompts = Array.from(new Set(combinedIP)).slice(0, 5)
        }
        if (parent.parameters?.p) {
          const combinedP = [
            ...(parent.parameters.p || []),
            ...(nextParams.p || [])
          ]
          nextParams.p = Array.from(new Set(combinedP)).slice(0, 5)
        }
      })
    }

    setEditedSegments(nextSegments)
    setEditedParams(nextParams)

    // Initialize slotValues based on nextSegments
    const initialSlotValues: Record<string, string> = {}
    nextSegments.forEach((seg) => {
      if (seg.type === "slot") {
        initialSlotValues[seg.label] = seg.default || ""
      }
    })
    setSlotValues(initialSlotValues)
  }, [workbenchCardsDependency])

  const handleSlotValueChange = (label: string, value: string) => {
    setSlotValues((prev) => ({
      ...prev,
      [label]: value
    }))
  }

  const handleSendToWorkbench = async (value: string, label: string) => {
    const trimmed = value.trim()
    if (!trimmed) return

    try {
      const newCard = {
        id: crypto.randomUUID(),
        name: trimmed,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        promptSegments: [{ type: "text" as const, value: trimmed }],
        parameters: {},
        masking: { isSrefHidden: false, isPHidden: false },
        tier: "Common" as const,
        isFavorite: false,
        isPinned: true,
        usageCount: 0,
        tags: [label.toLowerCase()],
        dominantColor: "#cbd5e1",
        thumbnailData: "",
        frameId: "default",
        genealogy: {
          generation: 1,
          parentIds: []
        },
        isVariable: true,
        associatedJobIds: []
      }

      await addCard(newCard)
      addLog?.(`Sent "${trimmed}" to Workbench under tag "${label}"`)
    } catch (err) {
      console.error("Failed to send card to Workbench:", err)
    }
  }

  const { isInjecting, injectPrompt } = usePromptInjector({
    workbenchCards,
    slotHistory,
    saveSlotHistory,
    incrementCardUsage,
    setAlertType,
    addLog
  })

  const handleInjectPrompt = () => {
    injectPrompt(editedSegments, editedParams, slotValues)
  }

  const handleMintVariation = () => {
    if (!onStartVariationMinting) return

    // Calculate max generation among parents
    const maxParentGen = Math.max(
      ...workbenchCards.map((c) => c.genealogy?.generation || 1),
      0
    )
    const parentIds = workbenchCards.map((c) => c.id)
    const parentNames = workbenchCards.map((c) => c.name).join(", ")

    const genealogy = {
      generation: maxParentGen + 1,
      parentIds: parentIds,
      originCreatorId: "user",
      mutationNote: `Blended from: ${parentNames}`
    }

    // Gather images from parents
    const parentImages = workbenchCards
      .flatMap((c) => c.images || [])
      .filter(Boolean)
    const parentThumbnails = workbenchCards
      .flatMap((c) => c.selectedThumbnails || [])
      .filter(Boolean)
    const thumbnailData = workbenchCards[0]?.thumbnailData || "assets/icon.png"

    onStartVariationMinting({
      promptSegments: editedSegments,
      parameters: editedParams,
      genealogy,
      thumbnailData,
      images: parentImages.length > 0 ? parentImages : undefined,
      selectedThumbnails:
        parentThumbnails.length > 0 ? parentThumbnails : undefined
    })
  }

  // Extract slots
  const slots = editedSegments.filter(
    (seg): seg is { type: "slot"; label: string; default: string } =>
      seg.type === "slot"
  )

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <BookUp2 className="w-5 h-5 text-blue-500" />
          Workbench
        </h2>
        <div className="flex gap-2">
          {workbenchCards.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearWorkbench}
              className="text-slate-400 hover:text-slate-600">
              {t.clearAll}
            </Button>
          )}
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={() => setIsDragOver(false)}
        className={`grid grid-cols-2 gap-4 p-4 rounded-xl border-2 border-dashed transition-all duration-200 min-h-[160px] ${
          isDragOver
            ? "bg-blue-50/80 border-blue-500 scale-[1.01] shadow-lg shadow-blue-500/10"
            : "bg-slate-50 border-slate-200"
        }`}>
        {workbenchCards.map((card) => (
          <div
            key={card.id}
            className="relative group animate-in zoom-in-95 duration-200">
            <CardThumbnail
              imageUrl={card.thumbnailData}
              thumbnailImages={card.selectedThumbnails}
              alt={card.name}
              tier={card.tier}
              className="w-full aspect-square"
            />
            <button
              onClick={() => toggleCardSelection(card.id)}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {workbenchCards.length < 2 && (
          <div className="border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center aspect-square text-slate-500 text-xs text-center p-2">
            {t.addPromptDesc}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {(isEvolutionMode || isMixingMode) && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-3">
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
                {isEvolutionMode && targetCard && (
                  <RarityBadge tier={targetCard.tier} />
                )}
              </div>

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

              {/* Slot Variables Section */}
              {expertFeatures.slot && (
                <SlotVariablesSection
                  slots={slots}
                  slotValues={slotValues}
                  onSlotValueChange={handleSlotValueChange}
                  slotHistory={slotHistory}
                  handCards={handCards}
                  onSendToWorkbench={handleSendToWorkbench}
                />
              )}

              {expertFeatures.cardEditing ? (
                <ParameterEditor
                  parameters={editedParams}
                  onChange={setEditedParams}
                />
              ) : (
                <div className="space-y-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-xs">
                  {editedParams.ar && (
                    <div>
                      <span className="font-bold text-slate-500">
                        {t.aspectRatio}
                      </span>{" "}
                      {editedParams.ar}
                    </div>
                  )}
                  {editedParams.p && editedParams.p.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-500">
                        {t.personalization}
                      </span>{" "}
                      {editedParams.p.join(", ")}
                    </div>
                  )}
                  {editedParams.imagePrompts &&
                    editedParams.imagePrompts.length > 0 && (
                      <div>
                        <span className="font-bold text-slate-500">
                          {t.imagePrompts}
                        </span>{" "}
                        {editedParams.imagePrompts.join(", ")}
                      </div>
                    )}
                  {editedParams.sref && editedParams.sref.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-500">
                        {t.styleReference}
                      </span>{" "}
                      {editedParams.sref.join(", ")}
                    </div>
                  )}
                  {editedParams.cref && editedParams.cref.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-500">
                        {t.characterReference}
                      </span>{" "}
                      {editedParams.cref.join(", ")}
                    </div>
                  )}
                  {!hasParams && (
                    <div className="text-slate-400 italic">
                      {t.noParameters}
                    </div>
                  )}
                </div>
              )}

              {isEvolutionMode && targetCard && expertFeatures.stack && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-slate-500">{t.usageProgress}</span>
                    <span className="font-mono font-bold text-blue-600">
                      {targetCard.usageCount} {t.uses}
                    </span>
                  </div>
                  {canEvolveTarget ? (
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                      onClick={async () => {
                        try {
                          const oldTier = targetCard.tier
                          const nextTier = await evolveCard(targetCard.id)
                          setEvolvedCardData({
                            name: targetCard.name,
                            thumbnailData: targetCard.thumbnailData,
                            selectedThumbnails: targetCard.selectedThumbnails,
                            oldTier,
                            newTier: nextTier
                          })
                          setIsEvolutionSuccessOpen(true)
                          addLog?.(
                            `Evolved card "${targetCard.name}" from ${oldTier} to ${nextTier}`
                          )
                        } catch (err: any) {
                          console.error("Evolution failed:", err)
                        }
                      }}>
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
          </div>
        )}

        {!isEvolutionMode && !isMixingMode && (
          <div className="flex flex-col items-center justify-center py-10 px-6 bg-slate-50/50 rounded-xl border border-slate-200 border-dashed backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400 animate-pulse">
              <Layers className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              {t.emptyTitle}
            </h3>
            <p className="text-xs text-slate-500 max-w-[280px] leading-relaxed mb-6 text-center">
              {t.emptyDesc}
            </p>

            <div className="w-full max-w-xs space-y-4 text-left border-t border-slate-200/60 pt-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {t.guideTitle}
              </h4>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                  1
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-700">
                    {t.step1Title}
                  </h5>
                  <p className="text-[10px] text-slate-500">{t.step1Desc}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center text-[10px] font-bold">
                  2
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-700">
                    {t.step2Title}
                  </h5>
                  <p className="text-[10px] text-slate-500">{t.step2Desc}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                  3
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-700">
                    {t.step3Title}
                  </h5>
                  <p className="text-[10px] text-slate-500">{t.step3Desc}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {evolvedCardData && (
        <EvolutionSuccessModal
          isOpen={isEvolutionSuccessOpen}
          onClose={() => setIsEvolutionSuccessOpen(false)}
          cardName={evolvedCardData.name}
          thumbnailData={evolvedCardData.thumbnailData}
          selectedThumbnails={evolvedCardData.selectedThumbnails}
          oldTier={evolvedCardData.oldTier}
          newTier={evolvedCardData.newTier}
          translation={{
            title: i18n.workbench.evolutionSuccessTitle,
            desc: i18n.workbench.evolutionSuccessDesc,
            close: i18n.workbench.close
          }}
        />
      )}
    </div>
  )
}
