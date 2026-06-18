/**
 * Interface representing a simple communication channel for WebRTC signaling.
 */
export interface SignalingChannel {
  send(message: any): void
  onMessage?: (message: any) => void
  onOpen?: () => void
  onClose?: () => void
  close(): void
}

/**
 * WebSocket implementation of the SignalingChannel.
 * Used for real P2P sync across network devices via signaling server.
 */
export class WebSocketSignalingChannel implements SignalingChannel {
  private ws: WebSocket | null = null
  public onMessage?: (message: any) => void
  public onOpen?: () => void
  public onClose?: () => void

  constructor(url: string) {
    this.ws = new WebSocket(url)
    this.ws.onopen = () => {
      if (this.onOpen) this.onOpen()
    }
    this.ws.onmessage = (event) => {
      if (this.onMessage) {
        try {
          const data = JSON.parse(event.data)
          this.onMessage(data)
        } catch {
          this.onMessage(event.data)
        }
      }
    }
    this.ws.onclose = () => {
      if (this.onClose) this.onClose()
    }
    this.ws.onerror = (err) => {
      console.error("[WebSocketSignalingChannel] error:", err)
    }
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const dataStr =
        typeof message === "string" ? message : JSON.stringify(message)
      this.ws.send(dataStr)
    } else {
      console.warn("[WebSocketSignalingChannel] cannot send, WS is not open")
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

/**
 * BroadcastChannel implementation of the SignalingChannel.
 * Useful for offline development and local tab-to-tab simulation.
 */
export class BroadcastChannelSignalingChannel implements SignalingChannel {
  private bc: BroadcastChannel | null = null
  public onMessage?: (message: any) => void
  public onOpen?: () => void
  public onClose?: () => void

  constructor(channelName: string) {
    this.bc = new BroadcastChannel(channelName)
    this.bc.onmessage = (event) => {
      if (this.onMessage) {
        this.onMessage(event.data)
      }
    }
    // BroadcastChannel has no real "open" state, we simulate it
    setTimeout(() => {
      if (this.onOpen) this.onOpen()
    }, 0)
  }

  send(message: any): void {
    if (this.bc) {
      this.bc.postMessage(message)
    } else {
      console.warn(
        "[BroadcastChannelSignalingChannel] cannot send, BC is closed"
      )
    }
  }

  close(): void {
    if (this.bc) {
      this.bc.close()
      this.bc = null
      if (this.onClose) this.onClose()
    }
  }
}

/**
 * LocalStorage implementation of the SignalingChannel.
 * Fallback mockup for contexts where BroadcastChannel is not supported.
 */
export class LocalStorageSignalingChannel implements SignalingChannel {
  private key: string
  private peerKey: string
  private intervalId: any = null
  private lastProcessedId: string | null = null
  public onMessage?: (message: any) => void
  public onOpen?: () => void
  public onClose?: () => void

  constructor(role: "sender" | "receiver", roomId: string) {
    this.key = `p2p_sig_${roomId}_${role}`
    this.peerKey = `p2p_sig_${roomId}_${role === "sender" ? "receiver" : "sender"}`

    // Clear old state
    localStorage.removeItem(this.key)

    // Listen to changes in localStorage
    if (typeof window !== "undefined") {
      window.addEventListener("storage", this.handleStorageEvent)
      // Polling fallback in case storage event does not fire (same window)
      this.intervalId = setInterval(() => {
        this.pollPeerData()
      }, 200)
    }

    setTimeout(() => {
      if (this.onOpen) this.onOpen()
    }, 0)
  }

  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key === this.peerKey && event.newValue) {
      this.processRawValue(event.newValue)
    }
  }

  private pollPeerData() {
    const rawVal = localStorage.getItem(this.peerKey)
    if (rawVal) {
      this.processRawValue(rawVal)
    }
  }

  private processRawValue(rawVal: string) {
    try {
      const parsed = JSON.parse(rawVal)
      if (parsed && parsed.id !== this.lastProcessedId) {
        this.lastProcessedId = parsed.id
        if (this.onMessage) {
          this.onMessage(parsed.data)
        }
      }
    } catch (err) {
      console.error("[LocalStorageSignalingChannel] parse error:", err)
    }
  }

  send(message: any): void {
    const payload = {
      id: Math.random().toString(36).substring(2, 9),
      data: message
    }
    localStorage.setItem(this.key, JSON.stringify(payload))
  }

  close(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", this.handleStorageEvent)
    }
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    localStorage.removeItem(this.key)
    if (this.onClose) this.onClose()
  }
}
