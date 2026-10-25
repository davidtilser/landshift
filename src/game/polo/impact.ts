import { poloSizedPhase } from './size.ts'
import { POLO_DEFAULT_AREA_HA } from './model.ts'
import type { PoloPhase, PoloSceneState } from './model.ts'
import { usAcres } from './us-units.ts'
import { activePoloImprovements } from './interventions.ts'
import { activePoloLearnings, activeCustomPoloLearnings } from './learnings.ts'
import { poloWaterStory, poloElectricityStory } from './resource-story.ts'

export type EnvironmentalLayer = 'water' | 'electricity' | 'land' | 'heat'
export const ENVIRONMENTAL_LAYERS: Record<EnvironmentalLayer, string> = {
  water: 'Water',
  electricity: 'Electricity',
  land: 'Land',
  heat: 'Heat',
}

/** Authored game index, not approval percentages, a poll or consent. */
const SUPPORT: Record<PoloPhase, number> = {
  M0: 16,
  M1: 12,
  M4: 8,
  M5: 10,
  M6: 12,
}
export function poloSupport(state: PoloSceneState): number {
  const base = SUPPORT[state.confirmed ? state.phase : 'M0']
  if (!state.confirmed || state.phase !== 'M6' || !state.preview) return base
  switch (state.proposal) {
    case 'heat_reuse_neighbors':
      return base + (state.recipientAvailable ? 6 : 0)
    case 'recycled_water':
      return base + 4
    case 'green_roof':
      return base + 3
    case null:
      return base
  }
}

export interface ImpactCard {
  title: string
  baseline: string
  current: string
  detail: string
  evidence: string
}

/** Compare the same phase and footprint. Unknown proposal savings stay unknown. */
export function poloImpact(state: PoloSceneState): ImpactCard[] {
  const learned = activePoloLearnings(state)
  const custom = activeCustomPoloLearnings(state)
  if (learned.length || custom.length)
    return [
      ...learned.map((item) => ({
        title: item.title,
        baseline: item.before,
        current: item.after,
        detail: item.tradeoff,
        evidence:
          'Same site, planned from the start. Benefits need assessment.',
      })),
      ...custom.map((item) => ({
        title: item.text,
        baseline: 'Original design',
        current: 'Proposed · not mapped',
        detail: 'Benefits, trade-offs and feasibility need assessment.',
        evidence: 'Your custom idea.',
      })),
      {
        title: 'Public playing space',
        baseline: 'Field lost',
        current: 'Field still lost',
        detail: 'A greener campus does not replace a shared playing field.',
        evidence: 'Community concerns remain.',
      },
      {
        title: 'Water and energy savings',
        baseline: 'Original resource estimates',
        current: 'Not quantified',
        detail:
          'Supply, demand, engineering and combined resource use need assessment.',
        evidence: 'No new savings have been calculated.',
      },
    ]
  const improvements = activePoloImprovements(state)
  if (improvements.length)
    return [
      {
        title: 'Your construction choices',
        baseline: 'Original plan',
        current: String(improvements.length) + ' applied changes',
        detail: improvements
          .map(
            (item) =>
              ({
                soil: 'Soil strip protected',
                foundation: 'Marked sections reinforced',
                grounds: 'Planted walking edge added',
              })[item.id],
          )
          .join(' · '),
        evidence: 'Design changes · benefits need assessment',
      },
      {
        title: 'Water, power and materials',
        baseline: 'Original-plan estimates',
        current: 'Not recalculated',
        detail:
          'The original inventory does not include your interventions. Extra concrete uses material; plants and paths need care.',
        evidence: 'Resource use and structural performance need assessment',
      },
      {
        title: 'Public space',
        baseline: 'A shared playing field',
        current: improvements.some((item) => item.id === 'grounds')
          ? 'A planted walking edge'
          : 'Field still lost',
        detail:
          'These changes do not replace the public playing field. Communities can recognize an improvement and still oppose this location.',
        evidence: 'Different perspectives · agreement still needed',
      },
    ]
  const phase = poloSizedPhase(state, state.confirmed ? state.phase : 'M0')
  const proposal =
    state.confirmed && state.phase === 'M6' && state.preview
      ? state.proposal
      : null
  const storyState = { ...state, phase: phase.id }
  const water = poloWaterStory(storyState).value
  const power = poloElectricityStory(storyState).value
  const noBuild = poloSizedPhase(state, 'M0').data.areasM2.turf
  const turfLost = noBuild - phase.data.areasM2.turf
  const support = poloSupport(state)
  const baselineSupport = poloSupport({
    ...state,
    proposal: null,
    preview: false,
  })
  const heatActive =
    proposal === 'heat_reuse_neighbors' && state.recipientAvailable
  return [
    {
      title: phase.id === 'M0' ? 'Irrigation allowance' : 'Water supply',
      baseline: water,
      current:
        proposal === 'recycled_water'
          ? 'Source changes'
          : proposal
            ? 'Not quantified'
            : water,
      detail:
        phase.id === 'M0'
          ? 'Irrigation allowance; actual supply and use are unknown.'
          : proposal === 'recycled_water'
            ? 'Cooling still needs water. Supply and quality need checking.'
            : 'Proposal savings have not been verified.',
      evidence:
        state.areaHa === POLO_DEFAULT_AREA_HA
          ? 'Derived model · same phase'
          : 'Area-proportional estimate · same phase',
    },
    {
      title: 'Electricity',
      baseline: power,
      current: proposal ? 'Not quantified' : power,
      detail:
        proposal === 'heat_reuse_neighbors'
          ? 'Heat pumps and circulation add an unquantified power demand.'
          : 'Whole-project energy savings are not established.',
      evidence:
        state.areaHa === POLO_DEFAULT_AREA_HA
          ? 'Derived model · same phase'
          : 'Area-proportional estimate · same phase',
    },
    {
      title: 'Public turf lost',
      baseline: usAcres(turfLost),
      current: usAcres(turfLost),
      detail: 'Compared with Today. Roof plants do not restore the field.',
      evidence:
        state.areaHa === POLO_DEFAULT_AREA_HA
          ? 'Planned land allocation'
          : 'Area-proportional land allocation',
    },
    {
      title: 'Heat delivery',
      baseline: 'No reuse link',
      current: heatActive ? 'Recipient linked' : 'No delivery',
      detail: heatActive
        ? 'A proposed pool connection could use heat. Backup heating remains.'
        : 'A recipient and built infrastructure are needed.',
      evidence: 'Proposed connection · savings not assessed',
    },
    {
      title: 'Community support',
      baseline: `${String(baselineSupport)} / 100`,
      current: `${String(support)} / 100`,
      detail: `${support >= baselineSupport ? '+' : ''}${String(support - baselineSupport)} index points. Loss of public space keeps opposition high.`,
      evidence: 'Plan response indicator · not a poll',
    },
  ]
}
