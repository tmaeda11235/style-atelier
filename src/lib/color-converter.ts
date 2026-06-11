export function hexToRgb(hex: string): [number, number, number] {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  const fullHex = hex.replace(
    shorthandRegex,
    (_, r, g, b) => r + r + g + g + b + b
  )
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex)
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : [0, 0, 0]
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHsl(r, g, b)
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = c.toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

interface HueRange {
  min: number
  max: number
  name: string
}

const HUE_RANGES: HueRange[] = [
  { min: 15, max: 45, name: "Orange" },
  { min: 45, max: 70, name: "Yellow" },
  { min: 70, max: 160, name: "Green" },
  { min: 160, max: 195, name: "Cyan" },
  { min: 195, max: 250, name: "Blue" },
  { min: 250, max: 290, name: "Purple" },
  { min: 290, max: 345, name: "Pink" }
]

function getChromaticColorName(h: number, s: number, l: number): string {
  // Brown check: Hue in red/orange range, low-mid saturation, dark-mid lightness
  if (h >= 15 && h < 45 && s < 50 && l < 50) return "Brown"

  if (h >= 345 || h < 15) return "Red"

  const matched = HUE_RANGES.find((r) => h >= r.min && h < r.max)
  return matched ? matched.name : "Gray"
}

export function getQuantizedColorName(h: number, s: number, l: number): string {
  if (l > 85) return "White"
  if (l < 15) return "Black"
  if (s < 15) return "Gray"
  return getChromaticColorName(h, s, l)
}

export function getColorNameFromHex(hex: string): string {
  const [h, s, l] = hexToHsl(hex)
  return getQuantizedColorName(h, s, l)
}

export function filterByHue(
  cardColor: string | undefined,
  targetHue: number
): boolean {
  if (!cardColor) return false
  try {
    const [h, s, l] = hexToHsl(cardColor)
    if (s < 15 || l > 90 || l < 10) return false
    const diff = Math.min(
      Math.abs(h - targetHue),
      360 - Math.abs(h - targetHue)
    )
    return diff <= 25
  } catch {
    return false
  }
}
