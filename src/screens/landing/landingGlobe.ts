export interface LandingMarker {
  id: string
  lat: number
  lng: number
  label: string
  enabled: boolean
}

export interface GlobeTarget {
  lat: number
  lng: number
  /** Height above the surface, in globe radii. */
  altitude: number
}

/** Whole-planet camera used outside a focused region. */
export const OVERVIEW: Readonly<GlobeTarget> = {
  lat: 20,
  lng: -122.3,
  altitude: 2.5,
}

/** What the landing screen needs from the globe; any implementation that matches structurally works. */
export interface LandingGlobe {
  /** Turns auto-rotate off and resolves when the camera arrives. */
  flyTo(target: GlobeTarget): Promise<void>
  setAutoRotate(enabled: boolean): void
  setMarkers(markers: readonly LandingMarker[]): void
  /** `null` clears the highlight; ids without a marker are ignored. */
  highlightMarker(id: string | null): void
  /** Returns a function that removes `listener`. */
  onMarkerClick(listener: (id: string) => void): () => void
  pause(): void
  resume(): void
}
