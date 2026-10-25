import type {
  CommunityId,
  CommunityMood,
} from '../../shared/community-contract.ts'
import type { PoloPhase, PoloSceneState } from './model.ts'
import { activePoloImprovements } from './interventions.ts'
import { activePoloLearnings, activeCustomPoloLearnings } from './learnings.ts'
import { poloSupport } from './impact.ts'

export interface PoloReaction {
  text: string
  mood: CommunityMood
  sign: string | null
}
interface PhaseReaction {
  turnout: number
  voices: Record<CommunityId, PoloReaction>
}
const voice = (
  text: string,
  mood: CommunityMood,
  sign: string | null = null,
): PoloReaction => ({ text, mood, sign })

/** Authored fictional reactions, not real residents' positions or crowd estimates. */
const PHASE_REACTIONS: Record<PoloPhase, PhaseReaction> = {
  M0: {
    turnout: 8,
    voices: {
      neighbor: voice(
        'A data center here? Keep our park public.',
        'angry',
        'Keep parks public',
      ),
      nature: voice(
        'This proposal puts living soil at risk.',
        'concerned',
        'Soil is alive',
      ),
      student: voice(
        'Our team plays here. Hear us before building.',
        'concerned',
        'Let us play',
      ),
      operator: voice(
        'A proposal is not permission. We need to listen.',
        'concerned',
      ),
    },
  },
  M1: {
    turnout: 11,
    voices: {
      neighbor: voice(
        'Wait—the shared field is disappearing!',
        'angry',
        'Save our field',
      ),
      nature: voice(
        'That turf protected living soil.',
        'concerned',
        'Soil is alive',
      ),
      student: voice(
        'Our game has to stop. Where do we go?',
        'angry',
        'Let us play',
      ),
      operator: voice(
        'Foundations are in place. Who needs to be heard?',
        'concerned',
      ),
    },
  },
  M4: {
    turnout: 17,
    voices: {
      neighbor: voice(
        'These buildings replace a place we shared.',
        'angry',
        'Save our field',
      ),
      nature: voice(
        'A roof doesn’t replace living ground.',
        'angry',
        'Soil before concrete',
      ),
      student: voice(
        'Servers get a home. What about our team?',
        'angry',
        'Let us play',
      ),
      operator: voice(
        'People use computing. Does it belong here?',
        'concerned',
      ),
    },
  },
  M5: {
    turnout: 20,
    voices: {
      neighbor: voice(
        'The walls are finished. Our concerns aren’t.',
        'angry',
        'We’re still here',
      ),
      nature: voice(
        'New planting needs care. Lost turf still matters.',
        'concerned',
        'Care takes time',
      ),
      student: voice(
        'Opening day for servers. Where can we play?',
        'angry',
        'Public space for us',
      ),
      operator: voice(
        'Equipment is ready. We still need to listen.',
        'concerned',
      ),
    },
  },
  M6: {
    turnout: 20,
    voices: {
      neighbor: voice(
        'It’s running. We still want our public space.',
        'angry',
        'Keep parks public',
      ),
      nature: voice(
        'Cooling needs water and power every day.',
        'concerned',
        'Think beyond opening',
      ),
      student: voice(
        'Useful computing—but who gets the benefits?',
        'angry',
        'Hear young people',
      ),
      operator: voice(
        'Can we improve this plan without hiding the losses?',
        'neutral',
      ),
    },
  },
}

function basePoloReactions(state: PoloSceneState): PhaseReaction {
  const phase = state.confirmed ? state.phase : 'M0'
  const baseline = PHASE_REACTIONS[phase]
  if (phase !== 'M6' || !state.preview || !state.proposal) return baseline
  const copy = (
    id: CommunityId,
    text: string,
    mood?: CommunityMood,
  ): PoloReaction => ({
    ...baseline.voices[id],
    text,
    mood: mood ?? baseline.voices[id].mood,
  })
  const voices: Record<CommunityId, PoloReaction> =
    state.proposal === 'heat_reuse_neighbors'
      ? {
          neighbor: copy(
            'neighbor',
            'Who gets the heat—and who lost the field?',
          ),
          nature: copy(
            'nature',
            'Those pipes need digging and restoration too.',
          ),
          student: copy(
            'student',
            'Could shared heat help people? We still need play space.',
            'concerned',
          ),
          operator: copy(
            'operator',
            state.recipientAvailable
              ? 'Explore the heat link. Backup cooling stays.'
              : 'No heat recipient now. Computing still needs cooling.',
          ),
        }
      : state.proposal === 'recycled_water'
        ? {
            neighbor: copy(
              'neighbor',
              'A new water source doesn’t replace our field.',
            ),
            nature: copy('nature', 'Is that supply available and safe to use?'),
            student: copy(
              'student',
              'Better water choices. What about public access?',
              'concerned',
            ),
            operator: copy(
              'operator',
              'Treatment, a connection and backup still matter.',
            ),
          }
        : {
            neighbor: copy('neighbor', 'A green roof isn’t our playing field.'),
            nature: copy(
              'nature',
              'Plants could help. Who will care for them?',
              'hopeful',
            ),
            student: copy(
              'student',
              'It looks greener. Can our team play there?',
            ),
            operator: copy(
              'operator',
              'Roof planting needs structure, drainage and care.',
            ),
          }
  const gain = poloSupport(state) - poloSupport({ ...state, preview: false })
  return {
    ...baseline,
    turnout: baseline.turnout - Math.floor(gain / 2),
    voices,
  }
}

export function poloReactions(state: PoloSceneState): PhaseReaction {
  const base = basePoloReactions(state)
  const learned = activePoloLearnings(state)
  if (!learned.length && activeCustomPoloLearnings(state).length)
    return {
      ...base,
      voices: {
        neighbor: {
          ...base.voices.neighbor,
          text: 'How would your idea affect the people who use this field?',
          mood: 'concerned',
        },
        nature: {
          ...base.voices.nature,
          text: 'Let’s check how your idea affects soil, water and habitat.',
          mood: 'concerned',
        },
        student: {
          ...base.voices.student,
          text: 'What would your idea mean for our team and public space?',
          mood: 'concerned',
        },
        operator: {
          ...base.voices.operator,
          text: 'Your idea is worth discussing. We need evidence before changing the design.',
          mood: 'neutral',
        },
      },
    }
  if (learned.length) {
    const green = learned.some((item) => item.id === 'soil')
    const roof = learned.some((item) => item.id === 'roof')
    return {
      ...base,
      voices: {
        neighbor: {
          ...base.voices.neighbor,
          text: green
            ? 'The planted path helps. Our playing field is still gone.'
            : 'I see the changes. We still lost a place we shared.',
          mood: 'concerned',
        },
        nature: {
          ...base.voices.nature,
          text: green
            ? 'Protecting soil and planting helps. Who will care for it?'
            : roof
              ? 'Plants on the roof help. Living ground still matters.'
              : 'Water and heat choices help us think. Soil still matters.',
          mood: green || roof ? 'hopeful' : 'concerned',
        },
        student: {
          ...base.voices.student,
          text: 'A better campus still leaves our team without this field.',
          mood: 'concerned',
        },
        operator: {
          ...base.voices.operator,
          text: 'Planning these ideas together helps. We still need to test each connection.',
          mood: 'hopeful',
        },
      },
    }
  }
  const applied = activePoloImprovements(state)
  if (!applied.length) return base
  const voices = { ...base.voices }
  for (const item of applied) {
    if (item.id === 'soil') {
      voices.nature = {
        ...voices.nature,
        text: 'Keeping that soil strip helps. It still needs care.',
        mood: 'concerned',
      }
      voices.operator = {
        ...voices.operator,
        text: 'Keeping living soil leaves less room for the works.',
        mood: 'neutral',
      }
    }
    if (item.id === 'foundation')
      voices.operator = {
        ...voices.operator,
        text: 'The marked sections are reinforced. Extra concrete has a cost.',
        mood: 'neutral',
      }
    if (item.id === 'grounds') {
      voices.neighbor = {
        ...voices.neighbor,
        text: 'The path helps us walk here. Our field is still gone.',
        mood: 'concerned',
      }
      voices.student = {
        ...voices.student,
        text: 'A walking path helps. Our team still needs a pitch.',
        mood: 'concerned',
      }
    }
  }
  return { ...base, voices }
}

/** Authored crowd of 100, present only for the pre-construction conversation. */
export function poloProtestTurnout(
  state: PoloSceneState,
  active = true,
): number {
  return active && state.confirmed && state.phase === 'M0' ? 100 : 0
}

/** Peaceful rally spread across the original field, independent of campus size. */
export function poloProtesterPosition(
  index: number,
  elapsed: number,
): [number, number] {
  const row = Math.floor(index / 10)
  return [
    -108 + (index % 10) * 24 + Math.sin(elapsed * 0.8 + index) * 2,
    -54 + row * 12 + Math.cos(elapsed * 0.7 + index) * 1.5,
  ]
}

export function poloReactionLines(text: string): string {
  const lines: string[] = []
  for (const word of text.split(' ')) {
    const last = lines.at(-1)
    if (last && last.length + word.length < 36)
      lines[lines.length - 1] = last + ' ' + word
    else lines.push(word)
  }
  return lines.join('\n')
}
