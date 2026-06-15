import { Settings2 } from "lucide-react"
import React from "react"

import { HelpTooltip } from "../atoms/HelpTooltip"
import { FeatureToggleGroup } from "../molecules/FeatureToggleGroup"
import { FeatureToggleItem } from "../molecules/FeatureToggleItem"
import { InterfaceModeToggle } from "../molecules/InterfaceModeToggle"

interface EasyModeSectionProps {
  currentEasyMode: boolean
  currentToggleEasyMode: (checked: boolean) => void
  expertFeatures: any
  updateExpertFeature: (featureName: string, value: boolean) => void
  t: any
  onNavigateToLibrary?: () => void
}

export function EasyModeSection({
  currentEasyMode,
  currentToggleEasyMode,
  expertFeatures,
  updateExpertFeature,
  t,
  onNavigateToLibrary
}: EasyModeSectionProps) {
  return (
    <>
      {/* Interface Mode Settings (Easy Mode Toggle) */}
      <InterfaceModeToggle
        currentEasyMode={currentEasyMode}
        currentToggleEasyMode={currentToggleEasyMode}
        t={t}
        onNavigateToLibrary={onNavigateToLibrary}
      />

      {/* Expert Mode Features Toggle Config */}
      {!currentEasyMode && (
        <ExpertFeaturesConfig
          expertFeatures={expertFeatures}
          updateExpertFeature={updateExpertFeature}
          t={t}
        />
      )}
    </>
  )
}

interface ExpertFeaturesConfigProps {
  expertFeatures: any
  updateExpertFeature: (featureName: string, value: boolean) => void
  t: any
}

function ExpertFeaturesConfig({
  expertFeatures,
  updateExpertFeature,
  t
}: ExpertFeaturesConfigProps) {
  return (
    <div
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
      id="expert-features-section">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
          <Settings2 className="w-6 h-6" />
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            {t.expertFeaturesTitle}
            <HelpTooltip content={t.expertFeaturesDesc} position="top-left" />
          </h3>
        </div>
      </div>

      <div className="space-y-5 border-t border-slate-100 dark:border-slate-800 pt-4">
        <CardFeaturesGroup
          expertFeatures={expertFeatures}
          updateExpertFeature={updateExpertFeature}
          t={t}
        />
        <OrganizationFeaturesGroup
          expertFeatures={expertFeatures}
          updateExpertFeature={updateExpertFeature}
          t={t}
        />
        <WorkbenchFeaturesGroup
          expertFeatures={expertFeatures}
          updateExpertFeature={updateExpertFeature}
          t={t}
        />
      </div>
    </div>
  )
}

interface FeatureGroupProps {
  expertFeatures: any
  updateExpertFeature: (featureName: string, value: boolean) => void
  t: any
}

function CardFeaturesGroup({
  expertFeatures,
  updateExpertFeature,
  t
}: FeatureGroupProps) {
  return (
    <FeatureToggleGroup title={t.groupCardFeatures}>
      <FeatureToggleItem
        id="expert-feature-rarity-btn"
        label={t.featureRarityLabel}
        tooltipContent={t.featureRaritySub}
        checked={expertFeatures.rarity}
        onChange={(checked) => updateExpertFeature("rarity", checked)}
      />
      <FeatureToggleItem
        id="expert-feature-tags-btn"
        label={t.featureTagsLabel}
        tooltipContent={t.featureTagsSub}
        checked={expertFeatures.tags}
        onChange={(checked) => updateExpertFeature("tags", checked)}
      />
      <FeatureToggleItem
        id="expert-feature-cardediting-btn"
        label={t.featureCardEditingLabel}
        tooltipContent={t.featureCardEditingSub}
        checked={expertFeatures.cardEditing}
        onChange={(checked) => updateExpertFeature("cardEditing", checked)}
      />
    </FeatureToggleGroup>
  )
}

function OrganizationFeaturesGroup({
  expertFeatures,
  updateExpertFeature,
  t
}: FeatureGroupProps) {
  return (
    <FeatureToggleGroup title={t.groupOrganization}>
      <FeatureToggleItem
        id="expert-feature-categories-btn"
        label={t.featureCategoriesLabel}
        tooltipContent={t.featureCategoriesSub}
        checked={expertFeatures.categories}
        onChange={(checked) => updateExpertFeature("categories", checked)}
      />
      <FeatureToggleItem
        id="expert-feature-stack-btn"
        label={t.featureStackLabel}
        tooltipContent={t.featureStackSub}
        checked={expertFeatures.stack}
        onChange={(checked) => updateExpertFeature("stack", checked)}
      />
    </FeatureToggleGroup>
  )
}

function WorkbenchFeaturesGroup({
  expertFeatures,
  updateExpertFeature,
  t
}: FeatureGroupProps) {
  return (
    <FeatureToggleGroup title={t.groupWorkbench}>
      <FeatureToggleItem
        id="expert-feature-slot-btn"
        label={t.featureSlotLabel}
        tooltipContent={t.featureSlotSub}
        checked={expertFeatures.slot}
        onChange={(checked) => updateExpertFeature("slot", checked)}
      />
      <FeatureToggleItem
        id="expert-feature-multicard-btn"
        label={t.featureMultiCardLabel}
        tooltipContent={t.featureMultiCardSub}
        checked={expertFeatures.multiCard}
        onChange={(checked) => updateExpertFeature("multiCard", checked)}
      />
      <FeatureToggleItem
        id="expert-feature-multiimage-btn"
        label={t.featureMultiImageLabel}
        tooltipContent={t.featureMultiImageSub}
        checked={expertFeatures.multiImage}
        onChange={(checked) => updateExpertFeature("multiImage", checked)}
      />
    </FeatureToggleGroup>
  )
}
