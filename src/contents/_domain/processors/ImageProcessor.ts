import type { IExtractor, IProcessor } from "../interfaces"

export class ImageProcessor implements IProcessor {
  private extractor: IExtractor
  private debugMode: boolean

  constructor(extractor: IExtractor, debugMode: boolean = false) {
    this.extractor = extractor
    this.debugMode = debugMode
  }

  process(element: HTMLElement): void {
    const img = element as HTMLImageElement
    if (img.tagName !== "IMG") return

    // Prevent duplicate observation
    if (img.dataset.saObserved) return
    img.dataset.saObserved = "true"

    if (this.debugMode) {
      img.style.outline = "2px solid #00ff00"
      img.style.outlineOffset = "-2px"
    }

    // Ensure draggable is enabled for interaction
    img.draggable = true
    img.style.cursor = "grab"

    img.addEventListener("dragstart", (e) => {
      const data = this.extractor.extract(img)
      if (!data) return

      if (e.dataTransfer) {
        try {
          // Attach custom data for the extension side panel
          e.dataTransfer.setData("application/json", JSON.stringify(data))
        } catch (err) {
          console.error("Style Atelier: Failed to attach data", err)
        }
      }
    }, { capture: true })
  }
}