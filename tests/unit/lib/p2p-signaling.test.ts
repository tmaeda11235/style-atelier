import { describe, expect, it } from "vitest"

import {
  BroadcastChannelSignalingChannel,
  LocalStorageSignalingChannel
} from "../../../src/lib/p2p-signaling"

describe("p2p-signaling mocks", () => {
  describe("BroadcastChannelSignalingChannel", () => {
    it("should send and receive messages", async () => {
      const channelName = "test-bc-channel"
      const sender = new BroadcastChannelSignalingChannel(channelName)
      const receiver = new BroadcastChannelSignalingChannel(channelName)

      const receivedPromise = new Promise<any>((resolve) => {
        receiver.onMessage = (msg) => resolve(msg)
      })

      // Wait a moment for simulation setup
      await new Promise((resolve) => setTimeout(resolve, 50))

      sender.send({ hello: "world" })

      const result = await receivedPromise
      expect(result).toEqual({ hello: "world" })

      sender.close()
      receiver.close()
    })
  })

  describe("LocalStorageSignalingChannel", () => {
    it("should send and receive messages using localStorage fallback", async () => {
      const roomId = "test-room-id"
      const sender = new LocalStorageSignalingChannel("sender", roomId)
      const receiver = new LocalStorageSignalingChannel("receiver", roomId)

      const receivedPromise = new Promise<any>((resolve) => {
        receiver.onMessage = (msg) => resolve(msg)
      })

      // Wait a moment for simulation setup
      await new Promise((resolve) => setTimeout(resolve, 50))

      sender.send({ foo: "bar" })

      const result = await receivedPromise
      expect(result).toEqual({ foo: "bar" })

      sender.close()
      receiver.close()
    })
  })
})
