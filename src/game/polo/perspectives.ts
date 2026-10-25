import type { CommunityProfile } from '../community-profiles.ts'
import type { PoloDiscussionFacts } from './context.ts'

/** Authored fictional individuals; no imported Heroes’ Grove or real group positions. */
export function poloProfiles(facts: PoloDiscussionFacts): CommunityProfile[] {
  const concept = facts.scene.preview ? facts.scene.proposal : null
  const posts = {
    neighbor:
      concept === 'heat_reuse_neighbors'
        ? 'Who gets the heat—and who loses the field?'
        : concept === 'recycled_water'
          ? 'Is a recycled supply actually available?'
          : concept === 'green_roof'
            ? 'A green roof isn’t our playing field.'
            : 'This field already belongs to everyday park life.',
    nature:
      concept === 'heat_reuse_neighbors'
        ? 'A buried pipe needs digging and restoration too.'
        : concept === 'recycled_water'
          ? 'Water quality and backup still matter.'
          : concept === 'green_roof'
            ? 'Who keeps the roof plants alive?'
            : 'Stripping and compacting soil changes how rain moves.',
    student:
      concept === 'heat_reuse_neighbors'
        ? 'Could a model pool benefit everyone?'
        : concept === 'green_roof'
          ? 'Will we still have somewhere to play?'
          : 'Where would we play if this field changed?',
    operator:
      concept === 'heat_reuse_neighbors'
        ? 'Let’s follow the heat. The cooling backup stays.'
        : concept === 'recycled_water'
          ? 'A different supply still needs treatment and a connection.'
          : concept === 'green_roof'
            ? 'A planted roof needs structure, drainage and care.'
            : 'Let’s follow what changes from turf to operating campus.',
  }
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
      post: posts.neighbor,
      initialMood: {
        mood: 'concerned',
        reason: 'Public playing space could be lost.',
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
      post: posts.nature,
      initialMood: {
        mood: 'concerned',
        reason: 'Soil and rainfall pathways will change.',
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
      post: posts.student,
      initialMood: {
        mood: 'concerned',
        reason: 'Playing space matters to young people.',
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
      post: posts.operator,
      initialMood: {
        mood: 'neutral',
        reason: 'Ready to compare mechanisms and limits.',
      },
    },
  ]
}
