import React from "react"

interface AdvancedParametersSectionProps {
  t: any
  parameters: {
    stylize?: number
    chaos?: number
    weird?: number
    tile?: boolean
    raw?: boolean
  }
  updateParam: (key: string, value: any) => void
  handleToggleParam: (key: string, defaultVal: any) => void
  handleSliderChange: (key: string, val: number) => void
  handleInputChange: (
    key: string,
    valStr: string,
    min: number,
    max: number
  ) => void
  showAdvanced: boolean
  setShowAdvanced: (show: boolean) => void
}

interface SliderParameterFieldProps {
  t: any
  label: string
  paramKey: string
  value?: number
  defaultValue: number
  min: number
  max: number
  handleToggleParam: (key: string, defaultVal: any) => void
  handleSliderChange: (key: string, val: number) => void
  handleInputChange: (
    key: string,
    valStr: string,
    min: number,
    max: number
  ) => void
}

function SliderControls({
  min,
  max,
  value,
  paramKey,
  handleSliderChange,
  handleInputChange
}: any) {
  return (
    <div className="flex items-center gap-3 pl-6">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          handleSliderChange(paramKey, parseInt(e.target.value, 10))
        }
        className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => handleInputChange(paramKey, e.target.value, min, max)}
        className="w-16 border border-slate-200 dark:border-slate-800 rounded p-1 text-center font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900"
      />
    </div>
  )
}

function SliderParameterField({
  t,
  label,
  paramKey,
  value,
  defaultValue,
  min,
  max,
  handleToggleParam,
  handleSliderChange,
  handleInputChange
}: SliderParameterFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={value !== undefined}
            onChange={() => handleToggleParam(paramKey, defaultValue)}
            className="rounded border-slate-300"
          />
          {label}
        </label>
        {value !== undefined && (
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded">
            {value}
          </span>
        )}
      </div>
      {value !== undefined && (
        <SliderControls
          min={min}
          max={max}
          value={value}
          paramKey={paramKey}
          handleSliderChange={handleSliderChange}
          handleInputChange={handleInputChange}
        />
      )}
    </div>
  )
}

function FlagsFields({
  t,
  tile,
  raw,
  updateParam
}: {
  t: any
  tile?: boolean
  raw?: boolean
  updateParam: (key: string, value: any) => void
}) {
  return (
    <div className="flex gap-6 pl-1 pt-1">
      <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={!!tile}
          onChange={(e) =>
            updateParam("tile", e.target.checked ? true : undefined)
          }
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        {t.cardDetail.tile}
      </label>

      <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={!!raw}
          onChange={(e) =>
            updateParam("raw", e.target.checked ? true : undefined)
          }
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        {t.cardDetail.raw}
      </label>
    </div>
  )
}

function SlidersList({
  t,
  parameters,
  handleToggleParam,
  handleSliderChange,
  handleInputChange
}: any) {
  return (
    <>
      <SliderParameterField
        t={t}
        label={t.cardDetail.stylize}
        paramKey="stylize"
        value={parameters.stylize}
        defaultValue={100}
        min={0}
        max={1000}
        handleToggleParam={handleToggleParam}
        handleSliderChange={handleSliderChange}
        handleInputChange={handleInputChange}
      />
      <SliderParameterField
        t={t}
        label={t.cardDetail.chaos}
        paramKey="chaos"
        value={parameters.chaos}
        defaultValue={0}
        min={0}
        max={100}
        handleToggleParam={handleToggleParam}
        handleSliderChange={handleSliderChange}
        handleInputChange={handleInputChange}
      />
      <SliderParameterField
        t={t}
        label={t.cardDetail.weird}
        paramKey="weird"
        value={parameters.weird}
        defaultValue={0}
        min={0}
        max={3000}
        handleToggleParam={handleToggleParam}
        handleSliderChange={handleSliderChange}
        handleInputChange={handleInputChange}
      />
    </>
  )
}

export function AdvancedParametersSection({
  t,
  parameters,
  updateParam,
  handleToggleParam,
  handleSliderChange,
  handleInputChange,
  showAdvanced,
  setShowAdvanced
}: AdvancedParametersSectionProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-between p-2 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors">
        <span>{t.cardDetail.advancedParams}</span>
        <span className="text-slate-500 dark:text-slate-400">
          {showAdvanced ? "▲" : "▼"}
        </span>
      </button>

      {showAdvanced && (
        <div className="p-3 space-y-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs">
          <SlidersList
            t={t}
            parameters={parameters}
            handleToggleParam={handleToggleParam}
            handleSliderChange={handleSliderChange}
            handleInputChange={handleInputChange}
          />
          <FlagsFields
            t={t}
            tile={parameters.tile}
            raw={parameters.raw}
            updateParam={updateParam}
          />
        </div>
      )}
    </div>
  )
}
