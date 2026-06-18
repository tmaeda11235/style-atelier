import { base64ToUint8Array } from "./binary-utils"
import type { SyncStateUpdater } from "./p2p-connection-helpers"
import {
  decryptSyncData,
  encryptSyncData,
  getLocalImagesMetadata,
  mergeIncomingSyncData,
  saveIncomingImage,
  scanLocalImages
} from "./p2p-sync-manager"

interface HostRelayContext {
  currentStep: string
  missingFiles: string[]
}

async function handleReceiveDb(
  getUrl: string,
  key: string,
  t: any,
  updateState: SyncStateUpdater,
  ctx: HostRelayContext,
  decrypted: string
): Promise<void> {
  updateState({
    status: "relay-syncing",
    statusMessage: t?.receiving || "Receiving and decrypting DB data..."
  })

  const mergeResult = await mergeIncomingSyncData(decrypted)
  if (mergeResult.success) {
    updateState({
      status: "relay-syncing",
      statusMessage: "DB synced. Requesting image list..."
    })

    const reqMsg = JSON.stringify({ type: "RELAY_REQ_IMAGE_LIST" })
    const encReq = await encryptSyncData(reqMsg, key)
    await fetch(getUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: encReq })
    })

    ctx.currentStep = "WAIT_IMAGE_LIST"
  } else {
    throw new Error("Merge failed")
  }
}

async function handleWaitImageList(
  getUrl: string,
  key: string,
  t: any,
  updateState: SyncStateUpdater,
  ctx: HostRelayContext,
  msg: any,
  onSuccess: () => void
): Promise<boolean> {
  updateState({
    status: "relay-syncing",
    statusMessage: "Comparing image differences..."
  })

  await scanLocalImages()
  const localMetadata = await getLocalImagesMetadata()
  const localMap = new Map(localMetadata.map((m) => [m.filePath, m.hash]))

  const guestFiles = msg.files || []
  ctx.missingFiles = []
  for (const f of guestFiles) {
    if (!localMap.has(f.filePath) || localMap.get(f.filePath) !== f.hash) {
      ctx.missingFiles.push(f.filePath)
    }
  }

  const reqImagesMsg = JSON.stringify({
    type: "RELAY_REQ_IMAGES",
    missingFiles: ctx.missingFiles
  })
  const encReq = await encryptSyncData(reqImagesMsg, key)
  await fetch(getUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: encReq })
  })

  if (ctx.missingFiles.length === 0) {
    onSuccess()
    updateState({
      status: "success",
      statusMessage: t?.syncSuccess || "Sync completed successfully!",
      processedCount: { cards: 0, categories: 0 }
    })
    return true
  } else {
    ctx.currentStep = "WAIT_IMAGES"
    return false
  }
}

async function handleRelayImageFile(
  getUrl: string,
  key: string,
  updateState: SyncStateUpdater,
  ctx: HostRelayContext,
  msg: any
): Promise<void> {
  updateState({
    status: "relay-syncing",
    statusMessage: `Receiving image (${ctx.missingFiles.length - msg.remainingCount}/${ctx.missingFiles.length}): ${msg.filePath}`
  })

  const arrayBuf = base64ToUint8Array(msg.data).buffer
  await saveIncomingImage(msg.filePath, arrayBuf, msg.hash)

  const ackMsg = JSON.stringify({
    type: "RELAY_ACK_IMAGE_FILE",
    filePath: msg.filePath
  })
  const encAck = await encryptSyncData(ackMsg, key)
  await fetch(getUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: encAck })
  })
}

async function handleHostRelayStep(
  getUrl: string,
  key: string,
  t: any,
  updateState: SyncStateUpdater,
  ctx: HostRelayContext,
  decrypted: string,
  onSuccess: () => void
): Promise<boolean> {
  let msg: any = null
  try {
    msg = JSON.parse(decrypted)
  } catch {
    // JSONパースに失敗した場合はDB同期データとする
  }

  if (ctx.currentStep === "RECEIVE_DB" && (!msg || msg.type === undefined)) {
    await handleReceiveDb(getUrl, key, t, updateState, ctx, decrypted)
  } else if (
    ctx.currentStep === "WAIT_IMAGE_LIST" &&
    msg &&
    msg.type === "RELAY_IMAGE_LIST"
  ) {
    return await handleWaitImageList(
      getUrl,
      key,
      t,
      updateState,
      ctx,
      msg,
      onSuccess
    )
  } else if (
    ctx.currentStep === "WAIT_IMAGES" &&
    msg &&
    msg.type === "RELAY_IMAGE_FILE"
  ) {
    await handleRelayImageFile(getUrl, key, updateState, ctx, msg)
  } else if (
    ctx.currentStep === "WAIT_IMAGES" &&
    msg &&
    msg.type === "RELAY_SYNC_COMPLETE"
  ) {
    onSuccess()
    updateState({
      status: "success",
      statusMessage: t?.syncSuccess || "Sync completed successfully!"
    })
    return true
  }
  return false
}

export function runHostRelayPolling(
  getUrl: string,
  key: string,
  t: any,
  updateState: SyncStateUpdater,
  handleError: (err: Error) => void,
  onSuccess: () => void
): NodeJS.Timeout | null {
  try {
    const ctx: HostRelayContext = {
      currentStep: "RECEIVE_DB",
      missingFiles: []
    }

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(getUrl)
        if (!res.ok) return

        const result = await res.json()
        if (!result.data) return

        const decrypted = await decryptSyncData(result.data, key)
        const isDone = await handleHostRelayStep(
          getUrl,
          key,
          t,
          updateState,
          ctx,
          decrypted,
          onSuccess
        )
        if (isDone) {
          clearInterval(pollInterval)
        }
      } catch (err: any) {
        clearInterval(pollInterval)
        onSuccess()
        handleError(err)
      }
    }, 2000)
    return pollInterval
  } catch (err: any) {
    onSuccess()
    handleError(err)
    return null
  }
}
