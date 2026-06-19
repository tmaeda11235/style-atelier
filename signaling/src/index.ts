export interface Env {
  SIGNALING_ROOM: DurableObjectNamespace
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // OPTIONS プリフライトに対応
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      })
    }

    const roomId =
      url.searchParams.get("roomId") || url.pathname.split("/").pop()
    if (!roomId) {
      return new Response("Missing roomId parameter", { status: 400 })
    }

    // Durable Object ID を生成して stub を取得
    const id = env.SIGNALING_ROOM.idFromName(roomId)
    const stub = env.SIGNALING_ROOM.get(id)

    // すべて stub に転送
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

  // HTTPリレーデータキャッシュ
  relayData: string | null = null

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // WebSocketアップグレードリクエストの場合
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair()
      const client = pair[0]
      const server = pair[1]

      this.handleWebSocket(server)

      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: {
          "Access-Control-Allow-Origin": "*"
        }
      })
    }

    // CORS レスポンスヘルパー
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders })
    }

    // HTTP Relay: GET
    if (request.method === "GET" && url.pathname.includes("/api/sync/")) {
      const data = this.relayData
      if (data) {
        this.relayData = null // 一度読み出したら消去（モックサーバーと同じ挙動）
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      } else {
        return new Response(JSON.stringify({ error: "No relay data found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
    }

    // HTTP Relay: POST
    if (request.method === "POST" && url.pathname.includes("/api/sync/")) {
      try {
        const payload = (await request.json()) as { data: string }
        this.relayData = payload.data

        // WebSocketで接続しているピアがあれば通知する
        const notification = JSON.stringify({
          type: "relay-data",
          data: payload.data
        })
        if (this.ws1) {
          try {
            this.ws1.send(notification)
          } catch {
            // ignore
          }
        }
        if (this.ws2) {
          try {
            this.ws2.send(notification)
          } catch {
            // ignore
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        return new Response(
          JSON.stringify({ error: errMsg || "Invalid JSON" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        )
      }
    }

    return new Response("Expected Upgrade: websocket", {
      status: 426,
      headers: corsHeaders
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
