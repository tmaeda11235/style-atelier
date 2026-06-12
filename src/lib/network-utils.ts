/**
 * Detects if the current network connection is mobile/cellular, low-speed, or if data saver is enabled.
 */
export function isMobileConnection(): boolean {
  if (typeof navigator === "undefined") return false

  const conn =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection

  if (!conn) return false

  const isSlow =
    conn.saveData || ["2g", "3g", "slow-2g"].includes(conn.effectiveType)

  const isCellular = conn.type === "cellular"

  return !!(isSlow || isCellular)
}
