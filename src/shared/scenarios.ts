export interface ScenarioSummary {
  id: string
  title: string
  location: string
  sourceUrl: string
  dataStatus: 'not-prepared' | 'prepared'
}

export const SAN_JOSE_SCENARIO_ID = 'san-jose-dc04'
export const GOLDEN_GATE_SCENARIO_ID = 'golden-gate-park'
export const POLO_SCENARIO_ID = 'golden-gate-polo'

// Shared selection metadata. Geographic inputs belong in the local data pack.
export const scenarios: readonly ScenarioSummary[] = [
  {
    id: GOLDEN_GATE_SCENARIO_ID,
    title: 'Golden Gate Park · Heroes’ Grove',
    location: 'Heroes’ Grove WWI Memorial, San Francisco',
    sourceUrl:
      'https://tile.loc.gov/storage-services/master/pnp/habshaer/ca/ca4300/ca4343/data/ca4343data.pdf',
    dataStatus: 'prepared',
  },
  {
    id: POLO_SCENARIO_ID,
    title: 'Golden Gate Park · Polo Fields',
    location: 'Polo Fields, San Francisco',
    sourceUrl: 'https://sfrecpark.org/877/Golden-Gate-Park---Polo-Field',
    dataStatus: 'prepared',
  },
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
