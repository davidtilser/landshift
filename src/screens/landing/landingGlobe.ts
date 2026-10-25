import { openingView } from '../../globe/openingView.ts'

/** A region pill on the globe. */
export interface LandingMarker {
  id: string
  lat: number
  lng: number
  label: string
  enabled: boolean
  /** Parent region label. Clusters use it when every member shares one. */
  group: string
}

export interface GlobeTarget {
  lat: number
  lng: number
  /** Height above the surface, in globe radii. */
  altitude: number
}

/** Whole-planet camera for this visit. Longitude is chosen once when the page loads. */
export const OVERVIEW: Readonly<GlobeTarget> = { ...openingView }

/** What the landing screen needs from the globe; any implementation that matches structurally works. */
export interface LandingGlobe {
  /** Turns auto-rotate off and resolves when the camera arrives. */
  flyTo(target: GlobeTarget): Promise<void>
  setAutoRotate(enabled: boolean): void
  /**
   * Replaces the region pills; an empty list removes them. Pills are pointer-only buttons kept out of
   * the Tab order (the landing screen's hidden region list is the keyboard path) and render only on
   * the visible hemisphere. Enabled pills are highlighted and glow dimly on hover; disabled pills are
   * muted, read "Coming soon", and never emit clicks. Overlapping pills merge only when they share a group.
   */
  setMarkers(markers: readonly LandingMarker[]): void
  /** Marks the selected region's pill, or the cluster that contains it; `null` clears it and unknown ids are ignored. */
  highlightMarker(id: string | null): void
  /** Fires for clicks on enabled pills that are not clusters. Returns a function that removes `listener`. */
  onMarkerClick(listener: (id: string) => void): () => void
  /** `false` disables drag-rotate and pill clicks; zoom stays disabled either way. */
  setInteractive(enabled: boolean): void
  pause(): void
  resume(): void
}
