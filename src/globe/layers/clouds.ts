import {
  Mesh,
  MeshPhongMaterial,
  NoColorSpace,
  RepeatWrapping,
  SphereGeometry,
  TextureLoader,
} from 'three'
import { CLOUD_RADIUS_RATIO } from '../relief.ts'
import { RENDER_ORDER, SHELL_ROTATION_Y } from './shells.ts'
import type { GlobeLayer } from './types.ts'

const CLOUDS_TEXTURE_URL = `${import.meta.env.BASE_URL}textures/clouds-density.webp`
const CLOUDS_TEXTURE_WIDTH = 4096
const CLOUD_WIDTH_SEGMENTS = 256
/** Outward lift of the densest cloud; the base shell already clears the highest land. */
const CLOUD_RELIEF_RADII = 0.005
// Mip level whose texels match the mesh spacing, so vertex heights follow cloud masses instead of aliasing.
const CLOUD_RELIEF_LOD = Math.log2(CLOUDS_TEXTURE_WIDTH / CLOUD_WIDTH_SEGMENTS)
/** Fraction of view-facing below which clouds fade out, softening the white rim at the limb. */
const LIMB_FADE_FACING = 0.35
const DRIFT_RADIANS_PER_MS = (-0.36 * Math.PI) / 180 / 1000

const cloudDisplacementVertex = /* glsl */ `
#ifdef USE_DISPLACEMENTMAP
  transformed += normalize(objectNormal) * (textureLod(displacementMap, vDisplacementMapUv, ${CLOUD_RELIEF_LOD.toFixed(1)}).x * displacementScale + displacementBias);
#endif
`

const cloudLimbFadeFragment = /* glsl */ `
diffuseColor.a *= smoothstep(0.0, ${LIMB_FADE_FACING.toFixed(2)}, abs(dot(normalize(vNormal), normalize(vViewPosition))));
`

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
      const density = new TextureLoader().load(CLOUDS_TEXTURE_URL)
      density.colorSpace = NoColorSpace
      // Clamp sampling splits the date-line columns, so the drifting shell cracks.
      density.wrapS = RepeatWrapping
      const material = new MeshPhongMaterial({
        alphaMap: density,
        displacementMap: density,
        displacementScale: globeRadius * CLOUD_RELIEF_RADII,
        transparent: true,
        depthWrite: false,
      })
      material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
          '#include <displacementmap_vertex>',
          cloudDisplacementVertex,
        )
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <alphamap_fragment>',
          `#include <alphamap_fragment>\n${cloudLimbFadeFragment}`,
        )
      }
      const clouds = new Mesh(
        new SphereGeometry(
          globeRadius * CLOUD_RADIUS_RATIO,
          CLOUD_WIDTH_SEGMENTS,
          CLOUD_WIDTH_SEGMENTS / 2,
        ),
        material,
      )
      clouds.renderOrder = RENDER_ORDER.clouds
      clouds.rotation.y = SHELL_ROTATION_Y
      clouds.onBeforeRender = () => {
        clouds.rotation.y =
          SHELL_ROTATION_Y + DRIFT_RADIANS_PER_MS * elapsedDriftMs()
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
      mesh.material.alphaMap?.dispose()
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
