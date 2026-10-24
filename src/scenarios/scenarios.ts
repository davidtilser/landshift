import { findRegion, isSelectable, leafRegions } from '../regions/regions.ts'

export interface Scenario {
  id: string
  label: string
  summary: string
  regionIds: readonly string[]
  enabled: boolean
}

export const scenarios: readonly Scenario[] = [
  {
    id: 'datacenter-build',
    label: 'Datacenter build',
    summary:
      'A proposed datacenter in San José: follow it from site preparation to operation and see what changes.',
    regionIds: ['sf-bay-area'],
    enabled: true,
  },
]

const scenariosById = new Map<string, Scenario>()

for (const scenario of scenarios) {
  if (scenariosById.has(scenario.id)) {
    throw new Error(`Duplicate scenario id: ${scenario.id}`)
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
  if (!scenarios.some((scenario) => isPlayableIn(scenario, region.id))) {
    throw new Error(`Selectable region ${region.id} has no playable scenario`)
  }
}
