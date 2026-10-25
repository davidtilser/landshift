import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshPhongMaterial,
  Uint32BufferAttribute,
  Vector3,
} from 'three'
import type { Texture } from 'three'
import { polarToCartesian } from './polar.ts'

const PATCH_RENDER_ORDER = 0.5

export interface PatchBounds {
  west: number
  south: number
  east: number
  north: number
}

export interface TerrainPatch {
  mesh: Mesh
  setOpacity(opacity: number, coversView: boolean): void
  dispose(): void
}

function textureSize(texture: Texture): { width: number; height: number } {
  const image: unknown = texture.image
  if (
    typeof image === 'object' &&
    image !== null &&
    'width' in image &&
    'height' in image &&
    typeof image.width === 'number' &&
    typeof image.height === 'number' &&
    image.width > 1 &&
    image.height > 1
  ) {
    return { width: image.width, height: image.height }
  }
  throw new Error('Terrain texture has no dimensions')
}

export function createTerrainPatch(
  day: Texture,
  height: Texture,
  normal: Texture,
  bounds: PatchBounds,
  globeRadius: number,
  displacementScale: number,
  displacementBias: number,
): TerrainPatch {
  const { width, height: rows } = textureSize(height)
  const lngSpan = bounds.east - bounds.west
  const latSpan = bounds.north - bounds.south
  // The color texture stays full resolution; the grid only has to carry the relief.
  const maxSegments = 480
  const segmentsX = Math.min(width, maxSegments)
  const segmentsY = Math.min(rows, maxSegments)
  const columns = segmentsX + 1
  const rowCount = segmentsY + 1
  const positions = new Float32Array(columns * rowCount * 3)
  const normals = new Float32Array(columns * rowCount * 3)
  const uvs = new Float32Array(columns * rowCount * 2)
  const point = new Vector3()
  for (let y = 0; y < rowCount; y += 1) {
    const v = y / segmentsY
    // ImageBitmap uploads the north row at v=0, so the north edge of the mesh uses that row.
    const lat = bounds.north - v * latSpan
    for (let x = 0; x < columns; x += 1) {
      const u = x / segmentsX
      const lng = bounds.west + u * lngSpan
      polarToCartesian(lat, lng, globeRadius, point)
      const vertex = y * columns + x
      positions.set([point.x, point.y, point.z], vertex * 3)
      point.multiplyScalar(1 / globeRadius)
      normals.set([point.x, point.y, point.z], vertex * 3)
      uvs.set([u, v], vertex * 2)
    }
  }
  const indices = new Uint32Array(segmentsX * segmentsY * 6)
  let offset = 0
  for (let y = 0; y < segmentsY; y += 1) {
    for (let x = 0; x < segmentsX; x += 1) {
      const a = y * columns + x
      const b = a + 1
      const c = a + columns
      const d = c + 1
      indices[offset] = a
      indices[offset + 1] = c
      indices[offset + 2] = d
      indices[offset + 3] = a
      indices[offset + 4] = d
      indices[offset + 5] = b
      offset += 6
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(new Uint32BufferAttribute(indices, 1))
  geometry.computeBoundingSphere()
  const material = new MeshPhongMaterial({
    map: day,
    normalMap: normal,
    displacementMap: height,
    displacementScale,
    displacementBias,
    transparent: true,
    depthWrite: false,
    // Draws over the coarse globe without lifting the surface, so the shared displacement still meets.
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  })
  const mesh = new Mesh(geometry, material)
  mesh.renderOrder = PATCH_RENDER_ORDER
  mesh.frustumCulled = true
  mesh.raycast = () => {}
  return {
    mesh,
    setOpacity(opacity, coversView) {
      const opaque = coversView && opacity >= 0.999
      if (material.transparent === opaque) {
        material.transparent = !opaque
        material.needsUpdate = true
      }
      material.opacity = opaque ? 1 : opacity
      material.depthWrite = opaque
      // The coarse globe chords across valleys; once the patch fills the view, overwrite those pixels.
      material.depthTest = !opaque
      mesh.visible = opacity > 0.001
    },
    dispose() {
      mesh.removeFromParent()
      geometry.dispose()
      material.dispose()
    },
  }
}
