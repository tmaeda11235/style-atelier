/* eslint-disable */
const http = require("http")
const url = require("url")
const WebSocket = require("ws")

const port = process.env.PORT || 9000

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" })
  res.end("Signaling server is running.\n")
})

const wss = new WebSocket.Server({ server })
const rooms = new Map() // roomId -> Set of ws clients

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
