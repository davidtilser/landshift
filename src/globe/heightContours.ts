import type { MeshPhongMaterial } from 'three'
import { MAX_HEIGHT_CODE } from './relief.ts'

const DROPPED_EFFECTS = ['bitcrush', 'toon'] as const
const DEFERRED_EFFECT = 'pixelate'
// Wide steps. An isoline on every code turns valley noise and canyon walls into a dark fill.
const CODES_PER_CONTOUR = 24
const LINE_INK = 0.55
const HEIGHT_WIDTH = 1440
const HEIGHT_HEIGHT = 720

const contourDeclarations = /* glsl */ `
varying vec2 vDisplacementMapUv;
uniform sampler2D displacementMap;
`

const contourLines = /* glsl */ `
vec2 heightTexel = vec2(${(1 / HEIGHT_WIDTH).toFixed(6)}, ${(1 / HEIGHT_HEIGHT).toFixed(6)});
float height = texture2D(displacementMap, vDisplacementMapUv).x;
height += texture2D(displacementMap, vDisplacementMapUv + vec2(heightTexel.x, 0.0)).x;
height += texture2D(displacementMap, vDisplacementMapUv - vec2(heightTexel.x, 0.0)).x;
height += texture2D(displacementMap, vDisplacementMapUv + vec2(0.0, heightTexel.y)).x;
height += texture2D(displacementMap, vDisplacementMapUv - vec2(0.0, heightTexel.y)).x;
height /= 5.0;
float band = height * ${MAX_HEIGHT_CODE.toFixed(1)} / ${CODES_PER_CONTOUR.toFixed(1)};
float dist = min(fract(band), 1.0 - fract(band));
float fw = fwidth(band);
float onSlope = smoothstep(0.03, 0.08, fw) * (1.0 - smoothstep(0.22, 0.45, fw));
float line = (1.0 - smoothstep(0.0, max(fw * 0.6, 0.015), dist)) * onSlope;
outgoingLight *= mix(1.0, ${LINE_INK.toFixed(2)}, line);
`

const POSTERIZE_STEPS = 16
const POSTERIZE_MIX = 0.36

const posterize = /* glsl */ `
vec3 stepped = floor(outgoingLight * ${POSTERIZE_STEPS.toFixed(1)} + 0.5) / ${POSTERIZE_STEPS.toFixed(1)};
outgoingLight = mix(outgoingLight, stepped, ${POSTERIZE_MIX.toFixed(2)});
`

interface GlobeEffects {
  contours: boolean
  posterize: boolean
}

function readEffects(): GlobeEffects {
  const raw = new URLSearchParams(window.location.search).get('fx')
  const effects = { contours: false, posterize: false }
  if (raw === null) return effects
  for (const name of raw.split(',')) {
    const token = name.trim()
    if (token === 'contours') effects.contours = true
    else if (token === 'posterize') effects.posterize = true
    else if (token === DEFERRED_EFFECT) {
      console.warn(`Globe effect "${token}" is documented and not built.`)
    } else if (DROPPED_EFFECTS.some((effect) => effect === token)) {
      console.warn(`Globe effect "${token}" was dropped.`)
    } else if (token !== '') {
      console.warn(`Unknown globe effect "${token}". Use contours, posterize.`)
    }
  }
  return effects
}

/** Height isolines and a light posterize. No-op unless `?fx=` asks for one of them. */
export function attachHeightContours(material: MeshPhongMaterial): void {
  const effects = readEffects()
  if (!effects.contours && !effects.posterize) {
    return
  }
  material.onBeforeCompile = (shader) => {
    const parts: string[] = []
    if (effects.posterize) parts.push(posterize)
    if (effects.contours && material.displacementMap !== null) {
      shader.fragmentShader = contourDeclarations + shader.fragmentShader
      parts.unshift(contourLines)
    }
    if (parts.length === 0) return
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `${parts.join('\n')}\n#include <opaque_fragment>`,
    )
  }
}
