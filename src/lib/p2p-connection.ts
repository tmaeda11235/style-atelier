import type { SignalingChannel } from "./p2p-signaling"

export interface P2PConnectionOptions {
  signalingChannel: SignalingChannel
  isHost: boolean // PC側なら true (受信側), モバイル側なら false (送信側)
  rtcConfig?: RTCConfiguration
  onDataChannelOpen?: () => void
  onDataChannelClose?: () => void
  onMessageReceived?: (data: string) => void
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

  private setupSignalingHandlers() {
    this.sigChannel.onMessage = async (message) => {
      try {
        if (message.type === "offer" && this.isHost) {
          this.emitStatus("received-offer")
          await this.pc!.setRemoteDescription(
            new RTCSessionDescription(message)
          )
          const answer = await this.pc!.createAnswer()
          await this.pc!.setLocalDescription(answer)
          this.sigChannel.send(answer)
          this.emitStatus("sent-answer")
        } else if (message.type === "answer" && !this.isHost) {
          this.emitStatus("received-answer")
          await this.pc!.setRemoteDescription(
            new RTCSessionDescription(message)
          )
        } else if (message.type === "candidate") {
          this.emitStatus("received-candidate")
          if (message.candidate) {
            await this.pc!.addIceCandidate(
              new RTCIceCandidate(message.candidate)
            )
          }
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

  public send(data: string) {
    if (this.channel && this.channel.readyState === "open") {
      this.channel.send(data)
    } else {
      throw new Error("Data channel is not open")
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
