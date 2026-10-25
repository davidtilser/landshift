import { DEFAULT_CHOICES } from '../consequences.ts'
import type { DiscussionContext } from '../discussion.ts'
import { poloDisplayPhase } from './display.ts'
import { usAcres } from './us-units.ts'
import { POLO_DEFAULT_AREA_HA } from './model.ts'
import { POLO_PROPOSAL_NAMES } from './model.ts'
import type { PoloSceneState } from './model.ts'
import { poloImprovementSummary } from './interventions.ts'

const mechanisms = {
  heat_reuse_neighbors:
    'Proposed design option. Heat transfers from the existing internal cooling-water return through an exchanger into a separate supply-and-return circuit to one proposed neighborhood pool. A possible heat pump and circulation need electricity. Pool water, the delivery loop and data-center coolant stay separate. A schematic buried route requires construction. Original cooling and the pool’s separate heater remain available. No heat quantity, temperature, real recipient or savings is established.',
  recycled_water:
    'Proposed design option. A schematic recycled-water source, treatment/check point and dedicated delivery line supply cooling make-up, with quality checks and backup supply. The source and route are illustrative: no confirmed campus connection, available allocation, saved volume, cost or energy result exists.',
  green_roof:
    'Proposed design option. A planted roof includes vegetation, substrate and a drainage layer. It can temporarily hold some rain and still drains. Plants need maintenance and sometimes irrigation; roof structure and access need assessment. No retention, cooling, biodiversity or energy result is calculated. A roof garden does not restore the public sports field.',
} as const

export interface PoloDiscussionFacts {
  scene: PoloSceneState
  stage: string
  setting: string
  proposal: string | null
  mechanism: string
  baseline: { label: string; value: string; detail: string }[] | null
}

/** Shared by browser and server; baseline facts never use the older sandbox equations. */
export function poloDiscussionContext(
  state: PoloSceneState,
): DiscussionContext {
  const phase = poloDisplayPhase(state)
  const concept =
    state.confirmed && state.phase === 'M6' && state.preview
      ? state.proposal
      : null
  const improvements = poloImprovementSummary(state)
  return {
    choices: { ...DEFAULT_CHOICES },
    year: 0,
    weather: state.rain ? 'storm' : 'drought',
    site: {
      buildings: 0,
      trees: 0,
      water: 0,
      parks: 1,
      flood: 0,
      heritage: 0,
      heritageContext: false,
    },
    polo: {
      scene: { ...state, center: [...state.center] },
      stage: state.confirmed
        ? phase.title
        : 'Choose a location · unconfirmed preview',
      setting:
        `Polo Fields, Golden Gate Park: a fictional ${usAcres(state.areaHa * 10_000)} managed-turf subset, schematic placement, not a surveyed polygon or actual application. The scenario excludes surrounding trees and the running/cycling tracks. It is separate from Heroes’ Grove and involves no memorial replacement. Existing use of the public sports field matters.` +
        (state.areaHa === POLO_DEFAULT_AREA_HA
          ? ''
          : ' Quantities use an area-proportional teaching assumption relative to the frozen reference. Rain depth and work duration stay fixed. This is not a site capacity assessment.'),
      proposal: concept ? POLO_PROPOSAL_NAMES[concept] : null,
      mechanism:
        (!state.confirmed
          ? 'The player is positioning and rotating a ghost campus. No location is confirmed and nothing is built. Walking people still use the field; discuss what matters to them before confirming the plan.'
          : concept
            ? mechanisms[concept] +
              (concept === 'heat_reuse_neighbors' && !state.recipientAvailable
                ? ' The recipient is currently unavailable: delivery stops and original cooling rejects the heat; computing continues.'
                : '')
            : phase.summary + ' ' + phase.tradeoff) +
        (improvements
          ? ' Changes to the current plan: ' +
            improvements +
            ' Resource use is not recalculated. Foundation changes still require structural assessment. The public playing field remains lost.'
          : ''),
      baseline:
        !state.confirmed || concept || improvements
          ? null
          : phase.metrics.map((metric) => ({ ...metric })),
    },
  }
}
