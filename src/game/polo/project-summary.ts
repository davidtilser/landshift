import type { PoloSceneState } from './model.ts'
import { poloSizedPhase, poloSizedReference } from './size.ts'
import {
  poloResourceQuantities,
  poloWaterStory,
  poloElectricityStory,
  poloRainStory,
} from './resource-story.ts'
import { hasActivePoloLearningPlan } from './learnings.ts'
import { activePoloImprovements } from './interventions.ts'
import { usAcres } from './us-units.ts'

export interface PoloSummaryMetric {
  id: 'computing' | 'water' | 'electricity' | 'turf' | 'drainage'
  icon: string
  title: string
  change: string
  tone: 'gain' | 'pressure'
  before: string
  after: string
  basis: string
  note: string
  percent: number | null
  sources?: { title: string; url: string }[]
}

/** Authored household-scale proxy, fixed for the existing facilities rather
 * than scaled with campus area. It is not a metered park electricity inventory.
 */
export const POLO_EXISTING_FACILITIES_ELECTRICITY = {
  lowKWhDay: 15,
  highKWhDay: 30,
  sources: [
    {
      title: 'CEC · 2019 California household electricity',
      url: 'https://www.energy.ca.gov/sites/default/files/2021-08/CEC-200-2021-005-ES.pdf',
    },
    {
      title: 'EIA · 2022 U.S. residential electricity purchases',
      url: 'https://www.eia.gov/tools/faqs/faq.php?id=97&t=7',
    },
  ],
}

const number = (value: number): string =>
  value.toLocaleString('en-US', { maximumFractionDigits: 1 })
const percentChange = (before: number, after: number): number =>
  ((after - before) / before) * 100
const percentage = (value: number): string =>
  `${value > 0 ? '+' : '−'}${Math.round(Math.abs(value)).toLocaleString('en-US')}%`

/** Original campus versus Today, at one selected area and matching time bases.
 * Visual improvements and arbitrary proposals have no calculated outcomes.
 */
export function poloProjectSummary(state: PoloSceneState): {
  area: string
  originalReferenceOnly: boolean
  metrics: PoloSummaryMetric[]
} {
  const original = {
    ...state,
    confirmed: true,
    preview: false,
    proposal: null,
    improvements: undefined,
    learnings: undefined,
    customLearnings: undefined,
  }
  const today = { ...original, phase: 'M0' as const }
  const operating = { ...original, phase: 'M6' as const }
  const before = poloSizedPhase(today).data
  const after = poloSizedPhase(operating).data
  const quantities = poloResourceQuantities(operating)
  const reference = poloSizedReference(operating)
  const water = percentChange(
    quantities.irrigationM3Year,
    quantities.operatingWaterM3Year,
  )
  const turf = percentChange(before.areasM2.turf, after.areasM2.turf)
  const drainage =
    before.rainManagedDrainageM3 !== null &&
    before.rainManagedDrainageM3 > 0 &&
    after.rainManagedDrainageM3 !== null
      ? percentChange(before.rainManagedDrainageM3, after.rainManagedDrainageM3)
      : null
  return {
    area: usAcres(state.areaHa * 10_000),
    originalReferenceOnly:
      hasActivePoloLearningPlan(state) ||
      activePoloImprovements(state).length > 0 ||
      (state.phase === 'M6' && state.preview && state.proposal !== null),
    metrics: [
      {
        id: 'computing',
        icon: '◎',
        title: 'Computing activity',
        change: `+${number(reference.averageItMW)} MW`,
        tone: 'gain',
        before: 'No campus',
        after: `${number(reference.averageItMW)} MW average IT`,
        basis: 'New capability',
        percent: null,
        note: 'New computing infrastructure. Local benefits and who receives them are not measured.',
      },
      {
        id: 'water',
        icon: '💧',
        title: 'Water supplied',
        change: percentage(water),
        tone: 'pressure',
        before: poloWaterStory(today).value.replace('/year', ''),
        after: poloWaterStory(operating).value.replace('/year', ''),
        basis: 'US gallons per year',
        percent: water,
        note: 'Modelled field irrigation → the whole campus, including cooling. Water supplied is not all evaporated.',
      },
      {
        id: 'electricity',
        icon: '⚡',
        title: 'Electricity demand',
        change: `+${number(quantities.operatingDayKWh / 1000)} MWh/day`,
        tone: 'pressure',
        before: `~${String(POLO_EXISTING_FACILITIES_ELECTRICITY.lowKWhDay)}–${String(POLO_EXISTING_FACILITIES_ELECTRICITY.highKWhDay)} kWh/day`,
        after: poloElectricityStory(operating).value,
        basis: 'Household-scale facilities estimate → new campus demand',
        percent: null,
        note: 'The existing changing room and toilets use an illustrative 15–30 kWh/day household-scale allowance, not metered site data or an occupancy calculation. Context: CEC reports 6,174 kWh/household/year in 2019 (about 17 kWh/day); EIA reports 10,791 kWh/residential customer/year purchased in 2022 (about 30 kWh/day). The range is a teaching assumption, not a statistical interval. The campus figure includes servers, cooling and support; the rounded badge shows added campus demand, not an assessed net site increase.',
        sources: POLO_EXISTING_FACILITIES_ELECTRICITY.sources,
      },
      {
        id: 'turf',
        icon: '🌱',
        title: 'Playing-field turf',
        change: percentage(turf),
        tone: 'pressure',
        before: usAcres(before.areasM2.turf),
        after: usAcres(after.areasM2.turf),
        basis: 'Inside the same site',
        percent: turf,
        note: 'Remaining grass does not restore the original public playing field. People and sports capacity are not counted here.',
      },
      {
        id: 'drainage',
        icon: '☂',
        title: 'Rainwater to drainage',
        change: drainage === null ? 'Not assessed' : percentage(drainage),
        tone: 'pressure',
        before:
          poloRainStory(today).value?.replace(' to drainage', '') ??
          'Not assessed',
        after:
          poloRainStory(operating).value?.replace(' to drainage', '') ??
          'Not assessed',
        basis: 'Same 3.4-inch rain event',
        percent: drainage,
        note: 'Modelled volume with the campus tank initially empty. This is not annual water use or a flood forecast.',
      },
    ],
  }
}
