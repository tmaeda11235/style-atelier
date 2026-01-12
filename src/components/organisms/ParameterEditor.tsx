import React from "react"
import { Input } from "../atoms/Input"
import { Settings2, Image, User, Hash } from "lucide-react"

interface ParameterEditorProps {
  parameters: {
    ar?: string
    sref?: string[]
    cref?: string[]
    p?: string
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

  const handleSrefChange = (index: number, value: string) => {
    const newSref = [...(parameters.sref || [])]
    if (value.trim() === "") {
      newSref.splice(index, 1)
    } else {
      newSref[index] = value
    }
    updateParam("sref", newSref.length > 0 ? newSref : undefined)
  }

  const addSref = () => {
    updateParam("sref", [...(parameters.sref || []), ""])
  }

  return (
    <div className="space-y-4 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
      <div className="flex items-center gap-2 text-slate-700 mb-1">
        <Settings2 className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Parameters</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Aspect Ratio */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Hash className="w-3 h-3" /> Aspect Ratio
          </label>
          <Input
            value={parameters.ar || ""}
            onChange={(e) => updateParam("ar", e.target.value)}
            placeholder="e.g. 16:9"
            className="h-8 text-xs bg-white"
          />
        </div>

        {/* Personalization */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <User className="w-3 h-3" /> Personalize (--p)
          </label>
          <Input
            value={parameters.p || ""}
            onChange={(e) => updateParam("p", e.target.value)}
            placeholder="code or 'yes'"
            className="h-8 text-xs bg-white"
          />
        </div>
      </div>

      {/* Style Reference */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
          <Image className="w-3 h-3" /> Style Reference (--sref)
        </label>
        <div className="space-y-2">
          {(parameters.sref || []).map((url, index) => (
            <Input
              key={index}
              value={url}
              onChange={(e) => handleSrefChange(index, e.target.value)}
              placeholder="Image URL"
              className="h-8 text-xs bg-white"
            />
          ))}
          <button
            onClick={addSref}
            className="text-[10px] text-blue-600 font-bold hover:text-blue-700 transition-colors flex items-center gap-1"
          >
            + Add Sref URL
          </button>
        </div>
      </div>
    </div>
  )
}