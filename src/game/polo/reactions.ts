import type {
  CommunityId,
  CommunityMood,
} from '../../shared/community-contract.ts'
import { POLO_PHASES } from './model.ts'
import type { PoloPhase, PoloSceneState } from './model.ts'

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
    turnout: 0,
    voices: {
      neighbor: voice('This is where we meet.', 'neutral'),
      nature: voice('There’s living soil under this grass.', 'neutral'),
      student: voice('Our team plays here!', 'hopeful'),
      operator: voice('What should we protect before building?', 'neutral'),
    },
  },
  M1: {
    turnout: 4,
    voices: {
      neighbor: voice(
        'Wait—the shared field is disappearing!',
        'concerned',
        'Save our field',
      ),
      nature: voice(
        'That turf protected living soil.',
        'concerned',
        'Soil is alive',
      ),
      student: voice(
        'Our game has to stop. Where do we go?',
        'concerned',
        'Let us play',
      ),
      operator: voice(
        'Site work has impacts. Who needs to be heard?',
        'concerned',
      ),
    },
  },
  M2: {
    turnout: 8,
    voices: {
      neighbor: voice(
        'We’re gathering. Keep this space public!',
        'concerned',
        'Public space',
      ),
      nature: voice(
        'Bare ground changes where the rain goes.',
        'concerned',
        'Care for soil',
      ),
      student: voice(
        'You’re reshaping our pitch. Hear us out!',
        'angry',
        'Hear young people',
      ),
      operator: voice(
        'We need drainage—and a plan for lost uses.',
        'concerned',
      ),
    },
  },
  M3: {
    turnout: 11,
    voices: {
      neighbor: voice(
        'We asked for a say. We’re still here!',
        'angry',
        'Listen to us',
      ),
      nature: voice(
        'Firm ground helps building. What about soil life?',
        'concerned',
        'Living soil matters',
      ),
      student: voice(
        'A prepared site isn’t a place to play.',
        'angry',
        'Keep play public',
      ),
      operator: voice(
        'The ground is ready. The disagreement isn’t solved.',
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

export function poloReactions(state: PoloSceneState): PhaseReaction {
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
  return { ...baseline, voices }
}

/** Join progressively during physical work; replay and comparison jumps never add people. */
export function poloProtestTurnout(
  state: PoloSceneState,
  progress: number,
): number {
  if (!state.confirmed || state.phase === 'M0') return 0
  const phaseIndex = POLO_PHASES.indexOf(state.phase)
  const before = PHASE_REACTIONS[POLO_PHASES[phaseIndex - 1] ?? 'M0'].turnout
  const after = PHASE_REACTIONS[state.phase].turnout
  const fraction = Number.isFinite(progress)
    ? Math.max(0, Math.min(1, progress))
    : 0
  return before + (after - before) * fraction
}

/** Field-anchored, peaceful rally along the track; nobody marches through the machinery. */
export function poloProtesterPosition(
  index: number,
  elapsed: number,
  turnout: number,
): [number, number] {
  const joined = Math.max(0, Math.min(1, turnout - index))
  const row = Math.floor(index / 10)
  const destination = -80 + (index % 10) * 26
  const entrance = index % 2 ? 180 : -180
  return [
    entrance +
      (destination - entrance) * joined +
      Math.sin(elapsed * 0.8 + index) * 2,
    -92 - row * 12 + Math.cos(elapsed * 0.7 + index) * 1.5,
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
