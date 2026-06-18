import { uint8ArrayToBase64 } from "./binary-utils"
import { computeHash } from "./db/migration-helpers"
import type { SyncStateUpdater } from "./p2p-connection-helpers"
import {
  decryptSyncData,
  encryptSyncData,
  getLocalImagesMetadata,
  prepareOutgoingSyncData,
  readOpfsFileAsBlob,
  scanLocalImages
} from "./p2p-sync-manager"

interface GuestRelayContext {
  currentStep: string
  missingFiles: string[]
  currentFileIndex: number
}

async function sendNextRelayImage(
  postUrl: string,
  key: string,
  missingFiles: string[],
  index: number,
  updateState: SyncStateUpdater,
  t: any
): Promise<void> {
  const filePath = missingFiles[index]
  updateState({
    status: "relay-syncing",
    statusMessage: `${t?.sendingImages || "Sending images"} (${index + 1}/${missingFiles.length}): ${filePath}`,
    syncProgress: {
      phase: 3,
      currentImageIndex: index,
      totalImages: missingFiles.length
    }
  })

  const blob = await readOpfsFileAsBlob(filePath)
  const arrayBuf = await blob.arrayBuffer()
  const hash = await computeHash(arrayBuf)
  const base64Data = uint8ArrayToBase64(new Uint8Array(arrayBuf))

  const imgMsg = JSON.stringify({
    type: "RELAY_IMAGE_FILE",
    filePath,
    hash,
    data: base64Data,
    remainingCount: missingFiles.length - index - 1
  })

  const encImg = await encryptSyncData(imgMsg, key)
  await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: encImg })
  })
}

async function handleWaitReqList(
  postUrl: string,
  key: string,
  t: any,
  updateState: SyncStateUpdater,
  ctx: GuestRelayContext
): Promise<void> {
  updateState({
    status: "relay-syncing",
    statusMessage: t?.scanningImages || "Scanning local images...",
    syncProgress: { phase: 2 }
  })
  await scanLocalImages()
  const localImages = await getLocalImagesMetadata()

  const listMsg = JSON.stringify({
    type: "RELAY_IMAGE_LIST",
    files: localImages
  })
  const encList = await encryptSyncData(listMsg, key)
  await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: encList })
  })

  ctx.currentStep = "WAIT_FOR_REQ_IMAGES"
  updateState({
    status: "relay-syncing",
    statusMessage: t?.waitingForDiffs || "Waiting for difference selection...",
    syncProgress: { phase: 2 }
  })
}

async function handleWaitReqImages(
  postUrl: string,
  key: string,
  t: any,
  updateState: SyncStateUpdater,
  ctx: GuestRelayContext,
  msg: any
): Promise<boolean> {
  ctx.missingFiles = msg.missingFiles || []
  if (ctx.missingFiles.length === 0) {
    const completeMsg = JSON.stringify({ type: "RELAY_SYNC_COMPLETE" })
    const encComplete = await encryptSyncData(completeMsg, key)
    await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: encComplete })
    })

    updateState({
      status: "success",
      statusMessage: t?.syncSuccess || "Data synced successfully!",
      syncProgress: undefined
    })
    return true
  } else {
    ctx.currentStep = "SENDING_IMAGES"
    ctx.currentFileIndex = 0
    await sendNextRelayImage(
      postUrl,
      key,
      ctx.missingFiles,
      ctx.currentFileIndex,
      updateState,
      t
    )
    return false
  }
}

async function handleSendingImages(
  postUrl: string,
  key: string,
  t: any,
  updateState: SyncStateUpdater,
  ctx: GuestRelayContext,
  msg: any
): Promise<boolean> {
  if (msg.filePath === ctx.missingFiles[ctx.currentFileIndex]) {
    ctx.currentFileIndex++
    if (ctx.currentFileIndex >= ctx.missingFiles.length) {
      const completeMsg = JSON.stringify({ type: "RELAY_SYNC_COMPLETE" })
      const encComplete = await encryptSyncData(completeMsg, key)
      await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: encComplete })
      })

      updateState({
        status: "success",
        statusMessage: t?.syncSuccess || "Data synced successfully!",
        syncProgress: undefined
      })
      return true
    } else {
      await sendNextRelayImage(
        postUrl,
        key,
        ctx.missingFiles,
        ctx.currentFileIndex,
        updateState,
        t
      )
    }
  }
  return false
}

async function handleGuestRelayStep(
  postUrl: string,
  key: string,
  t: any,
  updateState: SyncStateUpdater,
  ctx: GuestRelayContext,
  msg: any
): Promise<boolean> {
  if (
    ctx.currentStep === "WAIT_FOR_REQ_LIST" &&
    msg.type === "RELAY_REQ_IMAGE_LIST"
  ) {
    await handleWaitReqList(postUrl, key, t, updateState, ctx)
  } else if (
    ctx.currentStep === "WAIT_FOR_REQ_IMAGES" &&
    msg.type === "RELAY_REQ_IMAGES"
  ) {
    return await handleWaitReqImages(postUrl, key, t, updateState, ctx, msg)
  } else if (
    ctx.currentStep === "SENDING_IMAGES" &&
    msg.type === "RELAY_ACK_IMAGE_FILE"
  ) {
    return await handleSendingImages(postUrl, key, t, updateState, ctx, msg)
  }
  return false
}

async function sendGuestDbViaRelay(
  postUrl: string,
  key: string,
  t: any,
  updateState: SyncStateUpdater
): Promise<void> {
  updateState({
    status: "relay-syncing",
    statusMessage: t?.relaySending || "Sending local DB data via relay...",
    syncProgress: { phase: 1 }
  })
  const syncData = await prepareOutgoingSyncData()
  const encryptedDb = await encryptSyncData(syncData, key)

  const res = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: encryptedDb })
  })

  if (!res.ok) {
    throw new Error("Relay server rejected sync payload")
  }

  updateState({
    status: "relay-syncing",
    statusMessage: t?.waitingForHost || "Waiting for host response...",
    syncProgress: { phase: 1 }
  })
}

export async function runGuestRelaySync(
  wsUrl: string,
  key: string,
  t: any,
  updateState: SyncStateUpdater,
  handleError: (err: Error) => void
): Promise<NodeJS.Timeout | null> {
  try {
    const urlObj = new URL(wsUrl.replace(/^ws/, "http"))
    const roomId = urlObj.searchParams.get("roomId") || ""
    const postUrl = `${urlObj.origin}/api/sync/${roomId}`

    await sendGuestDbViaRelay(postUrl, key, t, updateState)

    const ctx: GuestRelayContext = {
      currentStep: "WAIT_FOR_REQ_LIST",
      missingFiles: [],
      currentFileIndex: 0
    }

    const pollInterval = setInterval(async () => {
      try {
        const getRes = await fetch(postUrl)
        if (!getRes.ok) return

        const result = await getRes.json()
        if (!result.data) return

        const decryptedStr = await decryptSyncData(result.data, key)
        const msg = JSON.parse(decryptedStr)

        const isDone = await handleGuestRelayStep(
          postUrl,
          key,
          t,
          updateState,
          ctx,
          msg
        )
        if (isDone) {
          clearInterval(pollInterval)
        }
      } catch (err: any) {
        clearInterval(pollInterval)
        handleError(err)
      }
    }, 2000)

    return pollInterval
  } catch (err: any) {
    handleError(err)
    return null
  }
}
