import type {
  CommunityId,
  CommunityReply,
  CommunityMoodState,
} from '../shared/community-contract.ts'
import { initialCommunityMoods } from './community-mood.ts'
import { communityVoices } from './community.ts'
import type { DiscussionContext } from './discussion.ts'
import { poloProfiles } from './polo/perspectives.ts'

export interface CommunityProfile {
  id: CommunityId
  name: string
  icon: string
  color: string
  motivation: string
  goal: string
  boundary: string
  flexible: string
  question: string
  post: string
  initialMood: CommunityMoodState
}

/** Fictional individual perspectives, never spokespeople for actual organizations. */
export function communityProfiles(
  context: DiscussionContext,
): CommunityProfile[] {
  if (context.polo) return poloProfiles(context.polo)
  const [neighbor, nature, student] = communityVoices(
    context.choices,
    context.site,
  )
  const park = Boolean(context.site.heritageContext)
  const moods = initialCommunityMoods(context)
  return [
    {
      id: 'neighbor',
      initialMood: moods.neighbor,
      name: neighbor?.name ?? 'Neighbor',
      icon: neighbor?.icon ?? '💧',
      color: 'amber',
      motivation: park
        ? 'This grove holds shared memories.'
        : 'Neighbors live with the water and land decisions.',
      goal: park
        ? 'Keep the memorial and its setting.'
        : 'Protect everyday life and local water.',
      boundary: park
        ? 'Moving a stone does not preserve the whole place.'
        : 'A benefit elsewhere does not erase local harm.',
      flexible: 'Compare locations and ask what evidence is missing.',
      question: park
        ? 'What would be lost if we moved the memorial?'
        : 'What worries you about this plan?',
      post: neighbor?.quote ?? 'Who will live with these changes?',
    },
    {
      id: 'nature',
      initialMood: moods.nature,
      name: nature?.name ?? 'Nature volunteer',
      icon: '🌱',
      color: 'green',
      motivation:
        'Living soil, mature trees and connected habitat need a voice.',
      goal: 'Protect existing nature and care for restoration over time.',
      boundary:
        'New saplings cannot immediately replace mature habitat. Planting does not erase flood exposure.',
      flexible:
        'Compare a smaller footprint, another site, meadow or rain garden.',
      question: 'What can restoration help, and what can it never replace?',
      post: nature?.quote ?? 'What happens to the habitat already here?',
    },
    {
      id: 'student',
      initialMood: moods.student,
      name: student?.name ?? 'Local student',
      icon: student?.icon ?? '🎒',
      color: 'blue',
      motivation: park
        ? 'The park is a place to meet, walk and play.'
        : 'Young people should share opportunities and public space.',
      goal: park
        ? 'Keep useful, welcoming public space.'
        : 'Make training and shared space meaningful and accessible.',
      boundary:
        'Training places or a new path do not automatically replace an existing park.',
      flexible: 'Discuss access, paid learning and who might be left out.',
      question: 'Who gains something, and who loses something?',
      post: student?.quote ?? 'How do young people benefit too?',
    },
    {
      id: 'operator',
      initialMood: moods.operator,
      name: 'Data-center designer',
      icon: '⚡',
      color: 'purple',
      motivation:
        'People use computing services, and a facility needs reliable cooling and power.',
      goal: 'Explore a workable design with fewer impacts.',
      boundary:
        'Computing needs do not establish a right to build here. No invented jobs, permits or guarantees.',
      flexible:
        'Change site, compare cooling and discuss a smaller future design.',
      question: 'How could we meet computing needs with less harm?',
      post: context.site.heritage
        ? 'This site has a memorial. We need to hear why the place matters before choosing a design.'
        : context.choices.cooling === 'dry'
          ? 'Air cooling saves direct water in our game, but needs more electricity. What should we compare next?'
          : 'Computing needs cooling. Can we compare water, power and where the building goes?',
    },
  ]
}

/** Transparent offline fallback. Never presented as a model response. */
export function demoExchange(
  context: DiscussionContext,
  target: CommunityId,
  discussion: boolean,
): CommunityReply {
  const profiles = communityProfiles(context)
  const profile = profiles.find((item) => item.id === target) ?? profiles[0]
  if (!profile) throw new Error('Missing community profile')
  if (!discussion)
    return {
      messages: [
        { speaker: target, text: profile.goal + ' ' + profile.flexible },
      ],
    }
  if (context.polo)
    return {
      messages: [
        { speaker: target, text: profile.post },
        {
          speaker: target === 'operator' ? 'nature' : 'operator',
          text:
            context.polo.scene.proposal && context.polo.scene.preview
              ? 'Let’s compare how this option works and what it cannot fix.'
              : 'We still need to review the construction requirements and ongoing water and power needs.',
        },
        {
          speaker: target === 'student' ? 'neighbor' : 'student',
          text: 'Who gains a benefit, and what happens to the people who already use this field?',
        },
      ],
    }
  return {
    messages: [
      { speaker: target, text: profile.post },
      {
        speaker: target === 'operator' ? 'nature' : 'operator',
        text: context.site.heritage
          ? 'Better cooling cannot preserve a memorial under the building. Could we compare another location?'
          : 'A cooling change affects water and power. What would this location mean for the people and habitat already here?',
      },
      {
        speaker: target === 'student' ? 'neighbor' : 'student',
        text: context.site.parks
          ? 'People already use this park. How would we keep the space where we meet, walk and play?'
          : 'Different people may value skills and shared space differently. Who else should we hear from?',
      },
    ],
  }
}
