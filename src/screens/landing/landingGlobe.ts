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
  /** Locale flights only: degrees off vertical, from the south. */
  tiltDegrees?: number
  /** Frames this outline in the free area. `pin` biases the same view toward one scenario. */
  locale?: {
    south: number
    north: number
    west: number
    east: number
    inset: { left: number; top: number; right: number; bottom: number }
    pin?: { lat: number; lng: number }
  }
}

/** Shallow oblique for a selected leaf. Overview and cluster flights omit it. */
export const LOCALE_TILT_DEGREES = 10

/** Whole-planet camera for this visit, chosen once from the Americas eastward to Korea. */
export const OVERVIEW: Readonly<GlobeTarget> = { ...openingView }

/** What the landing screen needs from the globe; any implementation that matches structurally works. */
export interface LandingGlobe {
  /** Turns auto-rotate off and resolves when the camera arrives. */
  flyTo(target: GlobeTarget): Promise<void>
  /** The camera's current facing. Back uses it so only the zoom level changes. */
  view(): GlobeTarget
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
  /** `false` disables drag-rotate and pill clicks. Zoom stays off until a focused region turns it on. */
  setInteractive(enabled: boolean): void
  /**
   * `sf-bay-area` loads that terrain pack, fades it in at the focus altitude, and enables zoom.
   * Any other id, including `null`, clears the pack and disables zoom.
   */
  focusRegion(regionId: string | null): void
  pause(): void
  resume(): void
}
