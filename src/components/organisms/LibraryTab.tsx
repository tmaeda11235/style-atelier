/* eslint-disable max-lines, max-lines-per-function */
import React, { useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useTutorial } from "../../contexts/TutorialContext"
import { useLibrary } from "../../hooks/useLibrary"
import { useWebLlm } from "../../hooks/useWebLlm"
import { THEME_STYLES } from "../../lib/theme-config"
import type { StyleCard } from "../../shared/lib/db-schema"
import { OpfsImage } from "../atoms/OpfsImage"
import { type AlertType } from "../molecules/ConnectionAlert"
import { LocalAiSetupPlaceholder } from "../molecules/LocalAiSetupPlaceholder"
import { CardsGrid } from "./CardsGrid"
import { CategoryManagerModal } from "./CategoryManagerModal"
import { EmptyState } from "./EmptyState"
import { FolderExplorer } from "./FolderExplorer"
import { SearchAndFilterSection } from "./LibraryTab/SearchAndFilterSection"
import { ShareCardModal } from "./ShareCardModal"

interface LibraryTabProps {
  addLog: (msg: string) => void
  setAlertType: (type: AlertType) => void
  onOpenDetailCard: (card: StyleCard) => void
  onNavigateToWorkbench?: () => void
  isEasyMode?: boolean
  onOpenSimpleWorkbench?: (card: StyleCard) => void
  onSetActiveTab?: (tab: string) => void
}

interface GridOrEmptySectionProps {
  lib: any
  isEasyMode?: boolean
  onOpenSimpleWorkbench?: (card: StyleCard) => void
  onOpenDetailCard: (card: StyleCard) => void
  onNavigateToWorkbench?: () => void
  setSharingCard: (card: StyleCard | null) => void
  t: any
  cardSlotThemeClass?: string
}

function RenderEmptyState(lib: any, t: any) {
  return (
    <EmptyState
      allCards={lib.allCards}
      searchTag={lib.searchTag}
      rarityFilter={lib.rarityFilter}
      modelFilter={lib.modelFilter}
      categoryFilter={lib.categoryFilter}
      colorFilter={lib.colorFilter}
      setSearchTag={lib.setSearchTag}
      setRarityFilter={lib.setRarityFilter}
      setModelFilter={lib.setModelFilter}
      setCategoryFilter={lib.setCategoryFilter}
      setColorFilter={lib.setColorFilter}
      t={t}
    />
  )
}

function GridOrEmptySection({
  lib,
  isEasyMode,
  onOpenSimpleWorkbench,
  onOpenDetailCard,
  onNavigateToWorkbench,
  setSharingCard,
  t,
  cardSlotThemeClass
}: GridOrEmptySectionProps) {
  const { advanceIfStep } = useTutorial()
  if (lib.styleCards.length === 0) {
    return RenderEmptyState(lib, t)
  }
  return (
    <CardsGrid
      styleCards={lib.styleCards}
      isEasyMode={isEasyMode}
      onOpenSimpleWorkbench={onOpenSimpleWorkbench}
      togglePin={lib.togglePin}
      advanceIfStep={advanceIfStep}
      onOpenDetailCard={onOpenDetailCard}
      handleCardClick={lib.handleCardClick}
      setSharingCard={setSharingCard}
      categories={lib.categories}
      handleQuickSend={async (card, e) => {
        if (!card.isPinned) await lib.togglePin(card, e)
        onNavigateToWorkbench?.()
      }}
      moveCardToCategory={lib.moveCardToCategory}
      onCardReorder={lib.handleCardReorder}
      hasMore={lib.hasMore}
      loadMore={lib.loadMore}
      t={t}
      cardSlotThemeClass={cardSlotThemeClass}
    />
  )
}

interface ModalsSectionProps {
  isCategoryModalOpen: boolean
  setIsCategoryModalOpen: (v: boolean) => void
  sharingCard: StyleCard | null
  setSharingCard: (card: StyleCard | null) => void
  addLog: (msg: string) => void
}

function ModalsSection({
  isCategoryModalOpen,
  setIsCategoryModalOpen,
  sharingCard,
  setSharingCard,
  addLog
}: ModalsSectionProps) {
  return (
    <>
      {isCategoryModalOpen && (
        <CategoryManagerModal
          onClose={() => setIsCategoryModalOpen(false)}
          addLog={addLog}
        />
      )}
      {sharingCard && (
        <ShareCardModal
          card={sharingCard}
          onClose={() => setSharingCard(null)}
          addLog={addLog}
        />
      )}
    </>
  )
}

function BinderThemeHeader({
  currentCategory,
  activeTheme,
  themeStyles
}: {
  currentCategory: any
  activeTheme: string
  themeStyles: any
}) {
  const themeClasses: Record<string, string> = {
    magic:
      "bg-gradient-to-r from-purple-900 to-indigo-900 border-purple-500/40 text-purple-100",
    cyberpunk: "bg-black border-cyan-400 text-cyan-300",
    minimal: "bg-zinc-800 border-zinc-700 text-zinc-100"
  }
  const defaultBg = "bg-amber-100/50 border-amber-700/30 text-amber-900"
  const bgClass = themeClasses[activeTheme] || defaultBg

  return (
    <div
      className={`p-4 rounded-xl border flex flex-col justify-center relative overflow-hidden transition-all duration-300 min-h-[4rem] ${bgClass}`}>
      {(currentCategory.coverImagePath || currentCategory.coverImageUrl) && (
        <div className="absolute inset-0 z-0">
          <OpfsImage
            src={
              currentCategory.coverImagePath || currentCategory.coverImageUrl
            }
            className="w-full h-full object-cover opacity-45"
            alt="Category Cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>
      )}
      <div className="relative z-10 flex flex-col">
        <span
          className={`text-[9px] uppercase tracking-wider font-extrabold ${currentCategory.coverImageUrl ? "text-white/70" : "opacity-60"}`}>
          {activeTheme ? `${activeTheme} theme binder` : "binder"}
        </span>
        <h2
          className={`text-base font-extrabold truncate ${
            currentCategory.coverImageUrl
              ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
              : themeStyles?.title || "text-slate-800"
          }`}>
          {currentCategory.name}
        </h2>
      </div>
    </div>
  )
}

function LibraryContentSection({
  lib,
  themeStyles,
  props,
  setSharingCard,
  t
}: {
  lib: any
  themeStyles: any
  props: LibraryTabProps
  setSharingCard: (card: StyleCard | null) => void
  t: any
}) {
  return (
    <div className={themeStyles ? themeStyles.container : ""}>
      <FolderExplorer
        breadcrumbs={lib.breadcrumbs}
        currentSubfolders={lib.currentSubfolders}
        setCurrentFolderId={lib.setCurrentFolderId}
        moveCardToCategory={lib.moveCardToCategory}
        subfoldersGridClass={themeStyles?.subfoldersGrid}
      />
      <div className="mt-4">
        <GridOrEmptySection
          lib={lib}
          isEasyMode={props.isEasyMode}
          onOpenSimpleWorkbench={props.onOpenSimpleWorkbench}
          onOpenDetailCard={props.onOpenDetailCard}
          onNavigateToWorkbench={props.onNavigateToWorkbench}
          setSharingCard={setSharingCard}
          t={t}
          cardSlotThemeClass={themeStyles?.cardSlot}
        />
      </div>
    </div>
  )
}

function useLibraryTheme(lib: any) {
  const currentCategory = lib.currentFolderId
    ? lib.categories.find((c: any) => c.id === lib.currentFolderId)
    : undefined
  const activeTheme = currentCategory?.theme || ""
  const themeStyles = activeTheme ? THEME_STYLES[activeTheme] : undefined
  return { currentCategory, activeTheme, themeStyles }
}

function useLibraryTabState(props: LibraryTabProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [sharingCard, setSharingCard] = useState<StyleCard | null>(null)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)
  const { expertFeatures, setAutoOpenSection } = useSettings()
  const { status: webLlmStatus } = useWebLlm()
  const { t: i18n } = useLanguage()
  const t = i18n.libraryTab
  const lib = useLibrary(
    props.addLog,
    props.setAlertType,
    props.onNavigateToWorkbench
  )
  const { currentCategory, activeTheme, themeStyles } = useLibraryTheme(lib)

  return {
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    sharingCard,
    setSharingCard,
    isFiltersExpanded,
    setIsFiltersExpanded,
    expertFeatures,
    setAutoOpenSection,
    webLlmStatus,
    t,
    lib,
    currentCategory,
    activeTheme,
    themeStyles
  }
}

export function LibraryTab(props: LibraryTabProps) {
  const state = useLibraryTabState(props)
  const { lib, t, currentCategory, activeTheme, themeStyles } = state

  React.useEffect(() => {
    const handleFilterCategory = (e: Event) => {
      const customEvent = e as CustomEvent<{ categoryId: string }>
      if (customEvent.detail?.categoryId) {
        lib.setCurrentFolderId(customEvent.detail.categoryId)
      }
    }
    window.addEventListener("filter-category", handleFilterCategory)
    return () => {
      window.removeEventListener("filter-category", handleFilterCategory)
    }
  }, [lib])

  return (
    <div className="flex flex-col gap-4">
      <SearchAndFilterSection
        lib={lib}
        isFiltersExpanded={state.isFiltersExpanded}
        setIsFiltersExpanded={state.setIsFiltersExpanded}
        expertFeatures={state.expertFeatures}
        setIsCategoryModalOpen={state.setIsCategoryModalOpen}
        t={t}
      />
      {currentCategory && (
        <BinderThemeHeader
          currentCategory={currentCategory}
          activeTheme={activeTheme}
          themeStyles={themeStyles}
        />
      )}
      {lib.isAiSearch && state.webLlmStatus !== "ready" ? (
        <LocalAiSetupPlaceholder
          onSetupStart={() => {
            props.onSetActiveTab?.("settings")
            state.setAutoOpenSection("local-ai")
          }}
        />
      ) : (
        <LibraryContentSection
          lib={lib}
          themeStyles={themeStyles}
          props={props}
          setSharingCard={state.setSharingCard}
          t={t}
        />
      )}
      <ModalsSection
        isCategoryModalOpen={state.isCategoryModalOpen}
        setIsCategoryModalOpen={state.setIsCategoryModalOpen}
        sharingCard={state.sharingCard}
        setSharingCard={state.setSharingCard}
        addLog={props.addLog}
      />
    </div>
  )
}
