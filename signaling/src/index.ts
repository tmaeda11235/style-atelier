export interface Env {
  SIGNALING_ROOM: DurableObjectNamespace
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const roomId = url.searchParams.get("roomId")
    if (!roomId) {
      return new Response("Missing roomId parameter", { status: 400 })
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 })
    }

    // roomId から Durable Object ID を生成
    const id = env.SIGNALING_ROOM.idFromName(roomId)
    const stub = env.SIGNALING_ROOM.get(id)

    // Durable Object にリクエストを転送
    return stub.fetch(request)
  }
}

// Durable Object クラスの実装
export class SignalingRoom implements DurableObject {
  state: DurableObjectState
  env: Env

  // インメモリでのペア接続管理
  ws1: WebSocket | null = null
  ws2: WebSocket | null = null

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 })
    }

    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1]

    this.handleWebSocket(server)

    return new Response(null, {
      status: 101,
      webSocket: client
    })
  }

  handleWebSocket(ws: WebSocket) {
    ws.accept()

    if (!this.ws1) {
      this.ws1 = ws
    } else if (!this.ws2) {
      this.ws2 = ws
    } else {
      // 3人目以降は切断
      ws.close(1008, "Room is full")
      return
    }

    ws.addEventListener("message", (event) => {
      const target = ws === this.ws1 ? this.ws2 : this.ws1
      if (target) {
        try {
          target.send(event.data)
        } catch (err) {
          console.error("Failed to forward message:", err)
        }
      }
    })

    const cleanup = () => {
      if (ws === this.ws1) {
        this.ws1 = null
        if (this.ws2) {
          try {
            this.ws2.close()
          } catch {
            // ignore
          }
          this.ws2 = null
        }
      } else if (ws === this.ws2) {
        this.ws2 = null
        if (this.ws1) {
          try {
            this.ws1.close()
          } catch {
            // ignore
          }
          this.ws1 = null
        }
      }
    }

    ws.addEventListener("close", cleanup)
    ws.addEventListener("error", cleanup)
  }
}
