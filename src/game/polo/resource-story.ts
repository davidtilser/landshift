import { POLO_BASELINE } from './baseline.ts'
import type { PoloSceneState } from './model.ts'
import {
  poloAreaRatio,
  poloSizedIrrigationM3Year,
  poloSizedPhase,
  poloSizedReference,
} from './size.ts'
import { usInches } from './us-units.ts'

export interface ResourceStory {
  value: string
  label: string
  copy: string
  comparison: { value: string; label: string }
  details: string[]
}

// Presentation precision: retain the distinction between 30.2M and 3.2M.
const gallons = (m3: number): string => {
  const amount = m3 / 0.003785411784
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M US gal`
  if (amount >= 10_000)
    return `${Math.round(amount / 1000).toLocaleString('en-US')}k US gal`
  return `${Math.round(amount).toLocaleString('en-US')} US gal`
}
const number = (value: number): string =>
  value.toLocaleString('en-US', { maximumFractionDigits: 1 })
const times = (value: number): string => `${number(value)}×`

/** Selected model days, not a split or extension of the construction inventory. */
export function poloResourceQuantities(state: PoloSceneState): {
  irrigationM3Year: number
  projectWaterM3: number
  commissioningWaterM3: number
  operatingWaterM3Year: number
  workdayKWh: number
  testDayKWh: number
  operatingDayKWh: number
} {
  const ratio = poloAreaRatio(state)
  const reference = poloSizedReference(state)
  const commissioning = poloSizedPhase(state, 'M5').data
  // Sum original, non-overlapping research work stages, never runtime chapters.
  const projectWaterM3 =
    POLO_BASELINE.researchPhases
      .filter((phase) => phase.id !== 'M0' && phase.id !== 'M6')
      .reduce((sum, phase) => sum + (phase.data.stageWaterSuppliedM3 ?? 0), 0) *
    ratio
  // Existing water packet: 3 m³/day domestic use and 300 mm/year irrigation
  // on final turf + landscape. These are scenario assumptions, not park records.
  const finalGround = poloSizedPhase(state, 'M6').data.areasM2
  const operatingIrrigation = (finalGround.turf + finalGround.landscape) * 0.3
  return {
    irrigationM3Year: poloSizedIrrigationM3Year(state),
    projectWaterM3,
    commissioningWaterM3: commissioning.stageWaterSuppliedM3 ?? 0,
    operatingWaterM3Year:
      reference.coolingMakeupM3Day * 365 +
      3 * 365 * ratio +
      operatingIrrigation,
    workdayKWh: 30 * 8 * ratio,
    testDayKWh: 500 * 4 * ratio,
    operatingDayKWh: reference.averageFacilityMW * 1000 * 24,
  }
}

export function poloWaterStory(state: PoloSceneState): ResourceStory {
  const quantities = poloResourceQuantities(state)
  const details = [
    'Educational scenario, not measurements or a validated forecast for Polo Fields. Water supplied includes water that later leaves as wastewater; it is not all evaporated.',
    'Volumes scale with the selected area as a teaching assumption. Replay and chapter changes never add consumption.',
  ]
  switch (state.phase) {
    case 'M0':
      return {
        value: `${gallons(quantities.irrigationM3Year)}/year`,
        label: 'Modelled irrigation',
        copy: 'The grass field needs watering to stay usable. This is our reference for comparing the water needed by the future campus.',
        comparison: {
          value: 'Today’s reference',
          label: 'Same area · one year',
        },
        details: [
          ...details,
          '300 mm/year applied to the selected field area (12,000 m³/year at 4 ha). This is not metered park demand; actual supply and water sources are unknown.',
        ],
      }
    case 'M1':
    case 'M4': {
      const foundations = state.phase === 'M1'
      return {
        value: gallons(quantities.projectWaterM3),
        label: 'Selected site-water budget · before opening',
        copy: foundations
          ? 'Construction needs water to control dust and support concrete work. It is temporary project demand, before everyday server cooling begins.'
          : 'Water is still needed as the frame and roof go up. This draws on the same project budget introduced in Foundations, rather than a second allowance.',
        comparison: {
          value: foundations ? 'Temporary demand' : 'Same budget',
          label: foundations
            ? 'One shared budget before opening'
            : 'Already introduced in Foundations',
        },
        details: [
          ...details,
          'The original research work stages supply 3,828 m³ to the site before opening at 4 ha, including 215 m³ for commissioning. The figure is a shared selected budget, not water already used at this chapter.',
          'The separately counted 1,080 m³ used for offsite concrete mixing is excluded. These 4 ha reference quantities scale with area. Foundations has no separately assessed water total, duration or runoff.',
        ],
      }
    }
    case 'M5':
      return {
        value: gallons(quantities.commissioningWaterM3),
        label: 'Selected commissioning water · one time',
        copy: 'Water fills and flushes the systems before the campus opens. This is a one-time preparation step; continuous cooling has not started yet.',
        comparison: {
          value: 'Part of the budget',
          label: 'Included in the pre-opening site water',
        },
        details: [
          ...details,
          '215 m³ at the 4 ha reference size, already included in the 3,828 m³ selected project budget. Do not add it again or treat it as daily consumption.',
        ],
      }
    case 'M6': {
      const cooling = poloSizedReference(state).coolingMakeupM3Day
      return {
        value: `${gallons(quantities.operatingWaterM3Year)}/year`,
        label: 'Modelled water supplied · whole campus',
        copy: 'Servers produce heat around the clock. In this evaporative cooling design, removing that heat needs a regular water supply. Less grass needs watering, but cooling makes total demand much larger.',
        comparison: {
          value: times(
            quantities.operatingWaterM3Year / quantities.irrigationM3Year,
          ),
          label: 'Today’s modelled irrigation · same area, one year',
        },
        details: [
          ...details,
          'At 4 ha: 114,195 m³/year supplied = 109,500 cooling + 1,095 domestic use + 3,600 irrigation. The comparison divides unrounded annual totals, not annual supply by a one-time construction budget.',
          `Cooling alone needs about ${gallons(cooling)} of make-up water per average day: about ${gallons(cooling * 0.75)} evaporates and ${gallons(cooling * 0.25)} leaves as managed blowdown. This selected design does not represent every data centre.`,
        ],
      }
    }
  }
}

export function poloElectricityStory(state: PoloSceneState): ResourceStory {
  const quantities = poloResourceQuantities(state)
  const details = [
    'Selected educational model days, not measured increases in total site electricity. The existing park demand, peak facility load and grid headroom remain unknown.',
    'Power and energy scale with the selected area. Workday and test-day hours stay fixed. The 4 ha reference figures below are not totals for every selected size.',
  ]
  switch (state.phase) {
    case 'M0':
      return {
        value: '0 kWh/day',
        label: 'Added data-centre electricity',
        copy: 'The data centre has not added any electricity demand yet. The park may already use electricity for its own activities; that existing use is unknown here.',
        comparison: {
          value: 'Before construction',
          label: 'Zero applies to the new project only',
        },
        details,
      }
    case 'M1':
    case 'M4':
      return {
        value: `${number(quantities.workdayKWh)} kWh/workday`,
        label: 'Selected temporary-power allowance',
        copy:
          state.phase === 'M1'
            ? 'Tools and site facilities need temporary power while foundations are built. Unlike future servers, this allowance covers an eight-hour workday.'
            : 'Temporary power keeps tools and site facilities running as the building rises. The daily allowance stays the same; this chapter does not add another construction budget.',
        comparison: {
          value: state.phase === 'M1' ? 'Workday reference' : 'Same allowance',
          label:
            state.phase === 'M1'
              ? '8 hours of temporary power'
              : 'Unchanged from Foundations',
        },
        details: [
          ...details,
          'At 4 ha: 30 kW × 8 hours = 240 kWh/workday. Applying this daily construction allowance to Foundations is a new teaching assumption; no Foundations duration or separate stage inventory is invented.',
          'The original 38.4 MWh inventory covers foundations and structure together over 160 selected workdays. Diesel for machinery is separate from the electricity shown here.',
        ],
      }
    case 'M5':
      return {
        value: `${number(quantities.testDayKWh / 1000)} MWh/test day`,
        label: 'Selected electrical tests',
        copy: 'Cooling and electrical systems are tested before opening. Running larger equipment raises electricity demand for a test day, even before normal computing begins.',
        comparison: {
          value: times(quantities.testDayKWh / quantities.workdayKWh),
          label: 'The selected construction workday',
        },
        details: [
          ...details,
          'At 4 ha: 500 kW × 4 hours = 2,000 kWh (2 MWh) per selected test day. The original ten-day commissioning inventory remains 20 MWh. Generator-test fuel is unknown.',
        ],
      }
    case 'M6':
      return {
        value: `${number(quantities.operatingDayKWh / 1000)} MWh/day`,
        label: 'Average whole-facility electricity',
        copy: 'Servers now compute day and night, continuously producing heat. Cooling and other support systems need power too, so the campus draws electricity for all 24 hours.',
        comparison: {
          value: times(quantities.operatingDayKWh / quantities.workdayKWh),
          label: 'The selected construction workday',
        },
        details: [
          ...details,
          `Also ${times(quantities.operatingDayKWh / quantities.testDayKWh)} the selected commissioning test day. These comparisons describe different model days, not a measured increase from the playing field.`,
          'At 4 ha: 12 MW × 24 hours = 288 MWh/average day. This already includes 10 MW average IT plus cooling and all other supporting systems; cooling electricity is not added again. Annual facility energy remains 105.12 GWh.',
        ],
      }
  }
}

export function poloRainStory(state: PoloSceneState): {
  copy: string
  value: string | null
  comparison: string
  details: string[]
} {
  const today = poloSizedPhase(state, 'M0').data
  const data = poloSizedPhase(state).data
  const drainage = data.rainManagedDrainageM3
  const reference = today.rainManagedDrainageM3
  const completed = state.phase === 'M5' || state.phase === 'M6'
  return {
    copy:
      state.phase === 'M0'
        ? 'Grass lets more rain soak into the ground. Some still runs off into drainage.'
        : 'More built and paved ground sends more rainwater into drainage.',
    value: drainage === null ? null : `${gallons(drainage)} to drainage`,
    comparison:
      drainage === null || reference === null
        ? 'Runoff is not quantified for Foundations.'
        : state.phase === 'M0'
          ? `Today’s reference · one ${usInches(data.rainfallMm)} rain event`
          : `${times(drainage / reference)} today’s modelled drainage · same rain event`,
    details: [
      'Separate from water supplied: one 3.4-inch / 86.4 mm rain event, based on a NOAA observation in San Francisco Downtown on December 11, 2014, about 3.6 miles away; not an on-field measurement or flood forecast.',
      completed
        ? 'The model tank starts empty: 200 m³ capacity at 4 ha, scaled with area. Capture is subtracted once from event runoff, never from annual supplied water.'
        : 'The roof tank is not available in this chapter.',
      'Water that avoids drainage is not all groundwater recharge or permanently retained water.',
    ],
  }
}
