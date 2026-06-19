import React from "react"

export const CauldronBubbles: React.FC = () => (
  <div className="absolute inset-x-0 bottom-2 flex justify-around pointer-events-none h-16 overflow-hidden">
    <div className="w-1.5 h-1.5 rounded-full bg-blue-400/40 animate-cauldron-bubble [animation-delay:0.2s]" />
    <div className="w-2.5 h-2.5 rounded-full bg-purple-400/40 animate-cauldron-bubble [animation-delay:0.8s]" />
    <div className="w-2.5 h-2.5 rounded-full bg-purple-400/40 animate-cauldron-bubble [animation-delay:0.8s]" />
    <div className="w-2 h-2 rounded-full bg-indigo-400/40 animate-cauldron-bubble [animation-delay:1.5s]" />
    <div className="w-1.5 h-1.5 rounded-full bg-teal-400/40 animate-cauldron-bubble [animation-delay:2.1s]" />
  </div>
)
