import React, { useEffect, useState } from "react"
import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
import { renderCardToCanvas, exportCardAsImage } from "../lib/export-utils"
import { Button } from "../components/atoms/Button"
import { Clipboard, Download, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"
import "../style.css"

export default function SharePage() {
  const [card, setCard] = useState<StyleCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadCard() {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const id = urlParams.get("id")
        if (!id) {
          throw new Error("No card ID provided in URL parameters.")
        }

        const foundCard = await db.styleCards.get(id)
        if (!foundCard) {
          throw new Error("Style card not found in database.")
        }

        setCard(foundCard)

        // Render card image
        const canvas = await renderCardToCanvas(foundCard)
        const dataUrl = canvas.toDataURL("image/png")
        setImageSrc(dataUrl)
      } catch (err: any) {
        console.error("Error loading shared card:", err)
        setErrorMessage(err.message || "Failed to load card.")
      } finally {
        setLoading(false)
      }
    }

    loadCard()
  }, [])

  const handleCopyToClipboard = async () => {
    if (!card) return
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      const canvas = await renderCardToCanvas(card)
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setErrorMessage("Failed to generate image blob.")
          return
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ])
          setSuccessMessage("Copied card image to clipboard! You can now paste it into Discord, X, etc.")
        } catch (clipErr: any) {
          console.error("Clipboard Item write failed:", clipErr)
          // Fallback to text copy or show manual copy instructions
          setErrorMessage("Browser blocked clipboard write. Right click the image and select 'Copy image'.")
        }
      }, "image/png")
    } catch (err: any) {
      console.error("Clipboard copy failed:", err)
      setErrorMessage("Failed to copy image to clipboard.")
    }
  }

  const handleDownload = async () => {
    if (!card) return
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      await exportCardAsImage(card)
      setSuccessMessage("Download started successfully!")
    } catch (err) {
      console.error("Download failed:", err)
      setErrorMessage("Failed to download card image.")
    }
  }



  const handleClose = () => {
    window.close()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 rounded-full border-4 border-t-blue-500 border-slate-800 animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Loading Style Card...</p>
      </div>
    )
  }

  if (errorMessage && !card) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-16 h-16 bg-red-950 border border-red-500/30 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold mb-2">Error Loading Card</h1>
        <p className="text-sm text-slate-400 max-w-md text-center mb-6">{errorMessage}</p>
        <Button onClick={handleClose} variant="secondary">
          Close Window
        </Button>
      </div>
    )
  }

  if (!card) return null

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-6 font-sans">
      {/* Header Bar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-black tracking-wider text-white">Style Atelier</h1>
            <p className="text-[10px] text-slate-500">Premium Midjourney Style Manager</p>
          </div>
        </div>
        <div className="text-xs px-3 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
          Generated Card View
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-5xl w-full mx-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-8">
        {/* Card Image Display column */}
        <div className="md:col-span-6 flex flex-col items-center justify-center">
          {imageSrc ? (
            <div className="relative group max-w-sm w-full rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.15)] border border-slate-800/80 transition-all hover:scale-[1.01]">
              <img
                src={imageSrc}
                alt={card.name}
                className="w-full h-auto object-contain cursor-zoom-in"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <p className="text-xs text-white bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-700/80">
                  Right click to copy or save
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-[600/850] max-w-sm bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          )}
        </div>

        {/* Card Details & Sharing column */}
        <div className="md:col-span-6 flex flex-col gap-6">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500">
              Style Details
            </span>
            <h2 className="text-2xl font-black text-white">{card.name}</h2>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-400">
                {card.tier}
              </span>
              {card.category && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/40 border border-blue-900/30 text-blue-400">
                  Category: {card.category}
                </span>
              )}
            </div>
          </div>

          {/* Feedback Messages */}
          {successMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/30 rounded-xl text-emerald-400 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-800/30 rounded-xl text-red-400 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Dashboard */}
          <div className="bg-slate-900/50 border border-slate-800/60 p-5 rounded-2xl flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Sharing Options
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={handleCopyToClipboard}
                className="py-3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                <Clipboard className="w-4 h-4" />
                Copy Image
              </Button>

              <Button
                onClick={handleDownload}
                variant="outline"
                className="py-3 flex items-center justify-center gap-2 border-slate-800 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </Button>
            </div>



            <p className="text-[10px] text-slate-500 leading-relaxed">
              Tip: You can paste the copied card image directly into chat apps like Discord, or post it to X (Twitter). The card includes an embedded QR code that anyone can scan to import this style into their own Style Atelier workspace.
            </p>
          </div>

          {/* Metadata Display */}
          <div className="bg-slate-900/30 border border-slate-800/40 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Style Specifications
            </h3>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 block">Prompt Segment Preview</span>
              <p className="text-xs text-slate-300 font-mono bg-slate-950 p-2.5 rounded border border-slate-900 overflow-x-auto whitespace-pre-wrap">
                {card.promptSegments?.map(s => s.value).join(" ") || "No prompt segments."}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto pt-6 border-t border-slate-900 text-center text-[10px] text-slate-600 mt-auto">
        Style Atelier &copy; {new Date().getFullYear()} - Local-first prompt management
      </footer>
    </div>
  )
}
