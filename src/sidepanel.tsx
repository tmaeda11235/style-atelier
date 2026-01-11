import { useState, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import "./style.css"
import { db } from "./lib/db"
import type { HistoryItem, StyleCard, Deck, PromptSegment } from "./lib/db-schema"
import { parsePrompt, buildPromptString } from "./lib/prompt-utils"
import { BubbleEditor } from "./components/bubble/BubbleEditor"

type Tab = "history" | "library" | "decks";

function SidePanel() {
  const [logs, setLogs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<Tab>("history");
  const [newDeckName, setNewDeckName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [droppedItem, setDroppedItem] = useState<HistoryItem | null>(null);
  
  const [mintingItem, setMintingItem] = useState<HistoryItem | null>(null);
  const [editedSegments, setEditedSegments] = useState<PromptSegment[]>([]);

  const historyItems = useLiveQuery(() => db.historyItems.orderBy('timestamp').reverse().toArray())
  const styleCards = useLiveQuery(() => db.styleCards.orderBy('createdAt').reverse().toArray())
  const decks = useLiveQuery(() => db.decks.orderBy('lastUsedAt').reverse().toArray())

  useEffect(() => {
    if (mintingItem) {
      const { promptSegments } = parsePrompt(mintingItem.fullCommand);
      setEditedSegments(promptSegments);
    }
  }, [mintingItem]);


  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 20))

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addLog("Drop event received.");
    const jsonData = e.dataTransfer.getData("application/json");
    if (!jsonData) { addLog("No JSON data in drop event."); return; }
    try {
      const item = JSON.parse(jsonData) as HistoryItem;
      if (item && item.id && item.imageUrl) {
        await db.historyItems.put(item);
        addLog(`History item ${item.id} saved.`);
        setDroppedItem(item);
        setActiveTab("history");
        setTimeout(() => setDroppedItem(null), 3000);
      } else { addLog("Invalid history item data."); }
    } catch (err) { console.error("Failed to handle drop:", err); addLog(`Error handling drop event: ${err.message}`); }
  };

  const handleStartMinting = (historyItem: HistoryItem) => {
    setMintingItem(historyItem);
  }

  const handleSaveMintedCard = async () => {
    if (!mintingItem) return;
    addLog(`Saving card from history item: ${mintingItem.id}`);
    const { parameters } = parsePrompt(mintingItem.fullCommand);

    const newCard: StyleCard = {
      id: crypto.randomUUID(),
      name: editedSegments.length > 0 && editedSegments[0].type === 'text' ? editedSegments[0].value.substring(0, 20) : "New Card",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      promptSegments: editedSegments,
      parameters,
      masking: { isSrefHidden: false, isPHidden: false, },
      tier: 'Common',
      isFavorite: false,
      usageCount: 0,
      tags: [],
      dominantColor: "#ffffff",
      thumbnailData: mintingItem.imageUrl,
      frameId: "default",
      genealogy: {
        generation: 1,
        parentIds: [],
        originCreatorId: "user",
        mutationNote: `Minted from history item ${mintingItem.id}`
      }
    };

    try {
      await db.styleCards.put(newCard);
      addLog(`New StyleCard "${newCard.name}" minted successfully!`);
      setMintingItem(null);
      setActiveTab("library");
    } catch (err) {
      console.error("Failed to mint StyleCard:", err);
      addLog("Error: Failed to mint StyleCard.");
    }
  }

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return;
    const newDeck: Deck = {
      id: crypto.randomUUID(),
      name: newDeckName.trim(),
      cardIds: [],
      lastUsedAt: Date.now(),
    };
    try {
      await db.decks.put(newDeck);
      addLog(`Deck "${newDeck.name}" created.`);
      setNewDeckName("");
    } catch (err) {
      console.error("Failed to create deck:", err);
      addLog("Error: Failed to create deck.");
    }
  }

  const handleCardClick = (card: StyleCard) => {
    const prompt = buildPromptString(card.promptSegments, card.parameters);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0]
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, {
          type: "INJECT_PROMPT",
          prompt: prompt
        }).catch(err => {
            addLog(`Note: ${err.message || 'Could not send to tab'}`)
        })
        addLog(`Sent prompt: ${prompt.substring(0, 30)}...`)
      } else {
          addLog("No active tab found")
      }
    })
  }

  const renderHistory = () => (
    <div className="space-y-3">
    {historyItems?.map(item => (
      <div key={item.id} className="bg-white border border-slate-200 rounded-lg shadow-sm flex gap-3 p-2">
        <img src={item.imageUrl} alt={item.id} className="w-24 h-24 rounded object-cover" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-600 line-clamp-3 my-1" title={item.fullCommand}>{item.fullCommand}</p>
          <button onClick={() => handleStartMinting(item)} className="mt-2 text-xs text-blue-600 font-medium">Mint Card</button>
        </div>
      </div>
    ))}
  </div>
  );

  const renderLibrary = () => (
    <div className="grid grid-cols-2 gap-3">
    {styleCards?.map(card => (
      <div key={card.id} onClick={() => handleCardClick(card)} className="bg-white border border-slate-200 rounded-lg shadow-sm cursor-pointer">
          <img src={card.thumbnailData} alt={card.name} className="aspect-square w-full object-cover rounded-t-lg" />
          <div className="p-2">
              <p className="text-xs font-bold text-slate-800 truncate">{card.name}</p>
          </div>
      </div>
    ))}
  </div>
  );

  const renderDecks = () => (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input type="text" value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)} placeholder="New deck name..." className="flex-grow p-2 border rounded-md text-sm"/>
        <button onClick={handleCreateDeck} className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium">Create</button>
      </div>
      {decks?.map(deck => (
        <div key={deck.id} className="bg-white p-3 border rounded-lg shadow-sm">
          <h3 className="font-bold text-slate-800">{deck.name}</h3>
          <p className="text-xs text-slate-500 mt-1">{deck.cardIds.length} cards</p>
        </div>
      ))}
    </div>
  );
  
  const renderMintingView = () => (
    <div className="absolute inset-0 bg-slate-50 z-20 flex flex-col">
      <div className="p-4 bg-white shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Mint New Card</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <img src={mintingItem.imageUrl} className="w-full h-auto rounded-lg mb-4 shadow-md" />
        <BubbleEditor initialSegments={editedSegments} onChange={setEditedSegments} />
      </div>
       <div className="p-4 bg-white shadow-t-sm flex justify-end gap-2">
        <button onClick={() => setMintingItem(null)} className="px-4 py-2 text-sm text-slate-600 rounded-md hover:bg-slate-100">Cancel</button>
        <button onClick={handleSaveMintedCard} className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600">Save Card</button>
      </div>
    </div>
  );

  return (
    <div className={`w-full h-screen flex flex-col font-sans text-slate-800 transition-colors ${isDragging ? 'bg-blue-50' : 'bg-slate-50'}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {mintingItem && renderMintingView()}
      <div className="p-4 bg-white shadow-sm z-10">
        <h1 className="text-xl font-bold">Style Atelier</h1>
        <div className="mt-2"><nav className="-mb-px flex space-x-4 border-b border-slate-200"><button onClick={() => setActiveTab("history")} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>History</button><button onClick={() => setActiveTab("library")} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'library' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Library</button><button onClick={() => setActiveTab("decks")} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'decks' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Decks</button></nav></div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {droppedItem && <div className="p-3 border rounded bg-white shadow-lg ring-2 ring-blue-500"><p className="text-xs font-bold uppercase">New History Item Added!</p></div>}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'library' && renderLibrary()}
        {activeTab === 'decks' && renderDecks()}

        <div className="w-full mt-8 border-t border-slate-200 pt-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Debug Logs</p>
            <div className="flex gap-2">
              <button 
                onClick={async () => {
                  if (window.confirm("Are you sure you want to delete ALL DATA?")) {
                    await Promise.all([db.historyItems.clear(), db.styleCards.clear(), db.decks.clear(), db.userSettings.clear()])
                    addLog("All data cleared.")
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