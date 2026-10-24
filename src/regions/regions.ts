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
  children: readonly Region[]
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
}

function leaf(placement: LeafPlacement): Region {
  const { id, label, lat, lng, altitude, enabled } = placement
  return { id, label, enabled, center: { lat, lng }, altitude, children: [] }
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
            altitude: 0.35,
            enabled: true,
          }),
          leaf({
            id: 'los-angeles-basin',
            label: 'Los Angeles Basin',
            lat: 34.0,
            lng: -118.2,
            altitude: 0.35,
            enabled: false,
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
            enabled: false,
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
]

const regionsById = new Map<string, Region>()

function indexRegions(list: readonly Region[]): void {
  for (const region of list) {
    if (regionsById.has(region.id)) {
      throw new Error(`Duplicate region id: ${region.id}`)
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
