import React from "react"

interface AdviceViewerProps {
  advice: string
}

export function AdviceViewer({ advice }: AdviceViewerProps) {
  return (
    <div className="prose prose-invert max-w-none text-slate-700 dark:text-slate-300 space-y-2 font-sans">
      {advice.split("\n").map((line, idx) => {
        if (line.startsWith("###")) {
          return (
            <h4
              key={idx}
              className="font-bold text-slate-800 dark:text-indigo-300 text-[11px] pt-1.5 border-b border-slate-200/50 dark:border-indigo-950/30 pb-0.5 mb-1.5 first:pt-0">
              {line.replace("###", "").trim()}
            </h4>
          )
        }
        if (line.startsWith("-")) {
          const cleanLine = line.substring(1).trim()
          const boldMatch = cleanLine.match(/^\*\*(.*?)\*\*(.*)$/)
          if (boldMatch) {
            return (
              <div key={idx} className="pl-3.5 relative mb-1">
                <span className="absolute left-1 top-1.5 w-1 h-1 rounded-full bg-indigo-500" />
                <strong className="text-slate-800 dark:text-slate-200">
                  {boldMatch[1]}
                </strong>
                <span>{boldMatch[2]}</span>
              </div>
            )
          }
          return (
            <div key={idx} className="pl-3.5 relative mb-1">
              <span className="absolute left-1 top-1.5 w-1 h-1 rounded-full bg-indigo-500" />
              <span>{cleanLine}</span>
            </div>
          )
        }
        return (
          <p key={idx} className="mb-1">
            {line}
          </p>
        )
      })}
    </div>
  )
}
