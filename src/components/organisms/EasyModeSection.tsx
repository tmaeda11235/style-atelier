import { Settings2 } from "lucide-react"
import React from "react"

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
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

        <div className="flex items-start gap-4 mb-4">
          <div
            className={`p-3 rounded-xl ${currentEasyMode ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60" : "bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-800"}`}>
            <Settings2 className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              {t.easyModeLabel}
              {currentEasyMode && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300">
                  Active
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.easyModeDesc}
            </p>
          </div>
        </div>

        {/* Easy Mode Toggle Switch */}
        <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-800 rounded-xl px-4 py-3 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t.easyModeToggleLabel}
            </span>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {t.easyModeToggleSub}
            </p>
          </div>
          <button
            type="button"
            id="easy-mode-toggle-btn"
            onClick={() => currentToggleEasyMode(!currentEasyMode)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              currentEasyMode
                ? "bg-blue-600 dark:bg-blue-500"
                : "bg-slate-200 dark:bg-slate-700"
            }`}>
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                currentEasyMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Navigation Link to Library (Only in Easy Mode) */}
        {currentEasyMode && onNavigateToLibrary && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={onNavigateToLibrary}
              id="back-to-library-btn"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer py-1 px-2 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 rounded-lg">
              <span>🎴 {t.backToLibrary || "Back to Library"}</span>
              <span>&rarr;</span>
            </button>
          </div>
        )}
      </div>

      {/* Expert Mode Features Toggle Config */}
      {!currentEasyMode && (
        <div
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          id="expert-features-section">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
              <Settings2 className="w-6 h-6" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {t.expertFeaturesTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.expertFeaturesDesc}
              </p>
            </div>
          </div>

          <div className="space-y-5 border-t border-slate-100 dark:border-slate-800 pt-4">
            {/* Group: Card Features */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {t.groupCardFeatures}
              </h4>
              <div className="space-y-3">
                {/* Rarity */}
                <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-800 rounded-xl px-4 py-2.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t.featureRarityLabel}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t.featureRaritySub}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="expert-feature-rarity-btn"
                    onClick={() =>
                      updateExpertFeature("rarity", !expertFeatures.rarity)
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      expertFeatures.rarity
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}>
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        expertFeatures.rarity
                          ? "translate-x-4"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {/* Tags */}
                <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-800 rounded-xl px-4 py-2.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t.featureTagsLabel}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t.featureTagsSub}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="expert-feature-tags-btn"
                    onClick={() =>
                      updateExpertFeature("tags", !expertFeatures.tags)
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      expertFeatures.tags
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}>
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        expertFeatures.tags ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {/* Card Editing */}
                <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-800 rounded-xl px-4 py-2.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t.featureCardEditingLabel}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t.featureCardEditingSub}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="expert-feature-cardediting-btn"
                    onClick={() =>
                      updateExpertFeature(
                        "cardEditing",
                        !expertFeatures.cardEditing
                      )
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      expertFeatures.cardEditing
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}>
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        expertFeatures.cardEditing
                          ? "translate-x-4"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Group: Organization */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {t.groupOrganization}
              </h4>
              <div className="space-y-3">
                {/* Categories */}
                <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-800 rounded-xl px-4 py-2.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t.featureCategoriesLabel}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t.featureCategoriesSub}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="expert-feature-categories-btn"
                    onClick={() =>
                      updateExpertFeature(
                        "categories",
                        !expertFeatures.categories
                      )
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      expertFeatures.categories
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}>
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        expertFeatures.categories
                          ? "translate-x-4"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {/* Stack */}
                <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-800 rounded-xl px-4 py-2.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t.featureStackLabel}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t.featureStackSub}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="expert-feature-stack-btn"
                    onClick={() =>
                      updateExpertFeature("stack", !expertFeatures.stack)
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      expertFeatures.stack
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}>
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        expertFeatures.stack ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Group: Workbench */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {t.groupWorkbench}
              </h4>
              <div className="space-y-3">
                {/* Slot */}
                <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-800 rounded-xl px-4 py-2.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t.featureSlotLabel}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t.featureSlotSub}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="expert-feature-slot-btn"
                    onClick={() =>
                      updateExpertFeature("slot", !expertFeatures.slot)
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      expertFeatures.slot
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}>
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        expertFeatures.slot ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {/* Multi-card */}
                <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-800 rounded-xl px-4 py-2.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t.featureMultiCardLabel}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t.featureMultiCardSub}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="expert-feature-multicard-btn"
                    onClick={() =>
                      updateExpertFeature(
                        "multiCard",
                        !expertFeatures.multiCard
                      )
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      expertFeatures.multiCard
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}>
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        expertFeatures.multiCard
                          ? "translate-x-4"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {/* Multi-image */}
                <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-800 rounded-xl px-4 py-2.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t.featureMultiImageLabel}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t.featureMultiImageSub}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="expert-feature-multiimage-btn"
                    onClick={() =>
                      updateExpertFeature(
                        "multiImage",
                        !expertFeatures.multiImage
                      )
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      expertFeatures.multiImage
                        ? "bg-blue-600 dark:bg-blue-500"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}>
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        expertFeatures.multiImage
                          ? "translate-x-4"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
