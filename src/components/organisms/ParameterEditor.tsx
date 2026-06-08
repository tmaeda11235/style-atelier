import { Image, Settings2, User } from "lucide-react"
import React, { useMemo, useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useStyleCards } from "../../hooks/useStyleCards"
import { AspectRatioSelector } from "../molecules/AspectRatioSelector"
import { ParameterArrayEditor } from "../molecules/ParameterArrayEditor"

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
}

export const ParameterEditor: React.FC<ParameterEditorProps> = ({
  parameters,
  onChange
}) => {
  const { t } = useLanguage()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const updateParam = (key: string, value: any) => {
    onChange({ ...parameters, [key]: value })
  }

  const handleToggleParam = (key: string, defaultVal: any) => {
    if (parameters[key] === undefined) {
      updateParam(key, defaultVal)
    } else {
      updateParam(key, undefined)
    }
  }

  const handleSliderChange = (key: string, val: number) => {
    updateParam(key, val)
  }

  const handleInputChange = (
    key: string,
    valStr: string,
    min: number,
    max: number
  ) => {
    const val = parseInt(valStr, 10)
    if (isNaN(val)) {
      updateParam(key, min)
    } else {
      updateParam(key, Math.max(min, Math.min(max, val)))
    }
  }

  const { data: allCards = [] } = useStyleCards()

  const allSrefs = useMemo(() => {
    const srefs = new Set<string>()
    allCards.forEach((card) => {
      card.parameters?.sref?.forEach((url) => srefs.add(url))
    })
    return Array.from(srefs)
  }, [allCards])

  const allCrefs = useMemo(() => {
    const crefs = new Set<string>()
    allCards.forEach((card) => {
      card.parameters?.cref?.forEach((url) => crefs.add(url))
    })
    return Array.from(crefs)
  }, [allCards])

  const allImagePrompts = useMemo(() => {
    const ip = new Set<string>()
    allCards.forEach((card) => {
      card.parameters?.imagePrompts?.forEach((url) => ip.add(url))
    })
    return Array.from(ip)
  }, [allCards])

  return (
    <div className="space-y-4 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
      <div className="flex items-center gap-2 text-slate-700 mb-1">
        <Settings2 className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">
          Parameters
        </span>
      </div>

      <AspectRatioSelector
        value={parameters.ar}
        onChange={(value) => updateParam("ar", value)}
      />

      <div className="grid grid-cols-1 gap-4">
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
        />

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
        />
      </div>

      {/* Advanced Parameters Accordion */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-2 bg-slate-100/80 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors">
          <span>{t.cardDetail.advancedParams}</span>
          <span className="text-slate-500">{showAdvanced ? "▲" : "▼"}</span>
        </button>

        {showAdvanced && (
          <div className="p-3 space-y-4 bg-white border-t border-slate-200 text-xs">
            {/* Stylize */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={parameters.stylize !== undefined}
                    onChange={() => handleToggleParam("stylize", 100)}
                    className="rounded border-slate-300"
                  />
                  {t.cardDetail.stylize}
                </label>
                {parameters.stylize !== undefined && (
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    {parameters.stylize}
                  </span>
                )}
              </div>
              {parameters.stylize !== undefined && (
                <div className="flex items-center gap-3 pl-6">
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={parameters.stylize}
                    onChange={(e) =>
                      handleSliderChange(
                        "stylize",
                        parseInt(e.target.value, 10)
                      )
                    }
                    className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={parameters.stylize}
                    onChange={(e) =>
                      handleInputChange("stylize", e.target.value, 0, 1000)
                    }
                    className="w-16 border rounded p-1 text-center font-semibold text-slate-700"
                  />
                </div>
              )}
            </div>

            {/* Chaos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={parameters.chaos !== undefined}
                    onChange={() => handleToggleParam("chaos", 0)}
                    className="rounded border-slate-300"
                  />
                  {t.cardDetail.chaos}
                </label>
                {parameters.chaos !== undefined && (
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    {parameters.chaos}
                  </span>
                )}
              </div>
              {parameters.chaos !== undefined && (
                <div className="flex items-center gap-3 pl-6">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={parameters.chaos}
                    onChange={(e) =>
                      handleSliderChange("chaos", parseInt(e.target.value, 10))
                    }
                    className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={parameters.chaos}
                    onChange={(e) =>
                      handleInputChange("chaos", e.target.value, 0, 100)
                    }
                    className="w-16 border rounded p-1 text-center font-semibold text-slate-700"
                  />
                </div>
              )}
            </div>

            {/* Weird */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={parameters.weird !== undefined}
                    onChange={() => handleToggleParam("weird", 0)}
                    className="rounded border-slate-300"
                  />
                  {t.cardDetail.weird}
                </label>
                {parameters.weird !== undefined && (
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    {parameters.weird}
                  </span>
                )}
              </div>
              {parameters.weird !== undefined && (
                <div className="flex items-center gap-3 pl-6">
                  <input
                    type="range"
                    min="0"
                    max="3000"
                    value={parameters.weird}
                    onChange={(e) =>
                      handleSliderChange("weird", parseInt(e.target.value, 10))
                    }
                    className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <input
                    type="number"
                    min="0"
                    max="3000"
                    value={parameters.weird}
                    onChange={(e) =>
                      handleInputChange("weird", e.target.value, 0, 3000)
                    }
                    className="w-16 border rounded p-1 text-center font-semibold text-slate-700"
                  />
                </div>
              )}
            </div>

            {/* Tile & Raw Flags */}
            <div className="flex gap-6 pl-1 pt-1">
              <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!parameters.tile}
                  onChange={(e) =>
                    updateParam("tile", e.target.checked ? true : undefined)
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {t.cardDetail.tile}
              </label>

              <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!parameters.raw}
                  onChange={(e) =>
                    updateParam("raw", e.target.checked ? true : undefined)
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {t.cardDetail.raw}
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
