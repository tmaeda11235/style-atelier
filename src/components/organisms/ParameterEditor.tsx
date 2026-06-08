import { Image, Settings2, User } from "lucide-react"
import React, { useMemo } from "react"

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
  const updateParam = (key: string, value: any) => {
    onChange({ ...parameters, [key]: value })
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
    </div>
  )
}
