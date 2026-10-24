/** A region pill on the globe. */
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
  /**
   * Replaces the region pills; an empty list removes them. Pills are pointer-only buttons kept out of
   * the Tab order (the landing screen's hidden region list is the keyboard path) and render only on
   * the visible hemisphere. Enabled pills are highlighted and glow dimly on hover; disabled pills are
   * muted, read "Coming soon", and never emit clicks.
   */
  setMarkers(markers: readonly LandingMarker[]): void
  /** Marks the selected region's pill; `null` clears it and unknown ids are ignored. */
  highlightMarker(id: string | null): void
  /** Fires for clicks on enabled pills only. Returns a function that removes `listener`. */
  onMarkerClick(listener: (id: string) => void): () => void
  /** `false` disables drag-rotate and pill clicks; zoom stays disabled either way. */
  setInteractive(enabled: boolean): void
  pause(): void
  resume(): void
}
