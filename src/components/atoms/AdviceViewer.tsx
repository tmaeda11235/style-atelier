import React from "react"

import { adviceViewerVariants } from "./AdviceViewer.variants"

interface AdviceViewerProps {
  advice: string
}

export function AdviceViewer({ advice }: AdviceViewerProps) {
  return (
    <div className={adviceViewerVariants.container()}>
      {advice.split("\n").map((line, idx) => {
        if (line.startsWith("###")) {
          return (
            <h4 key={idx} className={adviceViewerVariants.heading()}>
              {line.replace("###", "").trim()}
            </h4>
          )
        }
        if (line.startsWith("-")) {
          const cleanLine = line.substring(1).trim()
          const boldMatch = cleanLine.match(/^\*\*(.*?)\*\*(.*)$/)
          if (boldMatch) {
            return (
              <div key={idx} className={adviceViewerVariants.listItem()}>
                <span className={adviceViewerVariants.bullet()} />
                <strong className={adviceViewerVariants.strong()}>
                  {boldMatch[1]}
                </strong>
                <span>{boldMatch[2]}</span>
              </div>
            )
          }
          return (
            <div key={idx} className={adviceViewerVariants.listItem()}>
              <span className={adviceViewerVariants.bullet()} />
              <span>{cleanLine}</span>
            </div>
          )
        }
        return (
          <p key={idx} className={adviceViewerVariants.paragraph()}>
            {line}
          </p>
        )
      })}
    </div>
  )
}
