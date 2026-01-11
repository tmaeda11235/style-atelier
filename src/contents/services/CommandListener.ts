import type { IService, IActionHandler } from "../domain/interfaces"

export class CommandListener implements IService {
  private handler: IActionHandler
  private listener: ((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => void) | null = null

  constructor(handler: IActionHandler) {
    this.handler = handler
  }

  start(): void {
    if (this.listener) return

    this.listener = (message, sender, sendResponse) => {
      console.log("Style Atelier: Message received", message)
      if (message.type === "INJECT_PROMPT" && message.prompt) {
          this.handler.handle(message.prompt)
          sendResponse({ status: "success" })
      } else {
          sendResponse({ status: "unknown_message" })
      }
      // Return true to indicate we wish to send a response asynchronously (if needed in future)
      return false
    }

    chrome.runtime.onMessage.addListener(this.listener)
    console.log("Style Atelier: Command Listener started")
  }

  stop(): void {
    if (this.listener) {
      chrome.runtime.onMessage.removeListener(this.listener)
      this.listener = null
      console.log("Style Atelier: Command Listener stopped")
    }
  }
}