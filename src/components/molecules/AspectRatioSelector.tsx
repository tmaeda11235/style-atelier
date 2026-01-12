import React from "react"
import { Hash } from "lucide-react"
import { Input } from "../atoms/Input"
import { cn } from "../../lib/utils"

const COMMON_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:2", "2:3"]

interface AspectRatioSelectorProps {
  value: string | undefined
  onChange: (value: string) => void
}

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
        <Hash className="w-3 h-3" /> Aspect Ratio
      </label>
      <div className="flex flex-wrap gap-1">
        {COMMON_ASPECT_RATIOS.map((ratio) => (
          <button
            key={ratio}
            onClick={() => onChange(ratio)}
            className={cn(
              "px-2 py-1 text-[10px] font-bold rounded-md border transition-all",
              value === ratio
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:border-blue-400"
            )}
          >
            {ratio}
          </button>
        ))}
        <div className="ml-auto w-20">
          <Input
            value={COMMON_ASPECT_RATIOS.includes(value || "") ? "" : value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Custom"
            className="h-6 text-[10px] bg-white px-2"
          />
        </div>
      </div>
    </div>
  )
}