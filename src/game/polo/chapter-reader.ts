import type { PoloPhase, PoloSceneState } from './model.ts'
import { activePoloImprovements } from './interventions.ts'
import { activePoloLearnings } from './learnings.ts'
import { poloPlanningText } from './planning-copy.ts'
import { poloChapterCard } from './today.ts'
import type { PoloTodayTab } from './today.ts'

export interface PoloChapterStep {
  kind: 'story' | 'number'
  title: string
  copy: string
  value?: string
  label?: string
}

const STORIES: Record<PoloPhase, Record<PoloTodayTab, string>> = {
  M0: {
    general:
      'This part of Polo Fields is a place to play and meet. Explore what is here before imagining a new campus.',
    water:
      'The grass needs water to stay usable. This gives us a reference for the future campus.',
    electricity:
      'The new campus uses no electricity yet. Existing park electricity use is unknown here.',
    land: 'People use this public field for sport and time together. The selected area is part of that shared space.',
  },
  M1: {
    general:
      'Grass gives way to a work site. Foundations mark the future building before the servers arrive.',
    water:
      'Construction needs water for dust control and concrete work. Everyday server cooling has not started.',
    electricity:
      'Tools and site facilities need temporary power. This allowance covers a workday, before servers run 24/7.',
    land: 'The work site takes space away from play and everyday meetings. Remaining grass may no longer work as a playing field.',
  },
  M4: {
    general:
      'Steel and roofs rise from the foundations. Everyday computing comes later.',
    water:
      'Water is still needed as the building rises. It comes from the same budget introduced in Foundations.',
    electricity:
      'Tools still need temporary power as the frame rises. The workday allowance stays the same.',
    land: 'The frame now stands where people played. The work site still occupies the same part of the field.',
  },
  M5: {
    general:
      'The campus is built, but computing has not started. Its systems need filling, flushing and testing.',
    water:
      'Water fills and flushes the new systems. This happens before everyday cooling begins.',
    electricity:
      'Larger equipment runs during testing. A test day needs more electricity than a construction workday.',
    land: 'Paving and landscaping complete the campus. Planted areas do not replace the public playing field.',
  },
  M6: {
    general:
      'The campus now runs day and night. Explore its demands, then use what you learned to rethink the plan.',
    water:
      'Servers produce heat around the clock. In this design, cooling needs a regular water supply.',
    electricity:
      'Servers now run day and night. Cooling and other support systems need electricity too.',
    land: 'The campus is now operating on the former field. The public sports space has not returned.',
  },
}

/** Every chapter explains one idea, then presents one quantity or status at a time. */
export function poloChapterSteps(
  state: PoloSceneState,
  tab: PoloTodayTab,
): PoloChapterStep[] {
  if (!state.confirmed) return []
  const card = poloChapterCard(state, tab)
  const revised = activePoloLearnings(state).length > 0
  const hasChanges = activePoloImprovements(state).length > 0
  const concept =
    state.phase === 'M6' && state.preview && state.proposal !== null
  const story: PoloChapterStep = {
    kind: 'story',
    title: 'The story',
    copy: poloPlanningText(
      revised
        ? 'Your selected ideas change the design on the map. Their effects need assessment, and the public playing field is still lost.'
        : hasChanges || concept
          ? (card.copy ?? '')
          : STORIES[state.phase][tab],
    ),
  }
  const figure = (
    index: number,
    title: string,
    copy: string,
    label?: string,
  ): PoloChapterStep => {
    const metric = card.metrics[index]
    if (!metric) throw new Error('Missing chapter reference figure')
    return {
      kind: 'number',
      title,
      copy,
      value: metric.value,
      label: poloPlanningText(label ?? metric.label),
    }
  }
  const comparison = (title: string, copy: string): PoloChapterStep => {
    if (!card.comparison) throw new Error('Missing chapter comparison')
    return {
      kind: 'number',
      title,
      copy,
      value: card.comparison.value,
      label: card.comparison.label,
    }
  }
  if (hasChanges || revised || concept)
    return [
      story,
      {
        kind: 'number',
        title: 'Your changed plan',
        value: 'Not recalculated',
        label: 'Impacts of your design choices',
        copy: 'Your choices are kept on the map. Their effects need assessment; original plan figures remain available in More info.',
      },
    ]
  const phase = state.phase
  switch (tab) {
    case 'general': {
      const status: Record<PoloPhase, string> = {
        M0: 'The field is still here for its existing uses. No campus has been built inside the selected boundary.',
        M1: 'The foundation outline marks the future building. The frame and roof come in Structure; everyday computing comes later.',
        M4: 'The frame and roof are in place. Walls, finished grounds and system tests come in Commissioning.',
        M5: 'Systems are being checked before opening. This snapshot is preparation for operation, not everyday computing.',
        M6: 'Computing continues through the day and night. Water and electricity now support ongoing operation.',
      }
      return [
        story,
        figure(
          0,
          'One part of Polo Fields',
          'This is the selected site area, not the entire venue. Every chapter follows this same boundary.',
        ),
        figure(1, 'What is here now', status[phase]),
      ]
    }
    case 'water': {
      const meaning: Record<PoloPhase, string> = {
        M0: 'A modelled year of irrigation for the selected field area. Actual park supply is unknown; this is the reference used in Operating.',
        M1: 'This selected allowance covers site water before opening, including commissioning. It is not water already used at Foundations or a daily cooling demand.',
        M4: 'This is the same shared site-water budget shown in Foundations, including commissioning. Showing it again does not add another allowance.',
        M5: 'One-time water for filling and flushing systems. It is already included in the pre-opening site-water budget, so it is not added again.',
        M6: 'A modelled year of supplied water for cooling, domestic use and irrigation across the campus. Supplied water is not all evaporated.',
      }
      const steps = [
        story,
        figure(0, 'Water and its time basis', meaning[phase]),
      ]
      if (phase === 'M6')
        steps.push(
          comparison(
            'Compared with today’s irrigation',
            'The campus annual supply is compared with a modelled year of irrigation on the same area. Cooling makes demand larger even though less grass needs watering.',
          ),
        )
      return steps
    }
    case 'electricity': {
      const meaning: Record<PoloPhase, string> = {
        M0: 'Zero describes electricity added by the new campus before construction. It does not mean the park uses no electricity; existing use is unknown.',
        M1: 'This is the temporary-power allowance for one selected construction workday. It is not the full construction total or a 24-hour server load.',
        M4: 'The same selected workday allowance as Foundations. Reading it in another chapter does not add a second construction electricity budget.',
        M5: 'Energy for one selected day of electrical and cooling-system tests. The test day covers four hours; it is not a normal operating day.',
        M6: 'An average day of electricity for the whole facility, including servers, cooling and other support systems. Cooling is already included.',
      }
      const steps = [
        story,
        figure(0, 'Electricity and its time basis', meaning[phase]),
      ]
      if (phase === 'M1' || phase === 'M4')
        steps.push({
          kind: 'number',
          title: 'A workday, not round-the-clock computing',
          value: '8 hours',
          label: 'Temporary-power workday',
          copy: 'The workday length stays the same when you change site size. The temporary-power allowance scales with area; total construction duration is not assessed for Foundations alone.',
        })
      else if (phase === 'M5' || phase === 'M6')
        steps.push(
          comparison(
            'Compared with a construction workday',
            phase === 'M5'
              ? 'A selected four-hour test day uses this multiple of the eight-hour construction workday. Larger equipment is being tested before servers operate normally.'
              : 'A full operating day uses this multiple of the eight-hour construction workday. These are different model days, not a measured increase from park use.',
          ),
        )
      return steps
    }
    case 'land':
      if (phase === 'M0')
        return [
          story,
          figure(
            0,
            'Turf inside the selected boundary',
            'This is the modelled playing-field turf inside the selected site, not the area of the whole park.',
          ),
          figure(
            1,
            'Before the campus is built',
            'The campus has added no buildings or paving inside this modelled boundary. Existing facilities and tracks elsewhere in the park are outside this figure.',
          ),
        ]
      return [
        story,
        figure(
          1,
          'Turf changed by the campus',
          'This ground has changed from playing-field turf. It measures land changed, not the number of people who lose access.',
          card.comparison
            ? card.comparison.value + ' of Today’s turf · same site area'
            : undefined,
        ),
        figure(
          0,
          'Some grass remains',
          'This turf remains inside the selected site boundary. Remaining grass does not mean the original playing field can still be used in the same way.',
        ),
      ]
  }
}
