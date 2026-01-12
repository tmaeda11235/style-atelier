import React, { useState } from "react"
import { Input } from "../atoms/Input"
import { Settings2, Image, User, Hash, Plus, X } from "lucide-react"
import { cn } from "../../lib/utils"

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

const COMMON_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:2", "2:3"]

export const ParameterEditor: React.FC<ParameterEditorProps> = ({ parameters, onChange }) => {
  const [newSref, setNewSref] = useState("")
  const [newP, setNewP] = useState("")

  const updateParam = (key: string, value: any) => {
    onChange({ ...parameters, [key]: value })
  }

  const getArrayValue = (key: "sref" | "p"): string[] => {
    const val = parameters[key]
    if (Array.isArray(val)) return val
    if (typeof val === "string" && (val as string).trim().length > 0) {
      return (val as string).trim().split(/\s+/).filter((v) => v.length > 0)
    }
    return []
  }

  const addValue = (key: "sref" | "p", value: string, setter: (v: string) => void) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const newItems = trimmed.split(/\s+/).filter((v) => v.length > 0)
    const currentValues = getArrayValue(key)
    const updatedValues = [...currentValues]
    newItems.forEach((item) => {
      if (!updatedValues.includes(item)) {
        updatedValues.push(item)
      }
    })
    updateParam(key, updatedValues)
    setter("")
  }

  const removeValue = (key: "sref" | "p", index: number) => {
    const currentValues = getArrayValue(key)
    const updatedValues = currentValues.filter((_, i) => i !== index)
    updateParam(key, updatedValues.length > 0 ? updatedValues : undefined)
  }

  return (
    <div className="space-y-4 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
      <div className="flex items-center gap-2 text-slate-700 mb-1">
        <Settings2 className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Parameters</span>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
          <Hash className="w-3 h-3" /> Aspect Ratio
        </label>
        <div className="flex flex-wrap gap-1">
          {COMMON_ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio}
              onClick={() => updateParam("ar", ratio)}
              className={cn(
                "px-2 py-1 text-[10px] font-bold rounded-md border transition-all",
                parameters.ar === ratio
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:border-blue-400"
              )}
            >
              {ratio}
            </button>
          ))}
          <div className="ml-auto w-20">
            <Input
              value={COMMON_ASPECT_RATIOS.includes(parameters.ar || "") ? "" : parameters.ar || ""}
              onChange={(e) => updateParam("ar", e.target.value)}
              placeholder="Custom"
              className="h-6 text-[10px] bg-white px-2"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <User className="w-3 h-3" /> Personalization (--p)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {getArrayValue("p").map((val, idx) => (
              <div
                key={`${val}-${idx}`}
                className="flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full text-[10px] font-bold"
              >
                <span className="max-w-[100px] truncate">{val}</span>
                <button onClick={() => removeValue("p", idx)} className="hover:text-purple-900">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newP}
              onChange={(e) => setNewP(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addValue("p", newP, setNewP)}
              placeholder="Add code or 'yes'"
              className="h-8 text-xs bg-white"
            />
            <button
              onClick={() => addValue("p", newP, setNewP)}
              className="p-1 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            >
              <Plus className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Image className="w-3 h-3" /> Style Reference (--sref)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {getArrayValue("sref").map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full text-[10px] font-bold"
              >
                <span className="max-w-[150px] truncate">{url}</span>
                <button onClick={() => removeValue("sref", idx)} className="hover:text-blue-900">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newSref}
              onChange={(e) => setNewSref(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addValue("sref", newSref, setNewSref)}
              placeholder="Add Image URL"
              className="h-8 text-xs bg-white"
            />
            <button
              onClick={() => addValue("sref", newSref, setNewSref)}
              className="p-1 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            >
              <Plus className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}