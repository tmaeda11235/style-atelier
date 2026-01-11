import { useState, useEffect } from "react"

import { db } from "./lib/db"

import "./style.css"

function SidePanel() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    console.log("Database initialized:", db.name)
  }, [])

  return (
    <div className="w-full h-screen p-4 bg-slate-50 flex flex-col items-center justify-center font-sans">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">
        Style Atelier
      </h1>
      <p className="mb-4 text-slate-600">Side Panel Initialized</p>
      <button
        onClick={() => setCount((c) => c + 1)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Count: {count}
      </button>
    </div>
  )
}

export default SidePanel