import { describe, expect, it } from 'vitest'
import { communityResponseSchema } from '../../shared/community-contract.ts'
import type {
  CommunityId,
  ConversationLine,
} from '../../shared/community-contract.ts'
import { authoredPrivateCommunityReply } from '../community-replies.ts'
import { splitUiText } from '../ui-text.ts'
import { dialogueChoices } from '../dialogue-choices.ts'
import { INITIAL_POLO_STATE, POLO_PHASES, POLO_PROPOSALS } from './model.ts'
import type { PoloSceneState } from './model.ts'
import { poloDiscussionContext } from './context.ts'
import type { PoloDiscussionFacts } from './context.ts'
import { poloDialogueReply, poloDialogueTopic } from './dialogue.ts'

const voices: CommunityId[] = ['neighbor', 'nature', 'student', 'operator']
const operating: PoloSceneState = {
  ...INITIAL_POLO_STATE,
  confirmed: true,
  phase: 'M6',
  proposal: 'heat_reuse_neighbors',
  preview: true,
}
function facts(state: PoloSceneState = operating): PoloDiscussionFacts {
  const result = poloDiscussionContext(state).polo
  if (!result) throw new Error('Missing Polo context')
  return result
}

describe('authored Polo private conversation', () => {
  it('answers who benefits directly, including an unavailable heat recipient', () => {
    const before = structuredClone(operating)
    for (const voice of voices) {
      const active = poloDialogueReply(
        voice,
        'Who benefits from this idea?',
        facts(),
      )
      expect(active.text).toMatch(/computing users/iu)
      expect(active.text).toContain('proposed pool')
      expect(active.text).toContain('Actual savings are unknown')
      const inactive = poloDialogueReply(
        voice,
        'Who benefits from this idea?',
        facts({ ...operating, recipientAvailable: false }),
      )
      expect(inactive.text).toContain('receives no heat now')
      expect(inactive.text).not.toBe(active.text)
    }
    expect(operating).toEqual(before)
  })

  it('keeps the baseline distinct from every active proposal', () => {
    const base = facts({ ...operating, preview: false })
    const original = poloDialogueReply(
      'neighbor',
      'Who benefits from this idea?',
      base,
    ).text
    expect(original).not.toContain('proposed pool could receive')
    expect(original).toContain('No local benefit is guaranteed')
    for (const proposal of POLO_PROPOSALS) {
      const result = poloDialogueReply(
        'neighbor',
        'Who benefits from this idea?',
        facts({ ...operating, proposal }),
      ).text
      expect(result).not.toBe(original)
      expect(result).not.toMatch(/guaranteed savings|approved project/iu)
    }
  })

  it('changes related followups and never repeats a question already asked', () => {
    const context = poloDiscussionContext(operating)
    for (const voice of voices) {
      const history: ConversationLine[] = []
      const initial = dialogueChoices(voice, undefined, context, history)
      expect(initial).toHaveLength(3)
      const benefits = 'Who benefits from this idea?'
      history.push({ speaker: 'planner', text: benefits })
      const followups = dialogueChoices(voice, 'benefit', context, history)
      expect(followups.map((choice) => choice.label)).not.toEqual(
        initial.map((choice) => choice.label),
      )
      expect(followups[0]?.label).toBe('What if nobody needs the heat?')
      expect(followups.some((choice) => choice.label === benefits)).toBe(false)
      const asked = new Set([benefits])
      for (let turn = 0; turn < 20; turn++) {
        const choices = dialogueChoices(voice, undefined, context, history)
        for (const choice of choices)
          expect(asked.has(choice.label)).toBe(false)
        const next = choices[0]
        if (!next) break
        asked.add(next.label)
        history.push({ speaker: 'planner', text: next.label })
      }
      expect(asked.size).toBe(16)
      expect(dialogueChoices(voice, undefined, context, history)).toEqual([])
    }
  })

  it('retains followups after custom text and recognizes a short continuation', () => {
    const context = poloDiscussionContext(operating)
    const history: ConversationLine[] = [
      { speaker: 'planner', text: 'Who would gain from this?' },
    ]
    expect(poloDialogueTopic(history[0]?.text ?? '')).toBe('benefit')
    const choices = dialogueChoices('student', undefined, context, history)
    expect(choices).toHaveLength(3)
    expect(
      choices.some((choice) => choice.label === 'Who benefits from this idea?'),
    ).toBe(false)
    expect(poloDialogueTopic('Tell me more', history)).toBe('benefit')
    const more = poloDialogueReply(
      'student',
      'Tell me more',
      facts(),
      history,
    ).text
    expect(more).toContain('Heat only benefits a recipient')
    expect(more).not.toBe(
      poloDialogueReply('student', history[0]?.text ?? '', facts()).text,
    )
  })

  it('answers each chapter without treating inactive cooling as zero park demand', () => {
    const today = poloDialogueReply(
      'operator',
      'Where does the water go?',
      facts(INITIAL_POLO_STATE),
    ).text
    expect(today).toContain('already needs irrigation')
    expect(today).toContain('supply source is not established')
    expect(
      poloDialogueReply(
        'operator',
        'What needs electricity?',
        facts(INITIAL_POLO_STATE),
      ).text,
    ).toContain('not mean the park uses no power')
    const replies = POLO_PHASES.map(
      (phase) =>
        poloDialogueReply(
          'neighbor',
          'What changes during construction?',
          facts({ ...operating, phase, proposal: null }),
        ).text,
    )
    expect(new Set(replies).size).toBe(POLO_PHASES.length)
  })

  it('keeps every authored answer contract-valid and all displayed pages short', () => {
    for (const phase of POLO_PHASES) {
      for (const proposal of [null, ...POLO_PROPOSALS]) {
        const state = { ...operating, phase, proposal }
        const context = poloDiscussionContext(state)
        for (const voice of voices) {
          const history: ConversationLine[] = []
          for (let turn = 0; turn < 16; turn++) {
            const choice = dialogueChoices(
              voice,
              undefined,
              context,
              history,
            )[0]
            if (!choice) break
            expect(choice.label.length).toBeLessThanOrEqual(70)
            expect(choice.hint.length).toBeLessThanOrEqual(70)
            const response = authoredPrivateCommunityReply(
              { target: voice, message: choice.label, history },
              context,
            )
            expect(
              communityResponseSchema.safeParse(response).success,
              phase + '/' + voice + '/' + choice.label,
            ).toBe(true)
            const text = response?.messages[0]?.text ?? ''
            const pages = splitUiText(text)
            expect(pages.join('')).toBe(text)
            expect(pages.every((page) => Array.from(page).length <= 70)).toBe(
              true,
            )
            history.push({ speaker: 'planner', text: choice.label })
            const more = authoredPrivateCommunityReply(
              { target: voice, message: 'Tell me more', history },
              context,
            )
            expect(communityResponseSchema.safeParse(more).success).toBe(true)
          }
        }
      }
    }
  })

  it('opens every known answer with a complete direct reading page', () => {
    const states: PoloSceneState[] = [INITIAL_POLO_STATE]
    for (const phase of POLO_PHASES) {
      for (const proposal of phase === 'M6'
        ? [null, ...POLO_PROPOSALS]
        : [null]) {
        for (const preview of [true, false]) {
          for (const recipientAvailable of [true, false])
            states.push({
              ...operating,
              phase,
              proposal,
              preview,
              recipientAvailable,
            })
        }
      }
    }
    for (const state of states) {
      const context = poloDiscussionContext(state)
      for (const voice of voices) {
        const history: ConversationLine[] = []
        for (let turn = 0; turn < 16; turn++) {
          const question = dialogueChoices(
            voice,
            undefined,
            context,
            history,
          )[0]?.label
          if (!question) break
          const label = `${state.phase}/${state.proposal ?? 'original'}/${voice}/${question}`
          const answer = poloDialogueReply(
            voice,
            question,
            facts(state),
            history,
          ).text
          expect(splitUiText(answer)[0]?.trimEnd(), label).toMatch(/[.!?]$/u)
          history.push({ speaker: 'planner', text: question })
          const continuation = poloDialogueReply(
            voice,
            'Tell me more',
            facts(state),
            history,
          ).text
          expect(
            splitUiText(continuation)[0]?.trimEnd(),
            label + '/more',
          ).toMatch(/[.!?]$/u)
        }
      }
    }
  })

  it('admits unsupported free text instead of pretending to answer', () => {
    const result = poloDialogueReply(
      'neighbor',
      'Translate an unrelated poem',
      facts(),
    )
    expect(result.topic).toBe('other')
    expect(result.text).toContain('don’t know enough to answer')
  })
})
