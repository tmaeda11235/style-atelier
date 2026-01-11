import type { IService, IProcessor } from "../domain/interfaces"

export class GalleryObserver implements IService {
  private observer: MutationObserver | null = null
  private processor: IProcessor

  constructor(processor: IProcessor) {
    this.processor = processor
  }

  start(): void {
    if (this.observer) return

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.tagName === "IMG") {
                this.processor.process(node as HTMLElement)
            }
            // Check children for images as well
            node.querySelectorAll("img").forEach((img) => {
                this.processor.process(img as HTMLElement)
            })
          }
        })
      })
    })

    this.observer.observe(document.body, { childList: true, subtree: true })
    
    // Initial scan
    document.querySelectorAll("img").forEach((img) => {
        this.processor.process(img as HTMLElement)
    })
    
    console.log("Style Atelier: Gallery Observer started")
  }

  stop(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
      console.log("Style Atelier: Gallery Observer stopped")
    }
  }
}