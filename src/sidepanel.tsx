import { useState } from "react"
import "./style.css"

function SidePanel() {
  const [isDragging, setIsDragging] = useState(false)
  const [droppedData, setDroppedData] = useState<{src: string, prompt?: string, jobId?: string} | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 20))

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addLog("Drop event received")

    // Priority 1: Custom JSON Data (from Content Script)
    const jsonData = e.dataTransfer.getData("application/json")
    if (jsonData) {
      try {
        const data = JSON.parse(jsonData)
        addLog(`JSON received: ${data.src?.substring(0, 30)}...`)
        if (data.src) {
            setDroppedData(data)
            return
        }
      } catch (err) {
        console.error(err)
      }
    }

    // Priority 2: Standard URL (Fallback for job links)
    const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain")
    if (url) {
        addLog(`URL received: ${url.substring(0, 30)}...`)
        
        // Check if it is a Job URL
        if (url.includes("/jobs/")) {
            const match = url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/)
            if (match) {
                const jobId = match[1]
                const imageUrl = `https://cdn.midjourney.com/${jobId}/0_0.webp`
                addLog(`Resolved Job ID: ${jobId}`)
                setDroppedData({
                    src: imageUrl,
                    jobId: jobId,
                    prompt: "Prompt not available from URL"
                })
                return
            }
        }

        // Direct Image URL
        if (url.match(/\.(webp|png|jpg|jpeg|gif)$/i) || url.includes("cdn.midjourney.com")) {
             setDroppedData({ src: url })
             return
        }

        addLog("URL format not recognized as MJ image or job")
    } else {
        addLog("No URL found in drop data")
    }
  }

  return (
    <div 
        className={`w-full h-screen p-4 flex flex-col items-center font-sans transition-colors ${isDragging ? 'bg-blue-100' : 'bg-slate-50'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      <h1 className="text-xl font-bold text-slate-900 mb-4">Style Atelier</h1>
      
      {droppedData ? (
        <div className="flex-1 w-full overflow-y-auto mb-4">
            <div className="p-3 border rounded bg-white shadow-sm w-full animate-in fade-in zoom-in">
                <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Captured Asset</p>
                <div className="relative aspect-square w-full mb-3 bg-slate-100 rounded overflow-hidden">
                    <img src={droppedData.src} alt="Dropped" className="w-full h-full object-contain" />
                </div>
                
                {droppedData.prompt && (
                    <div className="mb-3">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Prompt</p>
                        <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed max-h-32 overflow-y-auto">
                            {droppedData.prompt}
                        </p>
                    </div>
                )}
                
                {droppedData.jobId && (
                     <div className="mb-3">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Job ID</p>
                        <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-600 block truncate">
                            {droppedData.jobId}
                        </code>
                    </div>
                )}

                <button 
                    onClick={() => setDroppedData(null)}
                    className="mt-2 w-full text-xs text-red-500 hover:bg-red-50 p-2 rounded transition-colors border border-transparent hover:border-red-100"
                >
                    Clear
                </button>
            </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center w-full mb-4">
            <div className="p-8 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 text-center w-full h-64 flex flex-col items-center justify-center gap-2">
                <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <p className="text-sm">Drop MJ Image Here</p>
            </div>
        </div>
      )}

      <div className="w-full">
          <div className="flex justify-between items-center mb-1">
             <p className="text-[10px] text-slate-500 uppercase font-bold">Debug Logs</p>
             <button onClick={() => setLogs([])} className="text-[10px] text-slate-400 hover:text-slate-600">Clear</button>
          </div>
          <div className="bg-slate-900 text-green-400 p-2 rounded text-[10px] font-mono h-24 overflow-y-auto whitespace-pre-wrap shadow-inner">
            {logs.length === 0 ? <span className="text-slate-600 opacity-50">Waiting for events...</span> : logs.map((log, i) => <div key={i} className="mb-1 border-b border-green-900/30 pb-0.5 last:border-0">{`> ${log}`}</div>)}
          </div>
      </div>
    </div>
  )
}

export default SidePanel