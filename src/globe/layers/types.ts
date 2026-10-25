import type { Object3D } from 'three'

export interface GlobeLayerContext {
  parent: Object3D
  globeRadius: number
}

/** A layer that needs a globe.gl data channel (such as pointsData) receives it explicitly and owns it exclusively. */
export interface GlobeLayer {
  attach(context: GlobeLayerContext): void
  detach(): void
}
