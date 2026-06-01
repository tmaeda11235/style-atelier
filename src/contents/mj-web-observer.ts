import type { PlasmoCSConfig } from "plasmo"
import { WebDataExtractor } from "./_domain/extractors/WebDataExtractor"
import { ImageProcessor } from "./_domain/processors/ImageProcessor"
import { PromptInjector } from "./_domain/actions/PromptInjector"
import { GalleryObserver } from "./_services/GalleryObserver"
import { CommandListener } from "./_services/CommandListener"

export const config: PlasmoCSConfig = {
  matches: [
    "https://midjourney.com/*",
    "https://*.midjourney.com/*",
    "https://*.discord.com/*",
    "https://*.discordapp.com/*",
    "https://*.discordapp.net/*"
  ],
  all_frames: true,
  run_at: "document_start"
}

const DEBUG_MODE = false

function main() {
  console.log("Style Atelier: Initializing...")

  // Initialize Domain Logic
  const extractor = new WebDataExtractor()
  const processor = new ImageProcessor(extractor, DEBUG_MODE)
  const injector = new PromptInjector()

  // Initialize Services
  const galleryObserver = new GalleryObserver(processor)
  const commandListener = new CommandListener(injector)

  // Start Services
  // Ensure DOM is ready before starting observer
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", () => galleryObserver.start())
  } else {
    galleryObserver.start()
  }
  
  // Start command listener immediately
  commandListener.start()
  
  // Ensure observer runs after full load as well for late injections
  window.addEventListener("load", () => galleryObserver.start())
}

main()