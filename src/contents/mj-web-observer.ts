import type { PlasmoCSConfig } from "plasmo"
import { WebDataExtractor } from "./domain/extractors/WebDataExtractor"
import { ImageProcessor } from "./domain/processors/ImageProcessor"
import { PromptInjector } from "./domain/actions/PromptInjector"
import { GalleryObserver } from "./services/GalleryObserver"
import { CommandListener } from "./services/CommandListener"

export const config: PlasmoCSConfig = {
  matches: ["https://midjourney.com/*", "https://*.midjourney.com/*"],
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