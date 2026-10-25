export interface LatLngAlt {
  lat: number
  lng: number
  /** Height above the surface, in globe radii. */
  altitude: number
  /**
   * Locale flights only. The camera sits about this many degrees off vertical,
   * south of the region. Globe.gl keeps the orbit target on the globe center.
   */
  tiltDegrees?: number
  /** When set, the flight frames this outline inside `inset` instead of using `altitude` alone. */
  locale?: {
    south: number
    north: number
    west: number
    east: number
    inset: { left: number; top: number; right: number; bottom: number }
    pin?: { lat: number; lng: number }
  }
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
  /** Current camera facing, including altitude. */
  view(): LatLngAlt
  /** The only way to re-enable auto-rotate after `flyTo`; user interaction still pauses it for 5 s after release. */
  setAutoRotate(enabled: boolean): void
  /**
   * `sf-bay-area` and `los-angeles-basin` share one California day plate, fade that locale's
   * window in at the focus altitude, draw its outline, and enable zoom. `new-york-city` does the
   * same with its own day image. The California cluster hides locale imagery and leaves zoom off.
   * Any other id, including `null`, hides the locale packs and outlines and disables zoom.
   */
  focusRegion(regionId: string | null): void
  /** Stops rendering and cloud drift until `resume`. */
  pause(): void
  resume(): void
  /** Releases listeners, GPU resources, and the WebGL context; later calls are no-ops. */
  destroy(): void
  /** Replaces the region pills. Copies `markers`; an empty list removes them. */
  setMarkers(markers: readonly GlobeMarker[]): void
  /** Scenario pins for the focused locale. Copies `points`; an empty list removes them. */
  setScenarioPins(points: readonly { lat: number; lng: number }[]): void
  /** Greens the pin at `point`. `null` leaves the pins up and clears the highlight. */
  setHoverPoint(point: { lat: number; lng: number } | null): void
  /** Draws the selection ring on that pill, or the cluster containing it. Ignores unknown ids; `null` clears. */
  highlightMarker(id: string | null): void
  /** Fires for an enabled pill that is not a cluster. Returns a function that removes `listener`. */
  onMarkerClick(listener: (id: string) => void): () => void
  /** `false` disables drag-rotate and pill clicks. Zoom is controlled by `focusRegion`. */
  setInteractive(enabled: boolean): void
}
