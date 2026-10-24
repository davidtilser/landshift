import {
  Mesh,
  MeshPhongMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
} from 'three'
import type { GlobeLayer } from './types.ts'

const CLOUDS_TEXTURE_URL = `${import.meta.env.BASE_URL}textures/clouds-alpha.webp`
const CLOUD_RADIUS_RATIO = 1.004
const DRIFT_RADIANS_PER_MS = (-0.36 * Math.PI) / 180 / 1000
// Matches three-globe's globe mesh orientation so the cloud map lines up with the day map.
const BASE_ROTATION_Y = -Math.PI / 2

export interface CloudsLayer extends GlobeLayer {
  setDrifting(drifting: boolean): void
}

export function createCloudsLayer(): CloudsLayer {
  let mesh: Mesh<SphereGeometry, MeshPhongMaterial> | undefined
  let driftedMs = 0
  let driftStartedAt: number | undefined

  const elapsedDriftMs = (): number =>
    driftedMs +
    (driftStartedAt === undefined ? 0 : performance.now() - driftStartedAt)

  return {
    attach({ parent, globeRadius }) {
      const map = new TextureLoader().load(CLOUDS_TEXTURE_URL)
      map.colorSpace = SRGBColorSpace
      const clouds = new Mesh(
        new SphereGeometry(globeRadius * CLOUD_RADIUS_RATIO, 128, 64),
        new MeshPhongMaterial({ map, transparent: true }),
      )
      clouds.rotation.y = BASE_ROTATION_Y
      clouds.onBeforeRender = () => {
        clouds.rotation.y =
          BASE_ROTATION_Y + DRIFT_RADIANS_PER_MS * elapsedDriftMs()
      }
      parent.add(clouds)
      mesh = clouds
    },
    detach() {
      if (mesh === undefined) {
        return
      }
      mesh.removeFromParent()
      mesh.geometry.dispose()
      mesh.material.map?.dispose()
      mesh.material.dispose()
      mesh = undefined
    },
    setDrifting(drifting) {
      if (drifting && driftStartedAt === undefined) {
        driftStartedAt = performance.now()
      } else if (!drifting && driftStartedAt !== undefined) {
        driftedMs += performance.now() - driftStartedAt
        driftStartedAt = undefined
      }
    },
  }
}
