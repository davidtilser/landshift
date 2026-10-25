import { nextChallenge } from './community.ts'
import type { MiniChallenge, VoiceId } from './community.ts'
import type { DiscussionContext, DiscussionTopic } from './discussion.ts'

export type DialogueTarget = MiniChallenge['target']
interface ChoiceLabel {
  label: string
  hint: string
  icon: string
}
export type DialogueChoice = ChoiceLabel &
  (
    | { kind: 'say'; topic: DiscussionTopic }
    | { kind: 'try'; target: DialogueTarget }
  )
const say = (
  label: string,
  hint: string,
  icon: string,
  topic: DiscussionTopic,
): DialogueChoice => ({ kind: 'say', label, hint, icon, topic })
const tryIdea = (
  label: string,
  icon: string,
  target: DialogueTarget,
): DialogueChoice => ({
  kind: 'try',
  label,
  hint: 'Try it on the map →',
  icon,
  target,
})

/** Authored branches invite comparison; selecting a line never buys an upgrade. */
export function dialogueChoices(
  voice: VoiceId,
  topic: DiscussionTopic | undefined,
  context: DiscussionContext,
): DialogueChoice[] {
  switch (topic) {
    case 'heritage':
      return [
        say(
          'Could we move the monument?',
          'Explore place and remembrance',
          '🕯️',
          'heritage',
        ),
        say(
          'What about the living grove?',
          'Explore habitat and history',
          '🌳',
          'nature',
        ),
        tryIdea('Keep it. Compare another site', '🧭', 'move'),
      ]
    case 'park':
      return [
        say(
          'Could training make up for it?',
          'Compare different kinds of benefit',
          '🎒',
          'training',
        ),
        say(
          'What about nature?',
          'Public space is living space',
          '🌱',
          'nature',
        ),
        tryIdea('Explore another footprint', '🧭', 'move'),
      ]
    case 'water':
      return [
        say(
          'But what about power?',
          'Explore the other resource',
          '⚡',
          'power',
        ),
        say('Can we afford it?', 'Check the game allowance', '🪙', 'budget'),
        tryIdea('Let’s compare cooling', '💧', 'cooling'),
      ]
    case 'power':
      return [
        say('I want to save water', 'There is a trade-off', '💧', 'water'),
        say('What would it cost?', 'Think about the budget', '🪙', 'budget'),
        tryIdea('Show me the cooling cards', '⚡', 'cooling'),
      ]
    case 'nature':
      return [
        say(
          'Will plants stop flooding?',
          'Ask what planting can do',
          '🌧',
          'flood',
        ),
        tryIdea('Show me nature choices', '🌱', 'land'),
        tryIdea('See the trees in ten years', '🌳', 'future'),
      ]
    case 'flood':
      return [
        say(
          'Could a rain garden help?',
          'Rainfall and floods differ',
          '🌱',
          'nature',
        ),
        say('What does the map tell us?', 'Check what we know', '📍', 'site'),
        tryIdea('Compare another spot', '🧭', 'move'),
      ]
    case 'benefit':
      return [
        say('Share new skills', 'Explore paid training', '🎒', 'training'),
        say(
          'Share a green path',
          'Explore space for neighbors',
          '🚶',
          'access',
        ),
        say('What can we afford?', 'Compare priorities', '🪙', 'budget'),
      ]
    case 'training':
      return [
        say(
          'Could we share space instead?',
          'Compare a green path',
          '🚶',
          'access',
        ),
        say('What would we give up?', 'Look at the budget', '🪙', 'budget'),
        tryIdea('Show me the sharing cards', '🎒', 'people'),
      ]
    case 'access':
      return [
        say(
          'What about teaching skills?',
          'Compare paid training',
          '🎒',
          'training',
        ),
        say(
          'What about wildlife?',
          'People and habitat both matter',
          '🌱',
          'nature',
        ),
        tryIdea('Show me the sharing cards', '🚶', 'people'),
      ]
    case 'budget':
      return [
        say('Prioritize water', 'Explore cooling trade-offs', '💧', 'water'),
        say('Prioritize nature', 'Explore planting and care', '🌱', 'nature'),
        tryIdea('Rebalance my cards', '🪙', 'cooling'),
      ]
    case 'site':
      return [
        say('What about flooding?', 'Check mapped exposure', '🌧', 'flood'),
        say('Could planting fix it?', 'Understand the limits', '🌱', 'nature'),
        tryIdea('Try another footprint', '🧭', 'move'),
      ]
    case 'next': {
      const challenge = nextChallenge(context.choices, context.site)
      return [
        tryIdea('Let’s try that idea', '🎯', challenge.target),
        say('What would we give up?', 'Compare the budget', '🪙', 'budget'),
        say('Who benefits?', 'Hear another perspective', '🤝', 'benefit'),
      ]
    }
    case undefined:
    case 'hello':
    case 'other':
      if (context.site.heritageContext && voice === 'neighbor')
        return [
          say(
            'Why does this memorial matter?',
            'Hear a memorial steward',
            '🕯️',
            'heritage',
          ),
          say(
            'Could we move the monument?',
            'Explore place and memory',
            '🧭',
            'heritage',
          ),
          tryIdea('Compare another location', '📍', 'move'),
        ]
      if (context.site.heritageContext && voice === 'nature')
        return [
          say(
            'Protect the living grove',
            'Explore habitat and history',
            '🌳',
            'nature',
          ),
          say(
            'What would people lose?',
            'Hear about shared public space',
            '🚶',
            'park',
          ),
          say(
            'Why does the memorial matter?',
            'Hear the heritage concern',
            '🕯️',
            'heritage',
          ),
        ]
      if (context.site.heritageContext && voice === 'student')
        return [
          say(
            'What would park users lose?',
            'Explore space, access and belonging',
            '🚶',
            'park',
          ),
          say(
            'Could training make up for it?',
            'Compare shared benefits',
            '🎒',
            'training',
          ),
          tryIdea('Keep the park. Compare sites', '🧭', 'move'),
        ]
      return voice === 'nature'
        ? [
            say(
              'Make room for wildlife',
              'Explore habitat and shade',
              '🌱',
              'nature',
            ),
            say(
              'Can plants stop flooding?',
              'Explore the limits',
              '🌧',
              'flood',
            ),
            say('What should we try?', 'Find a next move', '🎯', 'next'),
          ]
        : voice === 'student'
          ? [
              say(
                'Share new skills',
                'Explore paid training',
                '🎒',
                'training',
              ),
              say(
                'Share a green path',
                'Explore community space',
                '🚶',
                'access',
              ),
              say(
                'Who gets left out?',
                'Think about different needs',
                '🤝',
                'benefit',
              ),
            ]
          : [
              say('Save water', 'What happens to power?', '💧', 'water'),
              say(
                'Keep power use down',
                'What happens to water?',
                '⚡',
                'power',
              ),
              say('What should we try?', 'Find a next move', '🎯', 'next'),
            ]
  }
}
