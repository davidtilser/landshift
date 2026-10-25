import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  Scene,
  ShaderMaterial,
} from 'three'

const STAR_COUNT = 5000
const STAR_SHELL_RADIUS = 40_000
const MIN_STAR_SIZE_PX = 1.2
const MAX_STAR_SIZE_PX = 3.4
const MIN_STAR_BRIGHTNESS = 0.25
const TWINKLE_DEPTH = 0.35

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uTwinkleDepth;
attribute float aSize;
attribute float aBrightness;
attribute float aPhase;
varying float vBrightness;

void main() {
  float speed = 0.4 + aPhase * 0.12;
  float twinkle = 1.0 - uTwinkleDepth * (0.5 + 0.5 * sin(uTime * speed + aPhase));
  vBrightness = aBrightness * twinkle;
  gl_PointSize = aSize * uPixelRatio;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
varying float vBrightness;

void main() {
  float radius = length(gl_PointCoord - 0.5) * 2.0;
  if (radius > 1.0) discard;
  float alpha = vBrightness * (1.0 - smoothstep(0.0, 1.0, radius));
  gl_FragColor = vec4(vec3(alpha), alpha);
}
`

export interface Starfield {
  /** Kept separate from globe.gl's scene; draw it with the globe camera. */
  scene: Scene
  setTwinkling(twinkling: boolean): void
  dispose(): void
}

function createStarGeometry(): BufferGeometry {
  const positions = new Float32Array(STAR_COUNT * 3)
  const sizes = new Float32Array(STAR_COUNT)
  const brightnesses = new Float32Array(STAR_COUNT)
  const phases = new Float32Array(STAR_COUNT)
  for (let star = 0; star < STAR_COUNT; star++) {
    const height = 2 * Math.random() - 1
    const azimuth = 2 * Math.PI * Math.random()
    const ring = Math.sqrt(1 - height * height) * STAR_SHELL_RADIUS
    positions.set(
      [
        ring * Math.cos(azimuth),
        height * STAR_SHELL_RADIUS,
        ring * Math.sin(azimuth),
      ],
      star * 3,
    )
    sizes[star] =
      MIN_STAR_SIZE_PX +
      (MAX_STAR_SIZE_PX - MIN_STAR_SIZE_PX) * Math.random() ** 3
    brightnesses[star] =
      MIN_STAR_BRIGHTNESS + (1 - MIN_STAR_BRIGHTNESS) * Math.random() ** 2
    phases[star] = 2 * Math.PI * Math.random()
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1))
  geometry.setAttribute(
    'aBrightness',
    new Float32BufferAttribute(brightnesses, 1),
  )
  geometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1))
  return geometry
}

export function createStarfield(): Starfield {
  const time = { value: 0 }
  const pixelRatio = { value: 1 }
  const material = new ShaderMaterial({
    uniforms: {
      uTime: time,
      uPixelRatio: pixelRatio,
      uTwinkleDepth: { value: TWINKLE_DEPTH },
    },
    vertexShader,
    fragmentShader,
    blending: AdditiveBlending,
    premultipliedAlpha: true,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const stars = new Points(createStarGeometry(), material)
  stars.frustumCulled = false
  const scene = new Scene()
  scene.add(stars)

  let twinkledMs = 0
  let twinkleStartedAt: number | undefined
  stars.onBeforeRender = (renderer) => {
    pixelRatio.value = renderer.getPixelRatio()
    const runningMs =
      twinkleStartedAt === undefined ? 0 : performance.now() - twinkleStartedAt
    time.value = (twinkledMs + runningMs) / 1000
  }

  return {
    scene,
    setTwinkling(twinkling) {
      if (twinkling && twinkleStartedAt === undefined) {
        twinkleStartedAt = performance.now()
      } else if (!twinkling && twinkleStartedAt !== undefined) {
        twinkledMs += performance.now() - twinkleStartedAt
        twinkleStartedAt = undefined
      }
    },
    dispose() {
      stars.geometry.dispose()
      material.dispose()
    },
  }
}
