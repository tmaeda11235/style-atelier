import { Grid, Paintbrush, Sparkles, Wand2, Zap } from "lucide-react"
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

interface ParamConfigItem {
  key: string
  label: string
  defaultValue?: number
  min?: number
  max?: number
  icon: React.ComponentType<any>
  isSlider: boolean
  value: any
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
    <div className="flex items-center gap-3 w-full">
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

function ParamTooltip({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-[999]">
      <div className="bg-slate-950 text-white dark:bg-slate-800 dark:text-slate-200 text-[10px] font-medium px-2.5 py-1 rounded shadow-lg whitespace-nowrap leading-none">
        {label}
      </div>
      <div className="w-1.5 h-1.5 bg-slate-950 dark:bg-slate-800 rotate-45 -mt-0.75"></div>
    </div>
  )
}

function ParamButton({
  param,
  handleToggleParam,
  updateParam
}: {
  param: ParamConfigItem
  handleToggleParam: (key: string, defaultVal: any) => void
  updateParam: (key: string, value: any) => void
}) {
  const Icon = param.icon
  const isActive = param.value !== undefined
  const activeClass = isActive
    ? "bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400 font-bold"
    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-600 dark:hover:text-slate-400"

  return (
    <div className="relative group">
      <ParamTooltip label={param.label} />
      <label
        className={`cursor-pointer flex flex-col items-center justify-center p-2 rounded-lg border transition-all h-[54px] ${activeClass}`}
        title={param.label}
        data-testid={`param-btn-${param.key}`}>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => {
            if (param.isSlider) {
              handleToggleParam(param.key, param.defaultValue)
            } else {
              updateParam(param.key, e.target.checked ? true : undefined)
            }
          }}
          className="sr-only"
        />
        <span className="sr-only">{param.label}</span>
        <Icon className="w-5 h-5" />
        {isActive && param.isSlider && (
          <span className="mt-1 text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-950/50 px-1 rounded max-w-full truncate">
            {param.value}
          </span>
        )}
      </label>
    </div>
  )
}

function ActiveSliderField({
  param,
  handleSliderChange,
  handleInputChange
}: {
  param: ParamConfigItem
  handleSliderChange: (key: string, val: number) => void
  handleInputChange: (
    key: string,
    valStr: string,
    min: number,
    max: number
  ) => void
}) {
  return (
    <div
      className="bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900/50 animate-in fade-in slide-in-from-top-1 duration-150"
      data-testid={`active-slider-${param.key}`}>
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {param.label}
        </span>
        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded">
          {param.value}
        </span>
      </div>
      <SliderControls
        min={param.min}
        max={param.max}
        value={param.value}
        paramKey={param.key}
        handleSliderChange={handleSliderChange}
        handleInputChange={handleInputChange}
      />
    </div>
  )
}

function buildParamConfig(t: any, parameters: any): ParamConfigItem[] {
  return [
    {
      key: "stylize",
      label: t.cardDetail.stylize,
      defaultValue: 100,
      min: 0,
      max: 1000,
      icon: Paintbrush,
      isSlider: true,
      value: parameters.stylize
    },
    {
      key: "chaos",
      label: t.cardDetail.chaos,
      defaultValue: 0,
      min: 0,
      max: 100,
      icon: Sparkles,
      isSlider: true,
      value: parameters.chaos
    },
    {
      key: "weird",
      label: t.cardDetail.weird,
      defaultValue: 0,
      min: 0,
      max: 3000,
      icon: Wand2,
      isSlider: true,
      value: parameters.weird
    },
    {
      key: "tile",
      label: t.cardDetail.tile,
      icon: Grid,
      isSlider: false,
      value: parameters.tile ? true : undefined
    },
    {
      key: "raw",
      label: t.cardDetail.raw,
      icon: Zap,
      isSlider: false,
      value: parameters.raw ? true : undefined
    }
  ]
}

function AdvancedParametersContent({
  t,
  parameters,
  updateParam,
  handleToggleParam,
  handleSliderChange,
  handleInputChange
}: Omit<AdvancedParametersSectionProps, "showAdvanced" | "setShowAdvanced">) {
  const paramConfig = buildParamConfig(t, parameters)

  return (
    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs space-y-3">
      <div
        className="grid grid-cols-5 gap-2"
        data-testid="advanced-params-grid">
        {paramConfig.map((param) => (
          <ParamButton
            key={param.key}
            param={param}
            handleToggleParam={handleToggleParam}
            updateParam={updateParam}
          />
        ))}
      </div>

      <div className="space-y-2.5 pt-1">
        {paramConfig
          .filter((p) => p.isSlider && p.value !== undefined)
          .map((param) => (
            <ActiveSliderField
              key={param.key}
              param={param}
              handleSliderChange={handleSliderChange}
              handleInputChange={handleInputChange}
            />
          ))}
      </div>
    </div>
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
        data-testid="advanced-params-toggle"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-between p-2 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors">
        <span>{t.cardDetail.advancedParams}</span>
        <span className="text-slate-500 dark:text-slate-400">
          {showAdvanced ? "▲" : "▼"}
        </span>
      </button>

      {showAdvanced && (
        <AdvancedParametersContent
          t={t}
          parameters={parameters}
          updateParam={updateParam}
          handleToggleParam={handleToggleParam}
          handleSliderChange={handleSliderChange}
          handleInputChange={handleInputChange}
        />
      )}
    </div>
  )
}
