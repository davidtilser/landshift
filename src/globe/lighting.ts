import { AmbientLight, DirectionalLight, Vector3 } from 'three'
import type { Light } from 'three'

/** World-space direction toward the sun, fixed over the western Atlantic (about 14°N, 59°W). */
export const SUN_DIRECTION: Readonly<Vector3> = new Vector3(
  -1,
  0.3,
  0.6,
).normalize()
// Ambient carries most of the light so exaggerated slopes facing away from the sun stay readable.
const AMBIENT_INTENSITY = 0.9 * Math.PI
const SUN_INTENSITY = 0.6 * Math.PI

/** Re-aims globe.gl's default ambient and directional lights; other lights are left alone. */
export function applySunLighting(lights: readonly Light[]): void {
  for (const light of lights) {
    if (light instanceof DirectionalLight) {
      light.position.copy(SUN_DIRECTION)
      light.intensity = SUN_INTENSITY
    } else if (light instanceof AmbientLight) {
      light.intensity = AMBIENT_INTENSITY
    }
  }
}
