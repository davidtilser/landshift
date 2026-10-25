import {
  findRegion,
  isSelectable,
  leafRegions,
  type LatLng,
} from '../regions/regions.ts'

export interface Scenario {
  id: string
  label: string
  summary: string
  location: LatLng
  regionIds: readonly string[]
  enabled: boolean
}

export const scenarios: readonly Scenario[] = [
  {
    id: 'datacenter-build',
    label: 'Datacenter build',
    summary:
      'A proposed datacenter at the Polo Field in Golden Gate Park: follow it from site preparation to operation and see what changes.',
    // Polo Field in Golden Gate Park, inside the nine-county outline.
    location: { lat: 37.7687, lng: -122.4928 },
    regionIds: ['sf-bay-area'],
    enabled: true,
  },
  {
    id: 'hillside-housing',
    label: 'Hillside housing',
    summary:
      'New homes on the wildland edge: weigh housing against fire risk, habitat, and runoff.',
    location: { lat: 37.48, lng: -121.92 },
    regionIds: ['sf-bay-area'],
    enabled: true,
  },
  {
    id: 'farmland-edge',
    label: 'Farmland-edge conversion',
    summary:
      'The city grows onto valley farmland: weigh homes and jobs against soil and local food.',
    location: { lat: 37.38, lng: -121.95 },
    regionIds: ['sf-bay-area'],
    enabled: true,
  },
  {
    id: 'salt-pond-restoration',
    label: 'Salt-pond restoration',
    summary:
      'Baylands return to tidal marsh: weigh habitat and flood buffering against land that could still be built on.',
    location: { lat: 37.45, lng: -122.08 },
    regionIds: ['sf-bay-area'],
    enabled: true,
  },
  {
    id: 'la-sample-1',
    label: 'Not unlocked yet',
    summary: 'This region has not been unlocked yet.',
    // City center, not a researched site. The region is still locked.
    location: { lat: 34.05, lng: -118.24 },
    regionIds: ['los-angeles-basin'],
    enabled: false,
  },
  {
    id: 'la-sample-2',
    label: 'Not unlocked yet',
    summary: 'This region has not been unlocked yet.',
    location: { lat: 33.94, lng: -118.4 },
    regionIds: ['los-angeles-basin'],
    enabled: false,
  },
  {
    id: 'nyc-sample-1',
    label: 'Not unlocked yet',
    summary: 'This region has not been unlocked yet.',
    // City center, not a researched site. The region is still locked.
    location: { lat: 40.71, lng: -74.01 },
    regionIds: ['new-york-city'],
    enabled: false,
  },
  {
    id: 'nyc-sample-2',
    label: 'Not unlocked yet',
    summary: 'This region has not been unlocked yet.',
    location: { lat: 40.75, lng: -73.98 },
    regionIds: ['new-york-city'],
    enabled: false,
  },
]

const scenariosById = new Map<string, Scenario>()

for (const scenario of scenarios) {
  if (scenariosById.has(scenario.id)) {
    throw new Error(`Duplicate scenario id: ${scenario.id}`)
  }
  if (
    !Number.isFinite(scenario.location.lat) ||
    !Number.isFinite(scenario.location.lng)
  ) {
    throw new Error(`Scenario ${scenario.id} has no location`)
  }
  for (const regionId of scenario.regionIds) {
    if (!findRegion(regionId)) {
      throw new Error(
        `Scenario ${scenario.id} names unknown region ${regionId}`,
      )
    }
  }
  scenariosById.set(scenario.id, scenario)
}

export function findScenario(id: string): Scenario | undefined {
  return scenariosById.get(id)
}

/** Every scenario listed for `regionId`, including ones that are not playable yet. */
export function scenariosForRegion(regionId: string): readonly Scenario[] {
  return scenarios.filter((scenario) => scenario.regionIds.includes(regionId))
}

export function isPlayableIn(scenario: Scenario, regionId: string): boolean {
  return scenario.enabled && scenario.regionIds.includes(regionId)
}

for (const region of leafRegions.filter(isSelectable)) {
  if (scenariosForRegion(region.id).length === 0) {
    throw new Error(`Selectable region ${region.id} has no scenario`)
  }
}
