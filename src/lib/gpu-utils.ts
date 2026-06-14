/**
 * Checks if WebGPU is supported and operational on the current system.
 * Returns true if WebGPU is fully supported, false otherwise.
 */
export async function checkWebGpuSupport(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.gpu) {
    return false
  }
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return !!adapter
  } catch {
    return false
  }
}
