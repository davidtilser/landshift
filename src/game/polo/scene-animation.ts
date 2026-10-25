export function segmentReveal(
  fraction: number,
  index: number,
  count: number,
): number {
  return Math.max(0, Math.min(1, fraction * count - index))
}

/** Alternating field passes keep the vehicle alongside the surface it has just changed. */
export function workPass(
  fraction: number,
  lanes = 8,
): {
  x: number
  y: number
  heading: number
} {
  const position = Math.max(0, Math.min(1, fraction)) * lanes
  const lane = Math.min(lanes - 1, Math.floor(position))
  const portion = position === lanes ? 1 : position - lane
  return {
    x: lane % 2 === 0 ? -160 + 320 * portion : 160 - 320 * portion,
    y: -50 + ((lane + 0.5) * 100) / lanes,
    heading: lane % 2 === 0 ? 0 : 180,
  }
}
