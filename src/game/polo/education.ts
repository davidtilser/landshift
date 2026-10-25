import { poloSizedReference } from './size.ts'
import { poloDisplayPhase } from './display.ts'
import { usAcres, usGallons, usInches, usNumber } from './us-units.ts'
import { POLO_DEFAULT_AREA_HA } from './model.ts'
import type { PoloPhase, PoloSceneState } from './model.ts'
import { splitPoloCopy } from './copy-steps.ts'
import { activePoloImprovements } from './interventions.ts'

export const POLO_TOPICS = ['water', 'electricity', 'land'] as const
export type PoloTopic = (typeof POLO_TOPICS)[number]
export type PoloEvidenceKind =
  | 'How it works'
  | 'Teaching assumption'
  | 'Derived estimate'
  | 'Evidence gap'
  | 'Visual concept'

export interface PoloEducationStep {
  title: string
  text: string
  kind: PoloEvidenceKind
  value?: string
}
export interface PoloEducation {
  title: string
  steps: PoloEducationStep[]
}
const TOPIC_NAMES: Record<PoloTopic, string> = {
  water: 'Water',
  electricity: 'Electricity',
  land: 'Land & people',
}
const PHASE_NAMES: Record<PoloPhase, string> = {
  M0: 'Today',
  M1: 'Foundations',
  M4: 'Structure',
  M5: 'Commissioning',
  M6: 'Operating',
}
const format = usNumber
const step = (
  title: string,
  text: string,
  kind: PoloEvidenceKind = 'How it works',
  value?: string,
): PoloEducationStep => ({
  title,
  text,
  kind,
  ...(value === undefined ? {} : { value }),
})

/** Educational copy reads the frozen scenario; it never changes the model. */
export function poloEducation(
  state: PoloSceneState,
  topic: PoloTopic,
): PoloEducation {
  const phase = poloDisplayPhase(state)
  const data = phase.data
  const reference = poloSizedReference(state)
  const steps: PoloEducationStep[] = []
  if (activePoloImprovements(state).length)
    steps.push(
      step(
        'Original-plan reference',
        'Figures here describe the original plan. Your construction changes have not been recalculated.',
        'Evidence gap',
      ),
    )
  if (state.areaHa !== POLO_DEFAULT_AREA_HA)
    steps.push(
      step(
        'A size-based estimate',
        'Volumes and energy scale with area. Rain depth and workdays stay fixed.',
        'Teaching assumption',
      ),
    )
  const workDuration =
    data.workdays === null
      ? 'Selected work duration is not established.'
      : `Over ${format(data.workdays)} selected workdays.`
  if (topic === 'water') {
    if (state.phase === 'M0') {
      const irrigation = phase.metrics.find(
        (metric) => metric.label === 'Model irrigation',
      )
      steps.push(
        step('Grass needs care', 'Water helps the playing field stay usable.'),
        step(
          'A planning allowance',
          'Selected model irrigation; actual demand is not metered here.',
          'Teaching assumption',
          irrigation?.value,
        ),
        step(
          'Check the real supply',
          'Actual irrigation demand and water sources are not established.',
          'Evidence gap',
        ),
      )
    } else if (state.phase === 'M1') {
      steps.push(
        step(
          'Water at work',
          'Water can control dust and support concrete work.',
        ),
        step(
          'Foundation-only demand',
          'Water, fuel and runoff are not separately assessed here.',
          'Evidence gap',
        ),
        step(
          'Count the stage once',
          'The later structure budget includes foundations and structure.',
          'Teaching assumption',
        ),
      )
    } else if (state.phase === 'M4') {
      steps.push(
        step(
          'Water at work',
          'Dust control and work on site need a water supply.',
        ),
        step(
          'Selected on-site allowance',
          'Across foundations and structure together.',
          'Teaching assumption',
          data.stageWaterSuppliedM3 === null
            ? undefined
            : usGallons(data.stageWaterSuppliedM3),
        ),
        step(
          'Concrete water is separate',
          'Water mixed into concrete off site.',
          'Teaching assumption',
          data.offsiteConcreteWaterM3 === null
            ? undefined
            : usGallons(data.offsiteConcreteWaterM3),
        ),
        step(
          'One shared work budget',
          'Selected work duration. This is not a full inventory.',
          'Teaching assumption',
          data.workdays === null
            ? undefined
            : `${format(data.workdays)} workdays`,
        ),
      )
    } else if (state.phase === 'M5') {
      steps.push(
        step(
          'Ready for rain',
          'An empty roof tank captures part of one storm.',
        ),
        step(
          'A single event',
          `Captured from one ${usInches(data.rainfallMm)} rain event.`,
          'Derived estimate',
          data.rainCapturedM3 === null
            ? undefined
            : usGallons(data.rainCapturedM3),
        ),
        step(
          'Water still moves onward',
          'Water needing managed drainage during this event.',
          'Derived estimate',
          data.rainManagedDrainageM3 === null
            ? undefined
            : usGallons(data.rainManagedDrainageM3),
        ),
        step(
          'A limit to remember',
          'This is an event volume, not a flood or annual-supply forecast.',
          'Evidence gap',
        ),
      )
    } else {
      steps.push(
        step(
          'Cooling needs make-up water',
          'Some water evaporates. Some becomes managed wastewater.',
        ),
        step(
          'Average cooling supply',
          'Domestic water and irrigation are separate.',
          'Teaching assumption',
          `${usGallons(reference.coolingMakeupM3Day)}/day`,
        ),
        step(
          'Capacity needs checking',
          'Hot-day demand and spare shared-system capacity are unknown.',
          'Evidence gap',
        ),
      )
    }
    if (state.phase !== 'M1' && state.phase !== 'M5') {
      steps.push(
        step(
          'Compare the same storm',
          'The same rainfall depth in each modelled event.',
          'Teaching assumption',
          usInches(data.rainfallMm),
        ),
        step(
          'Rain leaving the surface',
          data.rainRunoffM3 === null
            ? 'Runoff is not quantified for this chapter.'
            : 'Modelled runoff volume during this event.',
          data.rainRunoffM3 === null ? 'Evidence gap' : 'Derived estimate',
          data.rainRunoffM3 === null ? undefined : usGallons(data.rainRunoffM3),
        ),
      )
    }
  } else if (topic === 'electricity') {
    if (state.phase === 'M0') {
      steps.push(
        step(
          'The field already has needs',
          'Park operations use equipment and shared services.',
        ),
        step(
          'No measured baseline',
          'Existing park electricity use is not established.',
          'Evidence gap',
        ),
        step(
          'Unknown does not mean zero',
          'A real comparison needs local meters and operating records.',
          'Evidence gap',
        ),
      )
    } else if (state.phase === 'M1') {
      steps.push(
        step(
          'Energy before computing',
          'Machines and temporary services support the work.',
        ),
        step(
          'Foundation-only energy',
          'A separate fuel or electricity budget is not established.',
          'Evidence gap',
        ),
        step(
          'Avoid counting twice',
          'The structure-stage allowance includes foundation work.',
          'Teaching assumption',
        ),
      )
    } else if (state.phase === 'M4') {
      steps.push(
        step(
          'Power during construction',
          'Temporary electricity and diesel do different jobs.',
        ),
        step(
          'Selected temporary power',
          workDuration,
          'Teaching assumption',
          data.selectedElectricityKWh === null
            ? undefined
            : `${format(data.selectedElectricityKWh / 1000)} MWh`,
        ),
        step(
          'Selected equipment fuel',
          'Diesel across the same selected work stage.',
          'Teaching assumption',
          data.selectedDieselL === null
            ? undefined
            : usGallons(data.selectedDieselL / 1000),
        ),
        step(
          'Keep the boundary clear',
          'These allowances cover foundations and structure together.',
          'Teaching assumption',
        ),
      )
    } else if (state.phase === 'M5') {
      steps.push(
        step(
          'Test before opening',
          'Systems use electricity during commissioning.',
        ),
        step(
          'Selected test allowance',
          workDuration,
          'Teaching assumption',
          data.selectedElectricityKWh === null
            ? undefined
            : `${format(data.selectedElectricityKWh / 1000)} MWh`,
        ),
        step(
          'Not everyday operation',
          'Computing and everyday cooling have not started.',
          'How it works',
        ),
        step(
          'Generator testing',
          'Fuel used in generator tests is not established.',
          'Evidence gap',
        ),
      )
    } else {
      steps.push(
        step(
          'Computing is only part',
          'Cooling and other supporting systems also need power.',
        ),
        step(
          'Selected average demand',
          `Average facility demand; ${format(reference.averageItMW)} MW is for IT.`,
          'Teaching assumption',
          `${format(reference.averageFacilityMW)} MW`,
        ),
        step(
          'A full operating year',
          'Facility electricity in 365 days at the selected average.',
          'Derived estimate',
          `${format(reference.facilityElectricityGWhYear)} GWh/year`,
        ),
        step(
          'Supporting systems',
          'Supporting systems include more than cooling alone.',
          'Derived estimate',
          `${format(reference.supportingElectricityGWhYear)} GWh/year`,
        ),
        step(
          'Check the connection',
          'Peak load and grid headroom are not established.',
          'Evidence gap',
        ),
      )
    }
  } else {
    const hardArea = data.areasM2.roof + data.areasM2.other_impervious
    steps.push(
      step(
        'One place, many users',
        'Playing fields support sport, meetings and shared time.',
      ),
      step(
        'The same site boundary',
        'The proposed site within Polo Fields.',
        'Teaching assumption',
        usAcres(reference.siteAreaM2),
      ),
      step(
        'Playing-field turf',
        'Turf remaining in the current model snapshot.',
        'Teaching assumption',
        usAcres(data.areasM2.turf),
      ),
    )
    if (hardArea > 0)
      steps.push(
        step(
          'Roof and hard surfaces',
          'Roof and paving within the same site boundary.',
          'Teaching assumption',
          usAcres(hardArea),
        ),
      )
    if (data.areasM2.bare_graded > 0)
      steps.push(
        step(
          'Ground being worked',
          'Prepared ground in the current model snapshot.',
          'Teaching assumption',
          usAcres(data.areasM2.bare_graded),
        ),
      )
    if (data.areasM2.landscape > 0)
      steps.push(
        step(
          'Landscaped space',
          'Landscaping does not replace the original public field.',
          'Teaching assumption',
          usAcres(data.areasM2.landscape),
        ),
      )
    steps.push(
      step(
        'Keep the boundary honest',
        'Surrounding trees and tracks are outside this intervention.',
        'Teaching assumption',
      ),
    )
  }
  if (state.phase === 'M6' && state.preview && state.proposal) {
    if (state.proposal === 'recycled_water' && topic === 'water')
      steps.push(
        step(
          'A possible different source',
          'Treatment could prepare recycled water for cooling.',
          'Visual concept',
        ),
        step(
          'Demand still exists',
          'Water still evaporates. Quality, supply and backup need checks.',
          'Visual concept',
        ),
      )
    else if (state.proposal === 'heat_reuse_neighbors' && topic !== 'land')
      steps.push(
        step(
          'Follow the heat',
          state.recipientAvailable
            ? 'A proposed neighborhood pool can receive heat through a loop.'
            : 'The proposed pool needs no heat. Backup cooling still matters.',
          'Visual concept',
        ),
        step(
          'Equipment has needs too',
          'Heat reuse needs equipment and extra electricity.',
          'Visual concept',
        ),
      )
    else if (state.proposal === 'green_roof' && topic !== 'electricity')
      steps.push(
        step(
          'Living roof layers',
          'Plants and growing medium can hold some rain.',
          'Visual concept',
        ),
        step(
          'Care and space',
          'Plants need care and sometimes water. The field is still lost.',
          'Visual concept',
        ),
      )
    steps.push(
      step(
        'Explore a mechanism',
        'This proposal has no calculated savings or capacity claim.',
        'Visual concept',
      ),
    )
  }
  // Full sentences remain available even when they need another reading step.
  return {
    title: `${TOPIC_NAMES[topic]} · ${PHASE_NAMES[state.phase]}`,
    steps: steps.flatMap((item) =>
      splitPoloCopy(item.text).map((text) => ({ ...item, text })),
    ),
  }
}
