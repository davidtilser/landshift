import { describe, expect, it } from 'vitest'
import { INITIAL_POLO_STATE, POLO_PHASES, POLO_PROPOSALS } from './model.ts'
import type { PoloSceneState } from './model.ts'
import { poloDisplayPhase } from './display.ts'
import { poloSizedPhase } from './size.ts'
import { poloPlanningText } from './planning-copy.ts'
import { POLO_INTERVENTIONS } from './interventions.ts'
import { poloReactions } from './reactions.ts'
import { poloImpact } from './impact.ts'
import { poloEducation, POLO_TOPICS } from './education.ts'
import { poloDialogueReply } from './dialogue.ts'
import { poloDiscussionContext } from './context.ts'
import { CommunitySession } from '../community-session.ts'
import { communityProfiles } from '../community-profiles.ts'
import { DEFAULT_CHOICES } from '../consequences.ts'

describe('immersive planning language', () => {
  it('keeps development framing out of player-facing phases, interventions, opinions and replies', () => {
    const states: PoloSceneState[] = POLO_PHASES.map((phase) => ({
      ...INITIAL_POLO_STATE,
      confirmed: true,
      phase,
    }))
    for (const proposal of POLO_PROPOSALS)
      states.push({
        ...INITIAL_POLO_STATE,
        confirmed: true,
        phase: 'M6',
        proposal,
      })
    states.push({
      ...INITIAL_POLO_STATE,
      confirmed: true,
      phase: 'M5',
      improvements: { soil: true, foundation: true, grounds: true },
    })
    const session = new CommunitySession()
    const copy: string[] = POLO_INTERVENTIONS.flatMap((item) => [
      item.title,
      item.problem,
      item.instruction,
      item.benefit,
      item.tradeoff,
      item.reaction,
    ])
    for (const state of states) {
      const phase = poloDisplayPhase(state)
      copy.push(
        phase.summary,
        phase.tradeoff,
        ...phase.details,
        ...phase.metrics.flatMap((metric) => [metric.label, metric.detail]),
      )
      copy.push(
        ...Object.values(poloReactions(state).voices).map(
          (voice) => voice.text,
        ),
      )
      copy.push(
        ...poloImpact(state).flatMap((card) => [
          card.title,
          card.baseline,
          card.current,
          card.detail,
          card.evidence,
        ]),
      )
      for (const topic of POLO_TOPICS)
        copy.push(
          ...poloEducation(state, topic).steps.flatMap((step) => [
            step.title,
            poloPlanningText(step.text),
          ]),
        )
      const facts = poloDiscussionContext(state).polo
      if (!facts) throw new Error('Missing planning facts')
      session.sync(
        {
          scenarioId: 'golden-gate-polo',
          center: state.center,
          bearing: state.bearing,
          choices: { ...DEFAULT_CHOICES },
          year: 0,
          weather: 'drought',
          polo: state,
        },
        communityProfiles(poloDiscussionContext(state)),
      )
      for (const voice of [
        'neighbor',
        'nature',
        'student',
        'operator',
      ] as const)
        for (const question of [
          'What matters most to you?',
          'Who benefits from this idea?',
          'Where does the water go?',
          'What needs electricity?',
          'Could we use this heat?',
        ])
          copy.push(poloDialogueReply(voice, question, facts).text)
    }
    copy.push(...session.publicThread.lines.map((line) => line.text))
    for (const text of copy)
      expect(text).not.toMatch(
        /\bdemo\b|\bscripted\b|\bfictional\b|\bauthored\b|teaching model|visual model|model pool/i,
      )
  })
  it('changes legacy presentation labels without changing research quantities or units', () => {
    const state: PoloSceneState = {
      ...INITIAL_POLO_STATE,
      confirmed: true,
      phase: 'M0',
    }
    const displayed = poloDisplayPhase(state)
    expect(displayed.metrics[0]?.label).toBe('Site area')
    expect(displayed.data).toEqual(poloSizedPhase(state).data)
    expect(poloPlanningText('Water: 300 m³/day; not metered.')).toBe(
      'Water: 300 m³/day; not metered.',
    )
    expect(
      POLO_INTERVENTIONS.find((item) => item.id === 'foundation')?.tradeoff,
    ).toContain('inspection')
  })
})
