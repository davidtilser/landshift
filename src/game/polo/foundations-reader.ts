import type { PoloSceneState } from './model.ts'
import { activePoloImprovements } from './interventions.ts'
import { poloPlanningText } from './planning-copy.ts'
import { poloChapterCard } from './today.ts'
import type { PoloTodayTab } from './today.ts'

export interface FoundationsStep {
  kind: 'story' | 'number'
  title: string
  copy: string
  value?: string
  label?: string
}

/** Split the Foundations card into one explanation or figure at a time. */
export function poloFoundationsSteps(
  state: PoloSceneState,
  tab: PoloTodayTab,
): FoundationsStep[] {
  if (state.phase !== 'M1') return []
  const card = poloChapterCard(state, tab)
  const titles = {
    general: 'From field to work site',
    water: 'Water before the servers',
    electricity: 'Power for the work site',
    land: 'Less space to play',
  }
  const stories = {
    general:
      'Grass gives way to a work site. Foundations mark the future building before the servers arrive.',
    water:
      'Construction needs water for dust control and concrete work. Everyday server cooling has not started.',
    electricity:
      'Tools and site facilities need temporary power. This allowance covers a workday, before servers run 24/7.',
    land: 'The work site takes space away from play and everyday meetings. Remaining grass may no longer work as a playing field.',
  }
  const hasChanges = activePoloImprovements(state).length > 0
  const story: FoundationsStep = {
    kind: 'story',
    title: titles[tab],
    copy: poloPlanningText(hasChanges ? (card.copy ?? '') : stories[tab]),
  }
  const figure = (
    index: number,
    title: string,
    copy: string,
    label?: string,
  ): FoundationsStep => {
    const metric = card.metrics[index]
    if (!metric) throw new Error('Missing Foundations reference figure')
    return {
      kind: 'number',
      title,
      copy,
      value: metric.value,
      label: poloPlanningText(label ?? metric.label),
    }
  }
  if (hasChanges)
    return [
      story,
      figure(
        0,
        'Your changed plan',
        'Your choices are kept on the map. Their effects need assessment; original plan figures remain available in More info.',
      ),
    ]
  switch (tab) {
    case 'general':
      return [
        story,
        figure(
          0,
          'One part of Polo Fields',
          'This is the selected site area, not the entire venue. The changes in this chapter take place inside that same boundary.',
        ),
        figure(
          1,
          'The building starts here',
          'The foundation outline marks the future building. The frame and roof come in Structure; everyday computing comes later.',
        ),
      ]
    case 'water':
      return [
        story,
        figure(
          0,
          'One shared project water budget',
          'This selected allowance covers site water before opening, including commissioning. It is not water already used at Foundations or a daily cooling demand.',
        ),
      ]
    case 'electricity':
      return [
        story,
        figure(
          0,
          'Electricity for one workday',
          'This is the temporary-power allowance for one selected construction workday. It is not the full construction total or a 24-hour server load.',
        ),
        {
          kind: 'number',
          title: 'A workday, not round-the-clock computing',
          value: '8 hours',
          label: 'Temporary-power workday',
          copy: 'The workday length stays the same when you change site size. The temporary-power allowance scales with area; total construction duration is not assessed for Foundations alone.',
        },
      ]
    case 'land':
      return [
        story,
        figure(
          1,
          'Turf changed by the work site',
          'This ground changes from playing-field turf into part of the work site. It measures land changed, not the number of people who lose access.',
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
