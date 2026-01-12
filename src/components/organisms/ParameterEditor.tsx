import React from "react"
import { Settings2, Image, User } from "lucide-react"
import { AspectRatioSelector } from "../molecules/AspectRatioSelector"
import { ParameterArrayEditor } from "../molecules/ParameterArrayEditor"

interface ParameterEditorProps {
  parameters: {
    ar?: string
    sref?: string[]
    cref?: string[]
    p?: string[]
    stylize?: number
    chaos?: number
    weird?: number
    tile?: boolean
    raw?: boolean
  }
  onChange: (parameters: any) => void
}

export const ParameterEditor: React.FC<ParameterEditorProps> = ({ parameters, onChange }) => {
  const updateParam = (key: string, value: any) => {
    onChange({ ...parameters, [key]: value })
  }

  return (
    <div className="space-y-4 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
      <div className="flex items-center gap-2 text-slate-700 mb-1">
        <Settings2 className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Parameters</span>
      </div>

      <AspectRatioSelector value={parameters.ar} onChange={(value) => updateParam("ar", value)} />

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
            hover: "hover:text-purple-900",
          }}
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
            hover: "hover:text-blue-900",
          }}
        />
      </div>
    </div>
  )
}