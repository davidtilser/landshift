import type {
  CommunityId,
  CommunityMood,
  CommunityMoodState,
  CommunityMoodBreakdown,
} from '../shared/community-contract.ts'
import type { DiscussionContext } from './discussion.ts'
import type { CommunityProfile } from './community-profiles.ts'

export const MOOD_PRESENTATION: Record<
  CommunityMood,
  { label: string; emoji: string }
> = {
  angry: { label: 'Angry', emoji: '😠' },
  concerned: { label: 'Worried', emoji: '😟' },
  neutral: { label: 'Okay', emoji: '😐' },
  hopeful: { label: 'Hopeful', emoji: '🙂' },
}

/** Authored starting crowd for the game; these percentages are not a real survey. */
export function initialCommunityMoodBreakdown(
  profiles: CommunityProfile[],
): CommunityMoodBreakdown {
  const worried = profiles.filter(
    (profile) => profile.initialMood.mood === 'concerned',
  ).length
  if (worried >= 3)
    return {
      angry: 20,
      concerned: 65,
      neutral: 10,
      hopeful: 5,
      reason: 'The proposal threatens places people care about.',
    }
  if (worried)
    return {
      angry: 10,
      concerned: 45,
      neutral: 30,
      hopeful: 15,
      reason: 'People still have questions about the plan’s trade-offs.',
    }
  return {
    angry: 5,
    concerned: 20,
    neutral: 40,
    hopeful: 35,
    reason: 'There are possibilities to explore, with questions still open.',
  }
}

/** Authored starting reactions for fictional characters, never a poll or consent score. */
export function initialCommunityMoods(
  context: DiscussionContext,
): Record<CommunityId, CommunityMoodState> {
  const { site, choices } = context
  return {
    neighbor: site.heritage
      ? {
          mood: 'concerned',
          reason: 'The footprint covers the memorial point.',
        }
      : site.parks || site.water || site.buildings
        ? { mood: 'concerned', reason: 'People already use this place.' }
        : choices.cooling === 'evaporative'
          ? { mood: 'concerned', reason: 'Water demand is still a concern.' }
          : {
              mood: 'neutral',
              reason: 'Ready to hear the water and power trade-offs.',
            },
    nature:
      site.parks || site.water || site.heritage
        ? {
            mood: 'concerned',
            reason: 'Existing habitat and the grove need protection.',
          }
        : choices.trees || choices.restoration !== 'none'
          ? {
              mood: 'hopeful',
              reason: 'Restoration could help if it receives long-term care.',
            }
          : {
              mood: 'concerned',
              reason: 'There is no new planting or restoration in the plan.',
            },
    student: site.parks
      ? {
          mood: 'concerned',
          reason: 'People could lose shared space to meet and play.',
        }
      : choices.training || choices.access
        ? {
            mood: 'hopeful',
            reason: 'There may be more opportunities and shared space.',
          }
        : {
            mood: 'neutral',
            reason: 'Listening for who benefits and who might lose out.',
          },
    operator: {
      mood: 'neutral',
      reason: 'Ready to compare locations and cooling designs.',
    },
  }
}
