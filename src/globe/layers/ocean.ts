import { Color, Mesh, MeshPhongMaterial, SphereGeometry } from 'three'
import type { Texture } from 'three'
import {
  MAX_HEIGHT_CODE,
  MAX_SEA_DEPTH_M,
  OCEAN_RADIUS_RATIO,
  SEA_LEVEL_CODE,
} from '../relief.ts'
import { RENDER_ORDER, SHELL_ROTATION_Y } from './shells.ts'
import type { GlobeLayer } from './types.ts'

const SHALLOW_COLOR = '#1f9e9a'
const DEEP_COLOR = '#02525e'
const SHALLOW_OPACITY = 0.04
const DEEP_OPACITY = 0.62
const FULL_OPACITY_DEPTH_M = 4000
const OCEAN_SHININESS = 90
// 1-degree facets sag at most 0.008 units, so the shell stays above 100.01 everywhere.
const OCEAN_WIDTH_SEGMENTS = 360

const glslFloat = (value: number): string => value.toFixed(1)

const oceanVertexDeclarations = /* glsl */ `
varying vec2 vOceanUv;
`

const oceanFragmentDeclarations = /* glsl */ `
uniform sampler2D oceanHeightMap;
uniform vec3 oceanShallowColor;
uniform vec3 oceanDeepColor;
varying vec2 vOceanUv;
`

// Depth sets tint and opacity per texel, and land codes mask the water so the coast follows the data, not the mesh.
const oceanFragmentColor = /* glsl */ `
float heightCode = texture2D(oceanHeightMap, vOceanUv).r * ${glslFloat(MAX_HEIGHT_CODE)};
float depthM = max(0.0, ${glslFloat(SEA_LEVEL_CODE)} - heightCode) / ${glslFloat(SEA_LEVEL_CODE)} * ${glslFloat(MAX_SEA_DEPTH_M)};
float depthMix = smoothstep(0.0, ${glslFloat(FULL_OPACITY_DEPTH_M)}, depthM);
float waterMask = 1.0 - smoothstep(${glslFloat(SEA_LEVEL_CODE - 1)}, ${glslFloat(SEA_LEVEL_CODE + 1)}, heightCode);
diffuseColor.rgb = mix(oceanShallowColor, oceanDeepColor, depthMix);
diffuseColor.a = mix(${String(SHALLOW_OPACITY)}, ${String(DEEP_OPACITY)}, depthMix) * waterMask;
`

/** `heightMap` is the globe's `earth-height.png`; the layer borrows it and never disposes it. */
export function createOceanLayer(heightMap: Texture): GlobeLayer {
  let mesh: Mesh<SphereGeometry, MeshPhongMaterial> | undefined

  return {
    attach({ parent, globeRadius }) {
      const material = new MeshPhongMaterial({
        shininess: OCEAN_SHININESS,
        transparent: true,
        depthWrite: false,
      })
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, {
          oceanHeightMap: { value: heightMap },
          oceanShallowColor: { value: new Color(SHALLOW_COLOR) },
          oceanDeepColor: { value: new Color(DEEP_COLOR) },
        })
        shader.vertexShader =
          oceanVertexDeclarations +
          shader.vertexShader.replace(
            '#include <uv_vertex>',
            '#include <uv_vertex>\nvOceanUv = uv;',
          )
        shader.fragmentShader =
          oceanFragmentDeclarations +
          shader.fragmentShader.replace(
            '#include <color_fragment>',
            `#include <color_fragment>\n${oceanFragmentColor}`,
          )
      }
      const ocean = new Mesh(
        new SphereGeometry(
          globeRadius * OCEAN_RADIUS_RATIO,
          OCEAN_WIDTH_SEGMENTS,
          OCEAN_WIDTH_SEGMENTS / 2,
        ),
        material,
      )
      ocean.rotation.y = SHELL_ROTATION_Y
      ocean.renderOrder = RENDER_ORDER.ocean
      parent.add(ocean)
      mesh = ocean
    },
    detach() {
      if (mesh === undefined) {
        return
      }
      mesh.removeFromParent()
      mesh.geometry.dispose()
      mesh.material.dispose()
      mesh = undefined
    },
  }
}
