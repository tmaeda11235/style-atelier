import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import "./style.css"
import { db } from "./lib/db"
import { parseDroppedData, type ParsedData } from "./lib/mj-parser"

function SidePanel() {
  const [isDragging, setIsDragging] = useState(false)
  const [droppedData, setDroppedData] = useState<ParsedData | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const styleCards = useLiveQuery(() => db.styleCards.orderBy('createdAt').reverse().toArray())

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 20))

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    console.log("DnD: Drop event detected", e)
    setIsDragging(false)
    addLog("Drop event received")

    try {
      const parsed = parseDroppedData(e.dataTransfer)
      console.log("DnD: Parsed data", parsed)
      
      if (parsed) {
          addLog(`Parsed data: ${parsed.jobId || 'No Job ID'}`)
          setDroppedData(parsed)
      } else {
          addLog("Could not parse dropped data")
      }
    } catch (error) {
      console.error("DnD: Critical error", error)
      addLog(`CRITICAL ERROR: ${error}`)
    }
  }

  const handleSave = async () => {
    if (!droppedData) return

    try {
        await db.addStyleCard({
            imageUrl: droppedData.src,
            prompt: droppedData.prompt,
            jobId: droppedData.jobId,
            source: droppedData.source
        })
        const count = await db.styleCards.count()
        addLog(`  StyleCard saved to DB! Total: ${count}`)
        setDroppedData(null)
    } catch (err) {
        console.error(err)
        addLog(`L Save failed: ${err}`)
    }
  }

  return (
    <div 
        className={`w-full h-screen flex flex-col font-sans transition-colors ${isDragging ? 'bg-blue-50' : 'bg-slate-50'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      <div className="p-4 bg-white shadow-sm z-10">
          <h1 className="text-xl font-bold text-slate-900">Style Atelier</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {droppedData ? (
            <div className="p-3 border rounded bg-white shadow-sm w-full animate-in fade-in zoom-in mb-6">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">New Capture</p>
                    <button 
                        onClick={() => setDroppedData(null)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                    >
                        Close
                    </button>
                </div>
                <div className="flex gap-3">
                    <div className="relative w-24 h-24 bg-slate-100 rounded overflow-hidden flex-shrink-0">
                        <img src={droppedData.src} alt="Dropped" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        {droppedData.jobId && (
                             <div className="mb-2">
                                <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-600 block truncate">
                                    {droppedData.jobId}
                                </code>
                            </div>
                        )}
                        {droppedData.prompt && (
                            <p className="text-xs text-slate-600 line-clamp-3">
                                {droppedData.prompt}
                            </p>
                        )}
                    </div>
                </div>
                <div className="mt-3 flex justify-end">
                    <button 
                        onClick={handleSave}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Save & Continue
                    </button>
                </div>
            </div>
        ) : (
            <div className={`border-2 border-dashed rounded-lg text-slate-400 text-center w-full py-8 mb-6 transition-colors ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}`}>
                <p className="text-sm font-medium">Drop Midjourney Images Here</p>
            </div>
        )}

        <div className="mb-4">
             <h2 className="text-sm font-bold text-slate-700 mb-3">Saved Styles</h2>
             
             {!styleCards || styleCards.length === 0 ? (
                 <p className="text-xs text-slate-400 text-center py-8">No styles saved yet.</p>
             ) : (
                 <div className="grid grid-cols-2 gap-3">
                     {styleCards.map(card => (
                         <div key={card.id} className="group relative bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                             <div className="aspect-square bg-slate-100 overflow-hidden">
                                 <img src={card.imageUrl} alt="Style" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                             </div>
                             <div className="p-2">
                                 {card.jobId && (
                                     <p className="text-[10px] text-slate-500 font-mono truncate mb-1" title={card.jobId}>{card.jobId}</p>
                                 )}
                                 <p className="text-[10px] text-slate-700 line-clamp-2 leading-tight" title={card.prompt}>
                                     {card.prompt}
                                 </p>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
        </div>

        <div className="w-full mt-8 border-t border-slate-200 pt-4">
            <div className="flex justify-between items-center mb-2">
               <p className="text-[10px] text-slate-500 uppercase font-bold">Debug Logs</p>
               <div className="flex gap-2">
                   <button 
                       onClick={async () => {
                           if (window.confirm("Are you sure you want to delete all saved styles?")) {
                               await db.styleCards.clear()
                               addLog("Database cleared.")
                           }
                       }} 
                       className="text-[10px] text-red-400 hover:text-red-600 font-medium"
                   >
                       Reset DB
                   </button>
                   <button onClick={() => setLogs([])} className="text-[10px] text-slate-400 hover:text-slate-600">Clear Logs</button>
               </div>
            </div>
            <div className="bg-slate-900 text-green-400 p-2 rounded text-[10px] font-mono h-24 overflow-y-auto whitespace-pre-wrap shadow-inner">
              {logs.length === 0 ? <span className="text-slate-600 opacity-50">Waiting for events...</span> : logs.map((log, i) => <div key={i} className="mb-1 border-b border-green-900/30 pb-0.5 last:border-0">{`> ${log}`}</div>)}
            </div>
        </div>
      </div>
    </div>
  )
}

export default SidePanel