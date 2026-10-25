import type { Vector3 } from 'three'

/** three-globe's world axis: latitude up, longitude 0 along +Z. The globe mesh's yaw is already baked into that. */
export function polarToCartesian(
  lat: number,
  lng: number,
  radius: number,
  target: Vector3,
): Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((90 - lng) * Math.PI) / 180
  const phiSin = Math.sin(phi)
  return target.set(
    radius * phiSin * Math.cos(theta),
    radius * Math.cos(phi),
    radius * phiSin * Math.sin(theta),
  )
}
