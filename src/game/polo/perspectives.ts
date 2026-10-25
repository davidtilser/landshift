import type { CommunityProfile } from '../community-profiles.ts'
import type { PoloDiscussionFacts } from './context.ts'
import { poloReactions } from './reactions.ts'

/** Authored fictional individuals; no imported Heroes’ Grove or real group positions. */
export function poloProfiles(facts: PoloDiscussionFacts): CommunityProfile[] {
  const reactions = poloReactions(facts.scene).voices
  return [
    {
      id: 'neighbor',
      name: 'Park regular',
      icon: '🚶',
      color: 'amber',
      motivation:
        'Public park space supports everyday life and shared routines.',
      goal: 'Keep accessible public space and understand who gains and loses.',
      boundary:
        'A heat connection or greener roof does not compensate for losing the field.',
      flexible:
        'Compare the original field and ask who would benefit from a proposal.',
      question: 'What happens to people who use this field?',
      post: reactions.neighbor.text,
      initialMood: {
        mood: reactions.neighbor.mood,
        reason: reactions.neighbor.text,
      },
    },
    {
      id: 'nature',
      name: 'Soil volunteer',
      icon: '🌱',
      color: 'green',
      motivation:
        'Living soil, rainfall pathways and careful construction deserve attention.',
      goal: 'Understand soil disturbance, maintenance and what each visual concept cannot fix.',
      boundary:
        'A green roof is not a restored sports field; the prepared scenario does not clear surrounding trees.',
      flexible:
        'Explore roof plants, recycled supply and restoration of an illustrative trench.',
      question: 'What still needs care after the equipment is installed?',
      post: reactions.nature.text,
      initialMood: {
        mood: reactions.nature.mood,
        reason: reactions.nature.text,
      },
    },
    {
      id: 'student',
      name: 'Young player',
      icon: '⚽',
      color: 'blue',
      motivation: 'Young people need welcoming places to meet, train and play.',
      goal: 'Keep recreation accessible and ask how benefits would be shared.',
      boundary:
        'A fictional model pool does not replace this public field or prove that real residents benefit.',
      flexible:
        'Ask about access and compare possible benefits with lost uses.',
      question: 'Who can use the spaces in this idea?',
      post: reactions.student.text,
      initialMood: {
        mood: reactions.student.mood,
        reason: reactions.student.text,
      },
    },
    {
      id: 'operator',
      name: 'Data-center designer',
      icon: '⚡',
      color: 'purple',
      motivation:
        'Computing needs reliable power and cooling; possible benefits need real interfaces.',
      goal: 'Explain each mechanism, its trade-offs and the evidence still missing.',
      boundary:
        'No invented savings, actual utility connections, permits, jobs or guaranteed performance.',
      flexible:
        'Preview heat delivery, recycled supply or a planted roof independently, and compare the original.',
      question: 'What extra equipment does this benefit need?',
      post: reactions.operator.text,
      initialMood: {
        mood: reactions.operator.mood,
        reason: reactions.operator.text,
      },
    },
  ]
}
