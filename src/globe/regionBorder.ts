import {
  BufferGeometry,
  Color,
  CustomBlending,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PerspectiveCamera,
  ShaderMaterial,
  Vector3,
} from 'three'
import type { Texture } from 'three'
import { polarToCartesian } from './polar.ts'

const BORDER_RENDER_ORDER = 2.5
const BORDER_LIFT_RADII = 0.0015
const BORDER_HALF_PIXELS = 2.25
const BORDER_COLOR = new Color('#9ffff0')

const borderVertex = /* glsl */ `
attribute vec3 lineTangent;
attribute float side;
uniform sampler2D heightMap;
uniform float uScale;
uniform float uBias;
uniform float uLift;
uniform float uRadius;
uniform float uWidth;
varying float vSide;

void main() {
  vec3 radial = normalize(position);
  float coded = texture2D(heightMap, uv).r;
  vec3 center = radial * (uRadius + coded * uScale + uBias + uLift);
  vec3 sideDir = cross(radial, lineTangent);
  float sideLength = length(sideDir);
  if (sideLength > 0.0) sideDir /= sideLength;
  vSide = side;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(center + sideDir * side * uWidth, 1.0);
}
`

const borderFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vSide;

void main() {
  float glow = smoothstep(1.0, 0.45, abs(vSide));
  float alpha = glow * uOpacity;
  gl_FragColor = vec4(uColor * alpha, alpha);
}
`

export interface TerrainBorder {
  mesh: Mesh
  setOpacity(opacity: number): void
  dispose(): void
}

function lineDirection(
  previous: Vector3,
  next: Vector3,
  radial: Vector3,
  target: Vector3,
): Vector3 {
  target.subVectors(next, previous)
  target.addScaledVector(radial, -target.dot(radial))
  if (target.lengthSq() < 1e-10) {
    target.crossVectors(radial, new Vector3(0, 1, 0))
  }
  if (target.lengthSq() < 1e-10) {
    target.crossVectors(radial, new Vector3(1, 0, 0))
  }
  return target.normalize()
}

export function createTerrainBorder(
  lines: readonly (readonly (readonly [number, number])[])[],
  height: Texture,
  bounds: { west: number; south: number; east: number; north: number },
  globeRadius: number,
  displacementScale: number,
  displacementBias: number,
): TerrainBorder {
  const lngSpan = bounds.east - bounds.west
  const latSpan = bounds.north - bounds.south
  const positions: number[] = []
  const tangents: number[] = []
  const sides: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const point = new Vector3()
  const previous = new Vector3()
  const next = new Vector3()
  const radial = new Vector3()
  const tangent = new Vector3()
  for (const line of lines) {
    if (line.length < 2) {
      continue
    }
    const first = line[0]
    const last = line[line.length - 1]
    if (first === undefined || last === undefined) {
      continue
    }
    const closed =
      line.length > 3 && first[0] === last[0] && first[1] === last[1]
    const count = closed ? line.length - 1 : line.length
    const base = positions.length / 3
    for (let index = 0; index < count; index += 1) {
      const current = line[index]
      const before = line[(index - 1 + count) % count]
      const after = line[(index + 1) % count]
      if (
        current === undefined ||
        before === undefined ||
        after === undefined
      ) {
        throw new Error('SF Bay outline is missing a coordinate')
      }
      const [lng, lat] = current
      polarToCartesian(lat, lng, globeRadius, point)
      polarToCartesian(before[1], before[0], globeRadius, previous)
      polarToCartesian(after[1], after[0], globeRadius, next)
      radial.copy(point).multiplyScalar(1 / globeRadius)
      lineDirection(previous, next, radial, tangent)
      positions.push(point.x, point.y, point.z, point.x, point.y, point.z)
      tangents.push(
        tangent.x,
        tangent.y,
        tangent.z,
        tangent.x,
        tangent.y,
        tangent.z,
      )
      sides.push(-1, 1)
      const u = (lng - bounds.west) / lngSpan
      const v = (bounds.north - lat) / latSpan
      uvs.push(u, v, u, v)
    }
    const segmentCount = closed ? count : count - 1
    for (let index = 0; index < segmentCount; index += 1) {
      const a = base + index * 2
      const b = base + ((index + 1) % count) * 2
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('lineTangent', new Float32BufferAttribute(tangents, 3))
  geometry.setAttribute('side', new Float32BufferAttribute(sides, 1))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  const material = new ShaderMaterial({
    uniforms: {
      heightMap: { value: height },
      uScale: { value: displacementScale },
      uBias: { value: displacementBias },
      uLift: { value: globeRadius * BORDER_LIFT_RADII },
      uRadius: { value: globeRadius },
      uWidth: { value: 0.05 },
      uOpacity: { value: 0 },
      uColor: { value: BORDER_COLOR },
    },
    vertexShader: borderVertex,
    fragmentShader: borderFragment,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    premultipliedAlpha: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  const mesh = new Mesh(geometry, material)
  mesh.renderOrder = BORDER_RENDER_ORDER
  mesh.frustumCulled = true
  mesh.raycast = () => {}
  mesh.onBeforeRender = (renderer, _scene, renderCamera) => {
    if (!(renderCamera instanceof PerspectiveCamera)) {
      return
    }
    const gap = Math.max(renderCamera.position.length() - globeRadius, 0.25)
    const halfFov = (renderCamera.fov * Math.PI) / 180 / 2
    const pixels = renderer.domElement.clientHeight
    if (pixels <= 0) {
      return
    }
    const width = material.uniforms['uWidth']
    if (width !== undefined) {
      width.value =
        ((2 * gap * Math.tan(halfFov)) / pixels) * BORDER_HALF_PIXELS
    }
  }
  return {
    mesh,
    setOpacity(opacity) {
      const opacityUniform = material.uniforms['uOpacity']
      if (opacityUniform !== undefined) {
        opacityUniform.value = opacity
      }
      mesh.visible = opacity > 0.001
    },
    dispose() {
      mesh.removeFromParent()
      geometry.dispose()
      material.dispose()
    },
  }
}
