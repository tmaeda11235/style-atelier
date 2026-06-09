import React from "react"

interface HueSliderFilterProps {
  colorHueFilter: number | null
  setColorHueFilter: (hue: number | null) => void
  setColorFilter: (color: string) => void
}

export function HueSliderFilter({
  colorHueFilter,
  setColorHueFilter,
  setColorFilter
}: HueSliderFilterProps) {
  return (
    <div className="flex items-center gap-2 mt-1 select-none text-[10px] pl-1">
      <span className="text-[9px] text-slate-400 font-bold mr-1 flex-shrink-0">
        Hue:
      </span>
      <input
        type="range"
        min="0"
        max="360"
        value={colorHueFilter ?? 180}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10)
          setColorHueFilter(val)
          setColorFilter("All")
        }}
        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-blue-600 outline-none"
        style={{
          background:
            "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)"
        }}
      />
      {colorHueFilter !== null ? (
        <button
          onClick={() => setColorHueFilter(null)}
          className="text-[9px] text-blue-500 hover:text-blue-700 font-bold flex-shrink-0 px-1 border border-blue-200 rounded bg-blue-50/50">
          Clear
        </button>
      ) : (
        <span className="text-[9px] text-slate-400 font-semibold w-7 text-center flex-shrink-0">
          Auto
        </span>
      )}
    </div>
  )
}
