import { expect, test } from "@playwright/test"

test.describe("WebRTC Local Signaling & Mocks @J-PWA-P2P-SYNC-01", () => {
  test("should exchange messages via local WebSocket signaling server", async ({
    page
  }) => {
    const signalingPort = process.env.SIGNALING_PORT || "9000"
    const wsUrl = `ws://localhost:${signalingPort}?roomId=test-room`

    // Navigate to the test sandbox home
    await page.goto("/tests/sandbox/index.html")

    // Execute WebSocket interaction inside browser page context
    const receivedMessage = await page.evaluate((url) => {
      return new Promise<string>((resolve, reject) => {
        const ws1 = new WebSocket(url)
        const ws2 = new WebSocket(url)
        let resolved = false

        ws2.onmessage = (event) => {
          resolved = true
          ws1.close()
          ws2.close()
          resolve(event.data)
        }

        ws1.onopen = () => {
          // Wait a bit to ensure ws2 is also connected before sending offer
          setTimeout(() => {
            ws1.send(JSON.stringify({ type: "offer", sdp: "dummy-sdp" }))
          }, 150)
        }

        // Timeout fallback
        setTimeout(() => {
          if (!resolved) {
            ws1.close()
            ws2.close()
            reject(
              new Error("Timeout waiting for message on WebSocket signaling")
            )
          }
        }, 5000)
      })
    }, wsUrl)

    const parsed = JSON.parse(receivedMessage)
    expect(parsed.type).toBe("offer")
    expect(parsed.sdp).toBe("dummy-sdp")
  })

  test("should exchange messages via BroadcastChannel signaling mock", async ({
    page
  }) => {
    await page.goto("/tests/sandbox/index.html")

    const receivedMessage = await page.evaluate(() => {
      return new Promise<string>((resolve, reject) => {
        const bc1 = new BroadcastChannel("test-bc-room")
        const bc2 = new BroadcastChannel("test-bc-room")
        let resolved = false

        bc2.onmessage = (event) => {
          resolved = true
          bc1.close()
          bc2.close()
          resolve(JSON.stringify(event.data))
        }

        // Send a message after setup
        setTimeout(() => {
          bc1.postMessage({ type: "candidate", candidate: "dummy-candidate" })
        }, 100)

        // Timeout fallback
        setTimeout(() => {
          if (!resolved) {
            bc1.close()
            bc2.close()
            reject(
              new Error("Timeout waiting for message on BroadcastChannel mock")
            )
          }
        }, 3000)
      })
    })

    const parsed = JSON.parse(receivedMessage)
    expect(parsed.type).toBe("candidate")
    expect(parsed.candidate).toBe("dummy-candidate")
  })

  test("should exchange messages via LocalStorage signaling mock", async ({
    page
  }) => {
    await page.goto("/tests/sandbox/index.html")

    const receivedMessage = await page.evaluate(() => {
      return new Promise<string>((resolve, reject) => {
        const roomId = "test-ls-room"
        const senderKey = `p2p_sig_${roomId}_sender`
        const receiverKey = `p2p_sig_${roomId}_receiver`

        localStorage.removeItem(senderKey)
        localStorage.removeItem(receiverKey)

        let resolved = false

        // Listen for storage events (if tabs/windows were separated, but here we are in same page context)
        window.addEventListener("storage", (event) => {
          if (event.key === senderKey && event.newValue) {
            resolved = true
            const payload = JSON.parse(event.newValue)
            resolve(JSON.stringify(payload.data))
          }
        })

        // Poll for changes (since storage events do not fire on the same window/document that triggers the change)
        const intervalId = setInterval(() => {
          const raw = localStorage.getItem(senderKey)
          if (raw) {
            resolved = true
            clearInterval(intervalId)
            const payload = JSON.parse(raw)
            resolve(JSON.stringify(payload.data))
          }
        }, 100)

        // Set value in localStorage to trigger message
        setTimeout(() => {
          const payload = {
            id: "msg-12345",
            data: { type: "answer", sdp: "dummy-answer" }
          }
          localStorage.setItem(senderKey, JSON.stringify(payload))
        }, 150)

        // Timeout fallback
        setTimeout(() => {
          if (!resolved) {
            clearInterval(intervalId)
            reject(
              new Error("Timeout waiting for message on LocalStorage mock")
            )
          }
        }, 3000)
      })
    })

    const parsed = JSON.parse(receivedMessage)
    expect(parsed.type).toBe("answer")
    expect(parsed.sdp).toBe("dummy-answer")
  })
})
