export interface LatLng {
  lat: number
  lng: number
}

export interface Region {
  id: string
  label: string
  enabled: boolean
  center: LatLng
  /** Camera height above the surface when focused, in globe radii. */
  altitude: number
  /** One-line brief shown when the region opens; `null` for regions that cannot be opened. */
  summary: string | null
  children: readonly Region[]
  /** Outline bounds used to frame a locale view. Absent when the region is not a framed locale. */
  extent?: LocaleExtent
}

export interface LocaleExtent {
  south: number
  north: number
  west: number
  east: number
}

interface RegionPlacement {
  id: string
  label: string
  lat: number
  lng: number
  altitude: number
}

interface LeafPlacement extends RegionPlacement {
  enabled: boolean
  summary?: string
  extent?: LocaleExtent
}

const EARTH_RADIUS_KM = 6371
const MIN_LOCALE_ALTITUDE_KM = 100
const LOCALE_CAMERA_FOV_DEGREES = 50

// Under a third of a 50° view, so the outline stays smaller than the free area beside the panel.
function localeFitAltitude(spanDegrees: number): number {
  const halfFov = (LOCALE_CAMERA_FOV_DEGREES * Math.PI) / 360
  const edge = Math.atan(0.32 * Math.tan(halfFov))
  const halfSpan = (spanDegrees * Math.PI) / 360
  const range = halfSpan / Math.tan(edge)
  return Math.max(range, MIN_LOCALE_ALTITUDE_KM / EARTH_RADIUS_KM)
}

function leaf(placement: LeafPlacement): Region {
  const { id, label, lat, lng, altitude, enabled } = placement
  return {
    id,
    label,
    enabled,
    center: { lat, lng },
    altitude,
    summary: placement.summary ?? null,
    children: [],
    ...(placement.extent === undefined ? {} : { extent: placement.extent }),
  }
}

// A container is browsable exactly when something inside it can be played.
function area(placement: RegionPlacement, children: readonly Region[]): Region {
  const { id, label, lat, lng, altitude } = placement
  return {
    id,
    label,
    enabled: children.some((child) => child.enabled),
    center: { lat, lng },
    altitude,
    summary: null,
    children,
  }
}

export const regions: readonly Region[] = [
  area(
    {
      id: 'united-states',
      label: 'United States',
      lat: 39.8,
      lng: -98.6,
      altitude: 1.8,
    },
    [
      area(
        {
          id: 'california',
          label: 'California',
          lat: 37.2,
          lng: -119.4,
          altitude: 0.9,
        },
        [
          leaf({
            id: 'sf-bay-area',
            label: 'SF Bay Area',
            lat: 37.8,
            lng: -122.3,
            // Nine-county outline, about 36.9° to 38.9°. The flight may sit farther to clear the panel.
            altitude: localeFitAltitude(1.971),
            extent: {
              south: 36.893,
              north: 38.864,
              west: -123.534,
              east: -121.208,
            },
            enabled: true,
            summary:
              'Cities, farms, and wild land in the SF Bay Area compete for the same soil and water.',
          }),
          leaf({
            id: 'los-angeles-basin',
            label: 'Los Angeles Basin',
            lat: 34.0,
            lng: -118.2,
            altitude: 0.35,
            extent: {
              south: 33.299,
              north: 34.823,
              west: -118.945,
              east: -117.413,
            },
            enabled: true,
            summary: 'This region has not been unlocked yet.',
          }),
          leaf({
            id: 'central-valley',
            label: 'Central Valley',
            lat: 36.7,
            lng: -119.8,
            altitude: 0.6,
            enabled: false,
          }),
          leaf({
            id: 'sierra-nevada',
            label: 'Sierra Nevada',
            lat: 38.0,
            lng: -119.6,
            altitude: 0.5,
            enabled: false,
          }),
        ],
      ),
      area(
        { id: 'texas', label: 'Texas', lat: 31.0, lng: -99.3, altitude: 1.0 },
        [
          leaf({
            id: 'houston-area',
            label: 'Houston Area',
            lat: 29.8,
            lng: -95.4,
            altitude: 0.35,
            enabled: false,
          }),
        ],
      ),
      area(
        {
          id: 'new-york',
          label: 'New York',
          lat: 42.9,
          lng: -75.5,
          altitude: 0.8,
        },
        [
          leaf({
            id: 'new-york-city',
            label: 'New York City',
            lat: 40.7,
            lng: -74.0,
            altitude: 0.3,
            extent: {
              south: 40.496,
              north: 40.918,
              west: -74.256,
              east: -73.7,
            },
            enabled: true,
            summary: 'This region has not been unlocked yet.',
          }),
        ],
      ),
    ],
  ),
  area(
    { id: 'brazil', label: 'Brazil', lat: -10.8, lng: -52.9, altitude: 1.8 },
    [
      leaf({
        id: 'amazon-basin',
        label: 'Amazon Basin',
        lat: -3.5,
        lng: -62.0,
        altitude: 1.0,
        enabled: false,
      }),
    ],
  ),
  area({ id: 'kenya', label: 'Kenya', lat: 0.2, lng: 37.9, altitude: 1.0 }, [
    leaf({
      id: 'nairobi-region',
      label: 'Nairobi Region',
      lat: -1.3,
      lng: 36.8,
      altitude: 0.35,
      enabled: false,
    }),
  ]),
  area({ id: 'india', label: 'India', lat: 22.0, lng: 79.0, altitude: 1.5 }, [
    leaf({
      id: 'ganges-delta',
      label: 'Ganges Delta',
      lat: 22.5,
      lng: 89.0,
      altitude: 0.5,
      enabled: false,
    }),
  ]),
  area(
    {
      id: 'netherlands',
      label: 'Netherlands',
      lat: 52.2,
      lng: 5.3,
      altitude: 0.6,
    },
    [
      leaf({
        id: 'rhine-delta',
        label: 'Rhine Delta',
        lat: 51.9,
        lng: 4.5,
        altitude: 0.3,
        enabled: false,
      }),
    ],
  ),
  area(
    {
      id: 'australia',
      label: 'Australia',
      lat: -25.0,
      lng: 134.0,
      altitude: 1.8,
    },
    [
      leaf({
        id: 'murray-darling-basin',
        label: 'Murray-Darling Basin',
        lat: -34.2,
        lng: 145.5,
        altitude: 0.35,
        extent: {
          south: -35.6,
          north: -32.8,
          west: 143.2,
          east: 147.8,
        },
        enabled: true,
        summary: 'This region has not been unlocked yet.',
      }),
    ],
  ),
  area(
    { id: 'japan', label: 'Japan', lat: 36.2, lng: 138.3, altitude: 1.2 },
    [
      leaf({
        id: 'kanto-plain',
        label: 'Kanto Plain',
        lat: 35.7,
        lng: 139.8,
        altitude: 0.3,
        extent: {
          south: 35.25,
          north: 36.2,
          west: 139.2,
          east: 140.4,
        },
        enabled: true,
        summary: 'This region has not been unlocked yet.',
      }),
    ],
  ),
]

const regionsById = new Map<string, Region>()

function indexRegions(list: readonly Region[]): void {
  for (const region of list) {
    if (regionsById.has(region.id)) {
      throw new Error(`Duplicate region id: ${region.id}`)
    }
    if (isSelectable(region) && region.summary === null) {
      throw new Error(`Selectable region ${region.id} needs a summary`)
    }
    regionsById.set(region.id, region)
    indexRegions(region.children)
  }
}

indexRegions(regions)

export const leafRegions: readonly Region[] = [...regionsById.values()].filter(
  (region) => region.children.length === 0,
)

export function findRegion(id: string): Region | undefined {
  return regionsById.get(id)
}

/** An enabled leaf: the only kind of region a player can open. */
export function isSelectable(region: Region): boolean {
  return region.enabled && region.children.length === 0
}

/** An enabled container whose children can be listed. */
export function isBrowsable(region: Region): boolean {
  return region.enabled && region.children.length > 0
}
