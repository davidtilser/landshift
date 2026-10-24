export interface ScenarioSummary {
  id: string
  title: string
  location: string
  sourceUrl: string
  dataStatus: 'not-prepared' | 'prepared'
}

export const SAN_JOSE_SCENARIO_ID = 'san-jose-dc04'

// Shared selection metadata. Geographic inputs belong in the local data pack.
export const scenarios: readonly ScenarioSummary[] = [
  {
    id: SAN_JOSE_SCENARIO_ID,
    title: 'San José Data Center 04',
    location: 'Orchard Parkway and Component Drive, San José',
    sourceUrl:
      'https://www.energy.ca.gov/powerplant/backup-generating-system/san-jose-data-center-04',
    dataStatus: 'prepared',
  },
]

export function getScenario(id: string): ScenarioSummary | undefined {
  return scenarios.find((scenario) => scenario.id === id)
}
