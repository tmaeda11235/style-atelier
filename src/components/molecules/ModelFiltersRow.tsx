import React from "react"

export interface ModelFiltersRowProps {
  modelFilter: string
  setModelFilter: (model: string) => void
  modelLabel?: string
  modelOptions?: {
    all: string
    v6: string
    v5: string
    niji6: string
    niji5: string
  }
}

export function ModelFiltersRow({
  modelFilter,
  setModelFilter,
  modelLabel,
  modelOptions
}: ModelFiltersRowProps) {
  const options = [
    { value: "All", label: modelOptions?.all || "All Models" },
    { value: "V6", label: modelOptions?.v6 || "V6" },
    { value: "V5", label: modelOptions?.v5 || "V5" },
    { value: "Niji 6", label: modelOptions?.niji6 || "Niji 6" },
    { value: "Niji 5", label: modelOptions?.niji5 || "Niji 5" }
  ]

  return (
    <div className="flex flex-col gap-1 mt-0.5">
      {modelLabel && (
        <span className="text-[10px] font-bold text-slate-500">
          {modelLabel}
        </span>
      )}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
        data-testid="model-filters-row">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setModelFilter(opt.value)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border cursor-pointer ${
              modelFilter === opt.value
                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
            data-testid={`model-filter-${opt.value.replace(" ", "-")}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
