/* eslint-disable */
const http = require("http")
const url = require("url")
const WebSocket = require("ws")

const port = process.env.PORT || 9000

const rooms = new Map() // roomId -> Set of ws clients
const relayData = new Map() // roomId -> { data, timestamp }

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  const parsedUrl = url.parse(req.url, true)
  const pathname = parsedUrl.pathname

  // POST /api/sync/:roomId
  if (req.method === "POST" && pathname.startsWith("/api/sync/")) {
    const roomId = pathname.split("/").pop()
    let body = ""
    req.on("data", (chunk) => {
      body += chunk
    })
    req.on("end", () => {
      try {
        const payload = JSON.parse(body)
        relayData.set(roomId, {
          data: payload.data,
          timestamp: Date.now()
        })

        // Notify WebSocket client in same room if connected
        const roomClients = rooms.get(roomId)
        if (roomClients) {
          for (const client of roomClients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "relay-data",
                  data: payload.data
                })
              )
            }
          }
        }

        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ success: true }))
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "Invalid JSON" }))
      }
    })
    return
  }

  // GET /api/sync/:roomId
  if (req.method === "GET" && pathname.startsWith("/api/sync/")) {
    const roomId = pathname.split("/").pop()
    const entry = relayData.get(roomId)
    if (entry) {
      // Consume the cache (privacy-first temporary storage)
      relayData.delete(roomId)
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ data: entry.data }))
    } else {
      res.writeHead(404, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "No relay data found" }))
    }
    return
  }

  res.writeHead(200, { "Content-Type": "text/plain" })
  res.end("Signaling server is running.\n")
})

const wss = new WebSocket.Server({ server })

wss.on("connection", (ws, req) => {
  const parsedUrl = url.parse(req.url, true)
  const roomId = parsedUrl.query.roomId || "default"
  ws.roomId = roomId

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set())
  }
  rooms.get(roomId).add(ws)

  console.log(
    `Client connected to room: ${roomId}. Total clients in room: ${rooms.get(roomId).size}`
  )

  // Send turn-credentials dynamically to the newly connected client
  const username = `user_${Math.random().toString(36).substring(2, 10)}`
  const credential = `cred_${Math.random().toString(36).substring(2, 10)}`
  ws.send(
    JSON.stringify({
      type: "turn-credentials",
      iceServers: [
        {
          urls: "turn:mock.turn.server:3478",
          username: username,
          credential: credential
        }
      ]
    })
  )

  ws.on("message", (message) => {
    let dataStr
    if (Buffer.isBuffer(message)) {
      dataStr = message.toString()
    } else {
      dataStr = message
    }

    const roomClients = rooms.get(ws.roomId)
    if (roomClients) {
      for (const client of roomClients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(dataStr)
        }
      }
    }
  })

  ws.on("close", () => {
    console.log(`Client disconnected from room: ${ws.roomId}`)
    const roomClients = rooms.get(ws.roomId)
    if (roomClients) {
      roomClients.delete(ws)
      if (roomClients.size === 0) {
        rooms.delete(ws.roomId)
      }
    }
  })

  ws.on("error", (err) => {
    console.error(`WebSocket client error in room ${ws.roomId}: ${err.message}`)
  })
})

server.listen(port, () => {
  console.log(`Signaling server listening on port ${port}`)
})
