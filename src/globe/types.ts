export interface LatLngAlt {
  lat: number
  lng: number
  /** Height above the surface, in globe radii. */
  altitude: number
}

/** A region pill anchored on the globe. `group` is the parent region's label. */
export interface GlobeMarker {
  id: string
  lat: number
  lng: number
  label: string
  enabled: boolean
  group: string
}

export interface GlobeHandle {
  /**
   * Turns auto-rotate off and flies to `target`. Resolves after `durationMs` (immediately under
   * reduced motion), or early on a new flight, a user drag, or `destroy`; it does not wait out a `pause`.
   * `target.altitude` is raised to the orbit minimum, which keeps the camera above the clouds.
   */
  flyTo(target: LatLngAlt, durationMs?: number): Promise<void>
  /** The only way to re-enable auto-rotate after `flyTo`; user interaction still pauses it for 5 s after release. */
  setAutoRotate(enabled: boolean): void
  /** Stops rendering and cloud drift until `resume`. */
  pause(): void
  resume(): void
  /** Releases listeners, GPU resources, and the WebGL context; later calls are no-ops. */
  destroy(): void
  /** Replaces the region pills. Copies `markers`; an empty list removes them. */
  setMarkers(markers: readonly GlobeMarker[]): void
  /** Draws the selection ring on that pill, or the cluster containing it. Ignores unknown ids; `null` clears. */
  highlightMarker(id: string | null): void
  /** Fires for an enabled pill that is not a cluster. Returns a function that removes `listener`. */
  onMarkerClick(listener: (id: string) => void): () => void
  /** `false` disables drag-rotate and pill clicks. Zoom stays disabled. */
  setInteractive(enabled: boolean): void
}
