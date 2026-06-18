import React from "react"

import type { StyleCard } from "../../../shared/lib/db-schema"
import { ParameterEditor } from "../ParameterEditor"

const TEXT_TRUE = "true"

interface ParametersSectionProps {
  t: any
  expertFeatures: any
  parameters: StyleCard["parameters"]
  setParameters: (params: StyleCard["parameters"]) => void
}

function BasicParamsView({
  t,
  parameters
}: {
  t: any
  parameters: StyleCard["parameters"]
}) {
  return (
    <>
      {parameters.ar && (
        <div>
          <span className="font-bold text-slate-500">
            {t.cardDetail.aspectRatio}
          </span>{" "}
          {parameters.ar}
        </div>
      )}
      {parameters.p && parameters.p.length > 0 && (
        <div>
          <span className="font-bold text-slate-500">
            {t.cardDetail.personalization}
          </span>{" "}
          {parameters.p.join(", ")}
        </div>
      )}
      {parameters.imagePrompts && parameters.imagePrompts.length > 0 && (
        <div>
          <span className="font-bold text-slate-500">
            {t.cardDetail.imagePrompts}
          </span>{" "}
          {parameters.imagePrompts.join(", ")}
        </div>
      )}
    </>
  )
}

function RefParamsView({
  t,
  parameters
}: {
  t: any
  parameters: StyleCard["parameters"]
}) {
  return (
    <>
      {parameters.sref && parameters.sref.length > 0 && (
        <div>
          <span className="font-bold text-slate-500">
            {t.cardDetail.styleReference}
          </span>{" "}
          {parameters.sref.join(", ")}
        </div>
      )}
      {parameters.cref && parameters.cref.length > 0 && (
        <div>
          <span className="font-bold text-slate-500">
            {t.cardDetail.characterReference}
          </span>{" "}
          {parameters.cref.join(", ")}
        </div>
      )}
    </>
  )
}

function NumericParamsView({
  t,
  parameters
}: {
  t: any
  parameters: StyleCard["parameters"]
}) {
  return (
    <>
      {parameters.stylize !== undefined && (
        <div>
          <span className="font-bold text-slate-500">
            {t.cardDetail.stylize}:
          </span>{" "}
          {parameters.stylize}
        </div>
      )}
      {parameters.chaos !== undefined && (
        <div>
          <span className="font-bold text-slate-500">
            {t.cardDetail.chaos}:
          </span>{" "}
          {parameters.chaos}
        </div>
      )}
      {parameters.weird !== undefined && (
        <div>
          <span className="font-bold text-slate-500">
            {t.cardDetail.weird}:
          </span>{" "}
          {parameters.weird}
        </div>
      )}
    </>
  )
}

function FlagsParamsView({
  t,
  parameters
}: {
  t: any
  parameters: StyleCard["parameters"]
}) {
  return (
    <>
      {parameters.tile && (
        <div>
          <span className="font-bold text-slate-500">{t.cardDetail.tile}:</span>{" "}
          {TEXT_TRUE}
        </div>
      )}
      {parameters.raw && (
        <div>
          <span className="font-bold text-slate-500">{t.cardDetail.raw}:</span>{" "}
          {TEXT_TRUE}
        </div>
      )}
    </>
  )
}

function ReadOnlyParametersView({
  t,
  parameters,
  hasParams
}: {
  t: any
  parameters: StyleCard["parameters"]
  hasParams: boolean
}) {
  return (
    <div className="space-y-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-xs">
      <BasicParamsView t={t} parameters={parameters} />
      <RefParamsView t={t} parameters={parameters} />
      <NumericParamsView t={t} parameters={parameters} />
      <FlagsParamsView t={t} parameters={parameters} />
      {!hasParams && (
        <div className="text-slate-400 italic">{t.cardDetail.noParameters}</div>
      )}
    </div>
  )
}

export function ParametersSection({
  t,
  expertFeatures,
  parameters,
  setParameters
}: ParametersSectionProps) {
  const hasParams = Object.values(parameters).some((v) => {
    if (v === undefined) return false
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === "boolean") return v
    return v !== "" && v !== null
  })

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {t.cardDetail.parameters}
      </h3>
      {expertFeatures.cardEditing ? (
        <ParameterEditor parameters={parameters} onChange={setParameters} />
      ) : (
        <ReadOnlyParametersView
          t={t}
          parameters={parameters}
          hasParams={hasParams}
        />
      )}
    </div>
  )
}
