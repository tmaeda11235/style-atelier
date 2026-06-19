import { describe, expect, it } from "vitest"

import worker, { SignalingRoom } from "./index"

// Mock WebSocketPair for Node.js environment
if (typeof (globalThis as any).WebSocketPair === "undefined") {
  ;(globalThis as any).WebSocketPair = class WebSocketPair {
    0: any
    1: any
    constructor() {
      class MockServerWebSocket extends EventTarget {
        readyState = 1
        accept() {}
        send(data: any) {
          if ((this as any).partner) {
            ;(this as any).partner.dispatchEvent(
              new MessageEvent("message", { data })
            )
          }
        }
        close() {
          if ((this as any).partner) {
            ;(this as any).partner.dispatchEvent(new Event("close"))
          }
          this.dispatchEvent(new Event("close"))
        }
      }
      const ws1 = new MockServerWebSocket()
      const ws2 = new MockServerWebSocket()
      ;(ws1 as any).partner = ws2
      ;(ws2 as any).partner = ws1
      this[0] = ws1
      this[1] = ws2
    }
  }
}

// Mock global Response to support 101 status code in Node.js environment
const OriginalResponse = globalThis.Response
class MockResponse extends OriginalResponse {
  constructor(body?: any, init?: any) {
    if (init && init.status === 101) {
      const webSocket = init.webSocket
      const modifiedInit = { ...init }
      delete modifiedInit.webSocket
      modifiedInit.status = 200 // bypass range check
      super(body, modifiedInit)
      Object.defineProperty(this, "status", { value: 101, writable: false })
      if (webSocket) {
        Object.defineProperty(this, "webSocket", {
          value: webSocket,
          writable: false
        })
      }
    } else {
      super(body, init)
    }
  }
}
globalThis.Response = MockResponse as any

describe("Signaling Server Unit Tests (In-memory logic inside Durable Object)", () => {
  class MockWebSocket extends EventTarget {
    readyState = 1
    closeCalled = false
    sentData: any[] = []
    accept() {}
    send(data: any) {
      this.sentData.push(data)
    }
    close() {
      this.closeCalled = true
      this.dispatchEvent(new Event("close"))
    }
  }

  it("should register waiting client and then pair with second client", () => {
    const mockState = {
      id: { toString: () => "mock-id" },
      storage: {
        get: async () => undefined,
        put: async () => {}
      }
    } as any

    const room = new SignalingRoom(mockState, {} as any)

    const ws1 = new MockWebSocket() as unknown as WebSocket
    const ws2 = new MockWebSocket() as unknown as WebSocket

    // First client joins
    room.handleWebSocket(ws1)
    expect(room.ws1).toBe(ws1)
    expect(room.ws2).toBeNull()

    // Second client joins
    room.handleWebSocket(ws2)
    expect(room.ws1).toBe(ws1)
    expect(room.ws2).toBe(ws2)

    // Forwarding messages ws1 -> ws2
    const messageEvent1 = new MessageEvent("message", {
      data: "encrypted-sdp-from-ws1"
    })
    ws1.dispatchEvent(messageEvent1)
    expect((ws2 as any).sentData).toContain("encrypted-sdp-from-ws1")

    // Forwarding messages ws2 -> ws1
    const messageEvent2 = new MessageEvent("message", {
      data: "encrypted-ice-from-ws2"
    })
    ws2.dispatchEvent(messageEvent2)
    expect((ws1 as any).sentData).toContain("encrypted-ice-from-ws2")

    // Close ws1 -> ws2 should be closed and both reset
    ;(ws1 as any).close()
    expect(room.ws1).toBeNull()
    expect(room.ws2).toBeNull()
    expect((ws2 as any).closeCalled).toBe(true)
  })

  it("should close newly joined client if room is already full", () => {
    const mockState = {
      id: { toString: () => "mock-id" },
      storage: {
        get: async () => undefined,
        put: async () => {}
      }
    } as any

    const room = new SignalingRoom(mockState, {} as any)

    const ws1 = new MockWebSocket() as unknown as WebSocket
    const ws2 = new MockWebSocket() as unknown as WebSocket
    const ws3 = new MockWebSocket() as unknown as WebSocket

    room.handleWebSocket(ws1)
    room.handleWebSocket(ws2)

    // Third client tries to join
    room.handleWebSocket(ws3)
    expect(room.ws1).toBe(ws1)
    expect(room.ws2).toBe(ws2)
    expect((ws3 as any).closeCalled).toBe(true)
  })
})

describe("Signaling Server Integration Tests (In-Memory Worker Simulation)", () => {
  const mockState = {
    id: { toString: () => "mock-id" },
    storage: {
      get: async () => undefined,
      put: async () => {}
    }
  } as any

  // Instantiate the Durable Object room directly
  const room = new SignalingRoom(mockState, {} as any)

  // Mock Env containing the SIGNALING_ROOM Durable Object namespace
  const mockEnv = {
    SIGNALING_ROOM: {
      idFromName: (name: string) => ({ toString: () => name }),
      get: (_id: any) => {
        // Return a mock stub that forwards fetch to the signaling room instance
        return {
          fetch: async (req: Request) => {
            return room.fetch(req)
          }
        }
      }
    }
  } as any

  it("should return 400 when roomId is missing", async () => {
    const request = new Request("http://localhost/")
    const response = await worker.fetch(request, mockEnv)
    expect(response.status).toBe(400)
    const text = await response.text()
    expect(text).toContain("Missing roomId parameter")
  })

  it("should return 426 when not a WebSocket request", async () => {
    const request = new Request("http://localhost/?roomId=test-room")
    const response = await worker.fetch(request, mockEnv)
    expect(response.status).toBe(426)
    const text = await response.text()
    expect(text).toContain("Expected Upgrade: websocket")
  })

  it("should upgrade to WebSocket and pair clients successfully", async () => {
    // 1st client connection request
    const request1 = new Request("http://localhost/?roomId=test-room", {
      headers: { Upgrade: "websocket" }
    })
    const response1 = await worker.fetch(request1, mockEnv)
    expect(response1.status).toBe(101)
    const ws1 = response1.webSocket
    expect(ws1).toBeDefined()

    // 2nd client connection request
    const request2 = new Request("http://localhost/?roomId=test-room", {
      headers: { Upgrade: "websocket" }
    })
    const response2 = await worker.fetch(request2, mockEnv)
    expect(response2.status).toBe(101)
    const ws2 = response2.webSocket
    expect(ws2).toBeDefined()

    // Verify messages propagate between paired clients
    let ws2Message: string | null = null
    ws2!.addEventListener("message", (event) => {
      ws2Message = (event as any).data
    })

    ws1!.send("hello-from-client-1")
    expect(ws2Message).toBe("hello-from-client-1")

    // Verify close propagates between paired clients
    let ws2Closed = false
    ws2!.addEventListener("close", () => {
      ws2Closed = true
    })

    ws1!.close()
    expect(ws2Closed).toBe(true)
  })
})
