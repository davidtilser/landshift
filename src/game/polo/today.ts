import { poloSizedPhase } from './size.ts'
import { usAcres } from './us-units.ts'
import {
  poloWaterStory,
  poloElectricityStory,
  poloRainStory,
} from './resource-story.ts'
import type { PoloSceneState } from './model.ts'
import { activePoloImprovements } from './interventions.ts'

export const POLO_TODAY_TABS = [
  'general',
  'water',
  'electricity',
  'land',
] as const
export type PoloTodayTab = (typeof POLO_TODAY_TABS)[number]

export interface PoloStoryCard {
  metrics: { label: string; value: string; note?: string }[]
  copy?: string
  comparison?: { value: string; label: string }
  rain?: ReturnType<typeof poloRainStory>
  details: string[]
  detailsTitle?: string
  sources?: { label: string; url: string }[]
}

/** Today reads the existing scenario inputs; unknown park use stays unknown. */
export function poloTodayCard(
  state: PoloSceneState,
  tab: PoloTodayTab,
): PoloStoryCard {
  const { data } = poloSizedPhase(state, 'M0')
  if (tab === 'general')
    return {
      metrics: [
        { label: 'Selected site area', value: usAcres(state.areaHa * 10_000) },
        { label: 'Current use', value: 'Playing field' },
      ],
      detailsTitle: 'More info & data sources',
      details: [
        'The selected site covers part of Polo Fields, not the entire venue or a surveyed parcel. No construction has started.',
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
  if (tab === 'water' || tab === 'electricity')
    return resourceCard({ ...state, phase: 'M0' }, tab)
  return {
    metrics: [
      { label: 'Playing-field turf', value: usAcres(data.areasM2.turf) },
      {
        label: 'Built surfaces in the site area',
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

function resourceCard(
  state: PoloSceneState,
  topic: 'water' | 'electricity',
): PoloStoryCard {
  const story =
    topic === 'water' ? poloWaterStory(state) : poloElectricityStory(state)
  return {
    metrics: [{ label: story.label, value: story.value }],
    copy: story.copy,
    comparison: story.comparison,
    details: story.details,
    ...(topic === 'water' ? { rain: poloRainStory(state) } : {}),
  }
}

const GENERAL_COPY = {
  M1: 'The grass gives way to a work site, and foundations mark out the future building. Water and temporary power are needed before a single server starts.',
  M4: 'Steel and roofs rise from the foundations. Construction still needs temporary resources; the everyday demands of computing come later.',
  M5: 'The campus is complete, but its systems need filling, flushing and testing. These are one-time preparations before everyday operation.',
  M6: 'The campus now runs around the clock. Explore how computing changes water and electricity demand, then try the three ideas below.',
} as const
const GENERAL_STATUS = {
  M1: 'Foundations set',
  M4: 'Frame & roof',
  M5: 'Systems tested',
  M6: '24/7 computing',
} as const

/** The same inline topic cards follow all five chapters and the selected size. */
export function poloChapterCard(
  state: PoloSceneState,
  tab: PoloTodayTab,
): PoloStoryCard {
  const improvements = activePoloImprovements(state)
  if (improvements.length) {
    const originalState = { ...state, preview: false }
    delete originalState.improvements
    const original = poloChapterCard(originalState, tab)
    const copy = {
      general:
        'Your construction choices now shape this plan. The map shows the changes you kept; their resource and land impacts still need assessment.',
      water:
        'Your construction choices can change water use and how rain moves across the site. Water demand and drainage have not been recalculated for this changed plan.',
      electricity:
        'The plan now includes your construction changes. Their effects on site work and operating electricity have not been recalculated.',
      land: 'The map shows the green space, reinforcement or planted paths you chose to keep. Remaining turf and public access have not been reassessed, and these changes do not restore the original playing field.',
    }
    const labels = {
      general: 'Changed plan impacts',
      water: 'Water and drainage with your changes',
      electricity: 'Electricity with your changes',
      land: 'Land and public access with your changes',
    }
    return {
      metrics: [{ value: 'Not recalculated', label: labels[tab] }],
      copy: copy[tab],
      comparison: {
        value: 'Your choices are kept',
        label: 'The map reflects your changes; the original figures do not',
      },
      details: [
        ...improvements.map(
          (item) => item.title + ': ' + item.benefit + ' ' + item.tradeoff,
        ),
        'Original plan reference only. The snapshots below describe the original build at this selected size, not calculated outcomes or savings from your changes.',
        ...original.metrics.map(
          (metric) => metric.label + ': ' + metric.value + '.',
        ),
        ...(original.comparison
          ? [
              'Original comparison: ' +
                original.comparison.value +
                ' — ' +
                original.comparison.label +
                '.',
            ]
          : []),
        ...original.details,
        ...(original.rain
          ? [
              'Original rain snapshot: ' +
                (original.rain.value ?? 'Not quantified') +
                '. ' +
                original.rain.comparison,
              ...original.rain.details,
            ]
          : []),
      ],
      ...(original.sources ? { sources: original.sources } : {}),
    }
  }
  if (state.phase === 'M6' && state.preview && state.proposal) {
    const concepts = {
      heat_reuse_neighbors: {
        copy: state.recipientAvailable
          ? 'Server heat travels through a separate loop to a fictional pool. The recipient can use that heat, while backup cooling stays available.'
          : 'The fictional pool needs no heat right now, so delivery stops. Servers still compute and the campus still needs cooling.',
        impact: 'A second use for heat',
        detail:
          'A recipient and extra equipment are needed. Pumps and other equipment can require electricity; no saving is calculated.',
      },
      recycled_water: {
        copy: 'A possible recycled supply passes through treatment before reaching the coolers. The source changes, but cooling still needs make-up water.',
        impact: 'Different source',
        detail:
          'Water still evaporates and blowdown still needs management. Supply, quality and a real connection need checking; no saved volume is calculated.',
      },
      green_roof: {
        copy: 'Plants and growing layers give the roof a different surface. They can slow some rainwater, but they also need care and sometimes watering.',
        impact: 'A living roof',
        detail:
          'Roof planting does not restore the public playing field. No water, electricity or runoff saving is calculated.',
      },
    }
    const concept = concepts[state.proposal]
    return {
      metrics: [],
      copy:
        tab === 'land'
          ? 'The campus still occupies the same part of the public field. Exploring a benefit does not return that space to its original users.'
          : concept.copy,
      comparison: {
        value: concept.impact,
        label: 'Visual concept · savings not calculated',
      },
      details: [
        concept.detail,
        'Choose Original plan to see the operating reference figures. These concepts do not change or stack savings on that baseline.',
      ],
    }
  }
  if (state.phase === 'M0') return poloTodayCard(state, tab)
  if (tab === 'water' || tab === 'electricity') return resourceCard(state, tab)
  const phase = poloSizedPhase(state)
  if (tab === 'general')
    return {
      metrics: [
        { label: 'Selected demo area', value: usAcres(state.areaHa * 10_000) },
        { label: 'On site', value: GENERAL_STATUS[state.phase] },
      ],
      copy: GENERAL_COPY[state.phase],
      details: [
        'Fictional campus on a real field. These are educational snapshots, not a real construction programme.',
        ...phase.details,
      ],
    }
  const original = poloSizedPhase(state, 'M0').data.areasM2.turf
  const lost = original - phase.data.areasM2.turf
  return {
    metrics: [
      {
        label: 'Playing-field turf remaining',
        value: usAcres(phase.data.areasM2.turf),
      },
      { label: 'Original turf changed', value: usAcres(lost) },
    ],
    copy:
      state.phase === 'M1' || state.phase === 'M4'
        ? 'The work site takes space away from sport and everyday meetings. Keeping some turf does not mean the original playing field can still be used in the same way.'
        : 'Buildings, paving and new landscaping replace much of the original field. Landscaped space and planted roofs do not replace its public sports use.',
    comparison: {
      value: `${String(Math.round((lost / original) * 100))}%`,
      label: 'Of Today’s turf changed · same demo area',
    },
    details: [
      'Surface areas follow the selected teaching boundary, not the whole park. Turf disturbance is counted once across chapters.',
      'Surrounding trees and tracks are outside this intervention. Visitor numbers, sports capacity and public access have not been measured.',
      ...phase.details,
    ],
  }
}
