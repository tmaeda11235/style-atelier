import {
  Gem,
  Hammer,
  Layers,
  MousePointerClick,
  Move,
  Type,
  Zap
} from "lucide-react"
import React from "react"

import { BubblesIllustration } from "./BubblesIllustration"
import { ClickCardIllustration } from "./ClickCardIllustration"
import { MintIllustration } from "./MintIllustration"
import { MoveIllustration } from "./MoveIllustration"
import { RarityIllustration } from "./RarityIllustration"
import { TitleIllustration } from "./TitleIllustration"
import { WorkbenchEditorIllustration } from "./WorkbenchEditorIllustration"

export interface Step {
  title: string
  description: string
  icon: React.ReactNode
  color: string
  illustration: React.ReactNode
}

const getStep1 = (t: any): Step => ({
  title: t.onboarding.steps[0].title,
  description: t.onboarding.steps[0].description,
  icon: <Move className="w-6 h-6 text-blue-400" />,
  color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30",
  illustration: <MoveIllustration t={t} />
})

const getStep2 = (t: any): Step => ({
  title: t.onboarding.steps[1].title,
  description: t.onboarding.steps[1].description,
  icon: <Zap className="w-6 h-6 text-amber-400" />,
  color: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
  illustration: <MintIllustration t={t} />
})

const getStep3 = (t: any): Step => ({
  title: t.onboarding.steps[2].title,
  description: t.onboarding.steps[2].description,
  icon: <Type className="w-6 h-6 text-purple-400" />,
  color: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
  illustration: <TitleIllustration t={t} />
})

const getStep4 = (t: any): Step => ({
  title: t.onboarding.steps[3].title,
  description: t.onboarding.steps[3].description,
  icon: <Layers className="w-6 h-6 text-emerald-400" />,
  color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
  illustration: <BubblesIllustration t={t} />
})

const getStep5 = (t: any): Step => ({
  title: t.onboarding.steps[4].title,
  description: t.onboarding.steps[4].description,
  icon: <Gem className="w-6 h-6 text-cyan-400" />,
  color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
  illustration: <RarityIllustration t={t} />
})

const getStep6 = (t: any): Step => ({
  title: t.onboarding.steps[5].title,
  description: t.onboarding.steps[5].description,
  icon: <MousePointerClick className="w-6 h-6 text-rose-400" />,
  color: "from-rose-500/20 to-red-500/20 border-rose-500/30",
  illustration: <ClickCardIllustration t={t} />
})

const getStep7 = (t: any): Step => ({
  title: t.onboarding.steps[6].title,
  description: t.onboarding.steps[6].description,
  icon: <Hammer className="w-6 h-6 text-indigo-400" />,
  color: "from-indigo-500/20 to-violet-500/20 border-indigo-500/30",
  illustration: <WorkbenchEditorIllustration t={t} />
})

export function getSteps(t: any): Step[] {
  return [
    getStep1(t),
    getStep2(t),
    getStep3(t),
    getStep4(t),
    getStep5(t),
    getStep6(t),
    getStep7(t)
  ]
}
