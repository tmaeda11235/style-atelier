import type { SignalingChannel } from "./p2p-signaling"

export interface P2PConnectionOptions {
  signalingChannel: SignalingChannel
  isHost: boolean // PC側なら true (受信側), モバイル側なら false (送信側)
  rtcConfig?: RTCConfiguration
  onDataChannelOpen?: () => void
  onDataChannelClose?: () => void
  onMessageReceived?: (data: string | ArrayBuffer) => void
  onError?: (err: Error) => void
  onStatusChange?: (status: string) => void
}

export class P2PConnection {
  private pc: RTCPeerConnection | null = null
  private channel: RTCDataChannel | null = null
  private sigChannel: SignalingChannel
  private isHost: boolean
  private rtcConfig: RTCConfiguration
  private options: P2PConnectionOptions

  constructor(options: P2PConnectionOptions) {
    this.options = options
    this.sigChannel = options.signalingChannel
    this.isHost = options.isHost
    this.rtcConfig = options.rtcConfig || {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    }

    this.init()
  }

  private init() {
    this.pc = new RTCPeerConnection(this.rtcConfig)
    this.setupIceHandlers()
    this.setupDataChannelNegotiation()
    this.setupSignalingHandlers()
  }

  private setupIceHandlers() {
    this.pc!.onicecandidate = (event) => {
      if (event.candidate) {
        this.emitStatus("sending-candidate")
        this.sigChannel.send({
          type: "candidate",
          candidate: event.candidate
        })
      }
    }

    this.pc!.onconnectionstatechange = () => {
      this.emitStatus(`connection-state-${this.pc?.connectionState}`)
    }
  }

  private setupDataChannelNegotiation() {
    if (this.isHost) {
      this.pc!.ondatachannel = (event) => {
        this.channel = event.channel
        this.setupDataChannel(this.channel)
      }
    } else {
      this.channel = this.pc!.createDataChannel("sync-channel", {
        ordered: true
      })
      this.setupDataChannel(this.channel)
    }
  }

  private async handleTurnCredentials(message: any) {
    this.emitStatus("received-turn-credentials")
    if (this.pc && message.iceServers) {
      try {
        const currentConfig = this.pc.getConfiguration()
        const newIceServers = [
          ...(currentConfig.iceServers || []),
          ...message.iceServers
        ]
        this.pc.setConfiguration({
          ...currentConfig,
          iceServers: newIceServers
        })
        this.emitStatus("applied-turn-credentials")
      } catch (cfgErr) {
        console.error("[P2PConnection] Failed to setConfiguration:", cfgErr)
      }
    }
  }

  private handleRelayData(message: any) {
    this.emitStatus("received-relay-data")
    if (this.options.onMessageReceived) {
      this.options.onMessageReceived(message.data)
    }
  }

  private async handleOffer(message: any) {
    this.emitStatus("received-offer")
    await this.pc!.setRemoteDescription(new RTCSessionDescription(message))
    const answer = await this.pc!.createAnswer()
    await this.pc!.setLocalDescription(answer)
    this.sigChannel.send(answer)
    this.emitStatus("sent-answer")
  }

  private async handleAnswer(message: any) {
    this.emitStatus("received-answer")
    await this.pc!.setRemoteDescription(new RTCSessionDescription(message))
  }

  private async handleCandidate(message: any) {
    this.emitStatus("received-candidate")
    if (message.candidate) {
      await this.pc!.addIceCandidate(new RTCIceCandidate(message.candidate))
    }
  }

  private setupSignalingHandlers() {
    this.sigChannel.onMessage = async (message) => {
      try {
        if (message.type === "turn-credentials") {
          await this.handleTurnCredentials(message)
        } else if (message.type === "relay-data") {
          this.handleRelayData(message)
        } else if (message.type === "offer" && this.isHost) {
          await this.handleOffer(message)
        } else if (message.type === "answer" && !this.isHost) {
          await this.handleAnswer(message)
        } else if (message.type === "candidate") {
          await this.handleCandidate(message)
        }
      } catch (err) {
        this.emitError(err instanceof Error ? err : new Error(String(err)))
      }
    }

    this.sigChannel.onOpen = async () => {
      this.emitStatus("signaling-open")
      if (!this.isHost) {
        try {
          this.emitStatus("creating-offer")
          const offer = await this.pc!.createOffer()
          await this.pc!.setLocalDescription(offer)
          this.sigChannel.send(offer)
          this.emitStatus("sent-offer")
        } catch (err) {
          this.emitError(err instanceof Error ? err : new Error(String(err)))
        }
      }
    }

    this.sigChannel.onClose = () => {
      this.emitStatus("signaling-close")
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.binaryType = "arraybuffer"
    // Set default threshold for flow control to 64KB
    channel.bufferedAmountLowThreshold = 65536

    channel.onopen = () => {
      this.emitStatus("datachannel-open")
      if (this.options.onDataChannelOpen) {
        this.options.onDataChannelOpen()
      }
    }

    channel.onclose = () => {
      this.emitStatus("datachannel-close")
      if (this.options.onDataChannelClose) {
        this.options.onDataChannelClose()
      }
    }

    channel.onmessage = (event) => {
      if (this.options.onMessageReceived) {
        this.options.onMessageReceived(event.data)
      }
    }

    channel.onerror = (event) => {
      this.emitError(new Error("DataChannel error: " + JSON.stringify(event)))
    }
  }

  public send(data: string | ArrayBuffer | Uint8Array) {
    if (this.channel && this.channel.readyState === "open") {
      this.channel.send(data as any)
    } else {
      throw new Error("Data channel is not open")
    }
  }

  public getBufferedAmount(): number {
    return this.channel ? this.channel.bufferedAmount : 0
  }

  public setOnBufferedAmountLow(callback: (() => void) | null) {
    if (this.channel) {
      this.channel.onbufferedamountlow = callback
    }
  }

  public setBufferedAmountLowThreshold(threshold: number) {
    if (this.channel) {
      this.channel.bufferedAmountLowThreshold = threshold
    }
  }

  public close() {
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
    if (this.pc) {
      this.pc.close()
      this.pc = null
    }
    this.sigChannel.close()
  }

  private emitStatus(status: string) {
    if (this.options.onStatusChange) {
      this.options.onStatusChange(status)
    }
  }

  private emitError(err: Error) {
    if (this.options.onError) {
      this.options.onError(err)
    }
  }
}
