import {
  Color,
  ColorManagement,
  CustomBlending,
  HalfFloatType,
  OneFactor,
  OneMinusSrcAlphaFactor,
  ShaderMaterial,
  SRGBTransfer,
  WebGLRenderTarget,
} from 'three'
import type { Camera, Scene, WebGLRenderer } from 'three'
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js'

const MSAA_SAMPLE_COUNTS = [4, 2] as const
// About 145 MB of half-float color plus depth samples; a 1512x982 canvas at pixel ratio 2 still gets 2x.
const MSAA_SAMPLE_BUDGET = 12_000_000

const outputVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// sRGB-encoding premultiplied color would brighten partly transparent edges such as the atmosphere halo.
const outputFragmentShader = /* glsl */ `
uniform sampler2D tGlobe;
uniform bool uEncodeSrgb;
varying vec2 vUv;

void main() {
  vec4 texel = texture2D(tGlobe, vUv);
  vec3 color = texel.a > 0.0 ? texel.rgb / texel.a : vec3(0.0);
  if (uEncodeSrgb) color = sRGBTransferOETF(vec4(color, 1.0)).rgb;
  gl_FragColor = vec4(color * texel.a, texel.a);
}
`

export interface CompositorInputs {
  composer: EffectComposer
  globeScene: Scene
  starScene: Scene
  camera: Camera
}

export interface Compositor {
  dispose(): void
}

function msaaSamples(pixels: number): number {
  return (
    MSAA_SAMPLE_COUNTS.find(
      (samples) => samples * pixels <= MSAA_SAMPLE_BUDGET,
    ) ?? 0
  )
}

/** Clears the canvas and draws the stars on it; later passes composite over them. */
class StarsPass extends Pass {
  private readonly scene: Scene
  private readonly camera: Camera

  constructor(scene: Scene, camera: Camera) {
    super()
    this.scene = scene
    this.camera = camera
    this.needsSwap = false
  }

  override render(renderer: WebGLRenderer): void {
    const autoClear = renderer.autoClear
    renderer.autoClear = false
    renderer.setRenderTarget(null)
    renderer.clear()
    renderer.render(this.scene, this.camera)
    renderer.autoClear = autoClear
  }
}

/** Renders the globe into its own MSAA target, then writes it display-encoded and premultiplied to the write buffer. */
class GlobePass extends Pass {
  private readonly scene: Scene
  private readonly camera: Camera
  private readonly target = new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
  })
  private readonly encodeSrgb = { value: true }
  private readonly material: ShaderMaterial
  private readonly quad: FullScreenQuad
  private readonly savedClearColor = new Color()

  constructor(scene: Scene, camera: Camera) {
    super()
    this.scene = scene
    this.camera = camera
    this.material = new ShaderMaterial({
      uniforms: {
        tGlobe: { value: this.target.texture },
        uEncodeSrgb: this.encodeSrgb,
      },
      vertexShader: outputVertexShader,
      fragmentShader: outputFragmentShader,
      depthTest: false,
      depthWrite: false,
    })
    this.quad = new FullScreenQuad(this.material)
  }

  override setSize(width: number, height: number): void {
    const samples = msaaSamples(width * height)
    if (samples !== this.target.samples) {
      this.target.samples = samples
      this.target.dispose()
    }
    this.target.setSize(width, height)
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
  ): void {
    const autoClear = renderer.autoClear
    const clearAlpha = renderer.getClearAlpha()
    renderer.getClearColor(this.savedClearColor)
    renderer.autoClear = false
    // Transparent black keeps the target premultiplied, which the composite blend expects.
    renderer.setClearColor(0x000000, 0)
    renderer.setRenderTarget(this.target)
    renderer.clear()
    renderer.render(this.scene, this.camera)
    this.encodeSrgb.value =
      ColorManagement.getTransfer(renderer.outputColorSpace) === SRGBTransfer
    renderer.setRenderTarget(writeBuffer)
    this.quad.render(renderer)
    renderer.setClearColor(this.savedClearColor, clearAlpha)
    renderer.autoClear = autoClear
  }

  override dispose(): void {
    this.target.dispose()
    this.material.dispose()
    this.quad.dispose()
  }
}

/** Blends the premultiplied read buffer over whatever the canvas already holds. */
class PremultipliedCompositePass extends ShaderPass {
  constructor() {
    super(CopyShader)
    this.material.transparent = true
    this.material.blending = CustomBlending
    this.material.blendSrc = OneFactor
    this.material.blendDst = OneMinusSrcAlphaFactor
    this.material.depthTest = false
    this.material.depthWrite = false
  }

  override render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean,
  ): void {
    const autoClear = renderer.autoClear
    renderer.autoClear = false
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive)
    renderer.autoClear = autoClear
  }
}

/**
 * Replaces the composer's passes with stars, globe, and composite. Passes inserted before the
 * composite see the globe in the read buffer as display-encoded, premultiplied color.
 */
export function createCompositor({
  composer,
  globeScene,
  starScene,
  camera,
}: CompositorInputs): Compositor {
  const passes = [
    new StarsPass(starScene, camera),
    new GlobePass(globeScene, camera),
    new PremultipliedCompositePass(),
  ]
  for (const pass of [...composer.passes]) {
    composer.removePass(pass)
    pass.dispose()
  }
  // The composer's own targets only carry copies now, so they need no depth.
  composer.renderTarget1.depthBuffer = false
  composer.renderTarget2.depthBuffer = false
  for (const pass of passes) {
    composer.addPass(pass)
  }

  return {
    dispose() {
      for (const pass of passes) {
        composer.removePass(pass)
        pass.dispose()
      }
    },
  }
}
