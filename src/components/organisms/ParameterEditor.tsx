import { Image, Settings2, User } from "lucide-react"
import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useParameterEditor } from "../../hooks/useParameterEditor"
import { AspectRatioSelector } from "../molecules/AspectRatioSelector"
import { ParameterArrayEditor } from "../molecules/ParameterArrayEditor"
import { AdvancedParametersSection } from "./ParameterEditor/AdvancedParametersSection"

interface ParameterEditorProps {
  parameters: {
    ar?: string
    sref?: string[]
    cref?: string[]
    p?: string[]
    imagePrompts?: string[]
    stylize?: number
    chaos?: number
    weird?: number
    tile?: boolean
    raw?: boolean
  }
  onChange: (parameters: any) => void
  defaultOpen?: boolean
}

function BasicArraysSection({
  parameters,
  updateParam,
  allCards,
  allImagePrompts
}: {
  parameters: any
  updateParam: (key: string, value: any) => void
  allCards: any[]
  allImagePrompts: string[]
}) {
  return (
    <>
      <ParameterArrayEditor
        label="Personalization (--p)"
        icon={<User className="w-3 h-3" />}
        values={parameters.p}
        onChange={(value) => updateParam("p", value)}
        placeholder="Add code or 'yes'"
        colorClass={{
          bg: "bg-purple-50",
          text: "text-purple-700",
          border: "border-purple-100",
          hover: "hover:text-purple-900"
        }}
        styleCards={allCards}
        parameterType="p"
      />

      <ParameterArrayEditor
        label="Image Prompts"
        icon={<Image className="w-3 h-3" />}
        values={parameters.imagePrompts}
        onChange={(value) => updateParam("imagePrompts", value)}
        placeholder="Add Image URL"
        colorClass={{
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-100",
          hover: "hover:text-amber-900"
        }}
        options={allImagePrompts}
        styleCards={allCards}
        parameterType="imagePrompts"
      />
    </>
  )
}

function RefArraysSection({
  parameters,
  updateParam,
  allCards,
  allSrefs,
  allCrefs
}: {
  parameters: any
  updateParam: (key: string, value: any) => void
  allCards: any[]
  allSrefs: string[]
  allCrefs: string[]
}) {
  return (
    <>
      <ParameterArrayEditor
        label="Style Reference (--sref)"
        icon={<Image className="w-3 h-3" />}
        values={parameters.sref}
        onChange={(value) => updateParam("sref", value)}
        placeholder="Add Image URL"
        colorClass={{
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-100",
          hover: "hover:text-blue-900"
        }}
        options={allSrefs}
        styleCards={allCards}
        parameterType="sref"
      />

      <ParameterArrayEditor
        label="Character Reference (--cref)"
        icon={<User className="w-3 h-3" />}
        values={parameters.cref}
        onChange={(value) => updateParam("cref", value)}
        placeholder="Add Character URL"
        colorClass={{
          bg: "bg-green-50",
          text: "text-green-700",
          border: "border-green-100",
          hover: "hover:text-green-900"
        }}
        options={allCrefs}
        styleCards={allCards}
        parameterType="cref"
      />
    </>
  )
}

function ParameterEditorAccordionContent({
  parameters,
  updateParam,
  allCards,
  allImagePrompts,
  allSrefs,
  allCrefs,
  t,
  handleToggleParam,
  handleSliderChange,
  handleInputChange,
  showAdvanced,
  setShowAdvanced
}: any) {
  return (
    <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
      <AspectRatioSelector
        value={parameters.ar}
        onChange={(value) => updateParam("ar", value)}
      />

      <div className="grid grid-cols-1 gap-4">
        <BasicArraysSection
          parameters={parameters}
          updateParam={updateParam}
          allCards={allCards}
          allImagePrompts={allImagePrompts}
        />
        <RefArraysSection
          parameters={parameters}
          updateParam={updateParam}
          allCards={allCards}
          allSrefs={allSrefs}
          allCrefs={allCrefs}
        />
      </div>

      <AdvancedParametersSection
        t={t}
        parameters={parameters}
        updateParam={updateParam}
        handleToggleParam={handleToggleParam}
        handleSliderChange={handleSliderChange}
        handleInputChange={handleInputChange}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
      />
    </div>
  )
}

export const ParameterEditor: React.FC<ParameterEditorProps> = ({
  parameters,
  onChange,
  defaultOpen = true
}) => {
  const { t } = useLanguage()
  const logic = useParameterEditor({ parameters, onChange, defaultOpen })

  return (
    <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
      <button
        type="button"
        data-testid="parameter-editor-toggle"
        onClick={() => logic.setIsOpen(!logic.isOpen)}
        className="w-full flex items-center justify-between text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Parameters
          </span>
        </div>
        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold">
          {logic.isOpen ? "▲" : "▼"}
        </span>
      </button>

      {logic.isOpen && (
        <ParameterEditorAccordionContent
          parameters={parameters}
          updateParam={logic.updateParam}
          allCards={logic.allCards}
          allImagePrompts={logic.allImagePrompts}
          allSrefs={logic.allSrefs}
          allCrefs={logic.allCrefs}
          t={t}
          handleToggleParam={logic.handleToggleParam}
          handleSliderChange={logic.handleSliderChange}
          handleInputChange={logic.handleInputChange}
          showAdvanced={logic.showAdvanced}
          setShowAdvanced={logic.setShowAdvanced}
        />
      )}
    </div>
  )
}
