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
        // Must return true to keep channel open for async response
        const result = this.handler.handle(message.prompt);
        if (result instanceof Promise) {
          result.then((success) => {
            if (success) {
              sendResponse({ status: "success" })
            } else {
              sendResponse({ status: "error", message: "Could not find chat input area" })
            }
          });
        } else {
          // Synchronous usage or void return assumed success/handled elsewhere
          sendResponse({ status: "success" })
        }
        return true; // Keep channel open
      } else {
        sendResponse({ status: "unknown_message" })
        return false;
      }
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