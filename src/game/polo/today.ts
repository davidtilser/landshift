import { poloSizedIrrigationM3Year, poloSizedPhase } from './size.ts'
import { usAcres, usGallons, usInches } from './us-units.ts'
import type { PoloSceneState } from './model.ts'

export const POLO_TODAY_TABS = [
  'general',
  'water',
  'electricity',
  'land',
] as const
export type PoloTodayTab = (typeof POLO_TODAY_TABS)[number]

interface TodayCard {
  metrics: { label: string; value: string; note?: string }[]
  copy?: string
  details: string[]
  detailsTitle?: string
  sources?: { label: string; url: string }[]
}

/** Today reads the existing scenario inputs; unknown park use stays unknown. */
export function poloTodayCard(
  state: PoloSceneState,
  tab: PoloTodayTab,
): TodayCard {
  const { data } = poloSizedPhase(state, 'M0')
  if (tab === 'general')
    return {
      metrics: [
        { label: 'Selected demo area', value: usAcres(state.areaHa * 10_000) },
        { label: 'Current use', value: 'Playing field' },
      ],
      detailsTitle: 'More info & data sources',
      details: [
        'This demo covers part of Polo Fields, not the entire venue or a surveyed parcel. No construction has started.',
        'SF Recreation & Parks describes the playing fields. UNCCD and USGS provide land and water context, not measurements of this site.',
      ],
      sources: [
        {
          label: 'sfrecpark.org/847/Polo...',
          url: 'https://sfrecpark.org/847/Polo',
        },
        {
          label: 'unccd.int/land-and-life/...',
          url: 'https://www.unccd.int/land-and-life/land-degradation-neutrality/overview',
        },
        {
          label: 'usgs.gov/water-science-school/...',
          url: 'https://www.usgs.gov/water-science-school/science/infiltration-and-water-cycle',
        },
      ],
    }
  if (tab === 'water')
    return {
      metrics: [
        {
          label: 'Model irrigation',
          value: `${usGallons(poloSizedIrrigationM3Year(state))}/year`,
          note: 'Teaching allowance',
        },
        { label: 'Example rain event', value: usInches(data.rainfallMm) },
      ],
      copy: 'Grass needs water to stay usable. Actual irrigation demand and water sources are not established here.',
      details: [
        'Irrigation uses the existing teaching allowance of 300 mm delivered per year, scaled to the selected area. It is not metered park demand.',
        'The rain replay uses a NOAA observation from San Francisco Downtown on December 11, 2014, about 3.6 miles away. It is not an on-field measurement.',
        data.rainRunoffM3 === null
          ? 'Runoff is not quantified.'
          : `${usGallons(data.rainRunoffM3)} of modelled runoff during this single event. This is not an annual total or a flood forecast.`,
      ],
    }
  if (tab === 'electricity')
    return {
      metrics: [
        { label: 'Existing park electricity use', value: 'Not established' },
      ],
      copy: 'Park operations use equipment and shared services. Unknown electricity use does not mean zero.',
      details: [
        'A real comparison needs local meter readings and operating records.',
        'Future data-center demand is separate from the existing park baseline.',
      ],
    }
  return {
    metrics: [
      { label: 'Playing-field turf', value: usAcres(data.areasM2.turf) },
      {
        label: 'Built surfaces in the demo area',
        value: usAcres(data.areasM2.roof + data.areasM2.other_impervious),
      },
    ],
    copy: 'People use this public field for sport, walks and time together. Its existing uses matter before any new project starts.',
    details: [
      'Surface areas describe the selected teaching boundary, not the whole park.',
      'Visitor numbers, usable sports capacity and public-access areas have not been measured for this model.',
    ],
  }
}
