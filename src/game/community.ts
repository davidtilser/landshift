import { evaluatePlan } from './consequences.ts'
import type { PlanChoices, SiteContext } from './consequences.ts'

export type VoiceId = 'neighbor' | 'nature' | 'student'
export interface CommunityVoice {
  id: VoiceId
  name: string
  icon: string
  quote: string
}
export interface MiniChallenge {
  id: 'site' | 'budget' | 'water' | 'nature' | 'share' | 'flood' | 'compare'
  title: string
  target: 'move' | 'cooling' | 'land' | 'people' | 'future'
  celebration: string
}

/** Fictional perspectives for roleplay; never polling or community consent. */
export function communityVoices(
  choices: PlanChoices,
  site: SiteContext,
): CommunityVoice[] {
  return [
    {
      id: 'neighbor',
      name: 'Neighbor',
      icon: '💧',
      quote: site.buildings
        ? 'People already use this place.'
        : site.water
          ? 'Please leave room for the river.'
          : choices.cooling === 'evaporative'
            ? 'Could we cool it with less water?'
            : site.flood
              ? 'Less water used. Flood risk remains.'
              : 'Less water! What about the extra power?',
    },
    {
      id: 'nature',
      name: 'Nature volunteer',
      icon: '🌱',
      quote:
        site.parks || site.water
          ? 'Keep this habitat connected!'
          : !choices.trees && choices.restoration === 'none'
            ? 'Can we make space for wildlife?'
            : choices.restoration === 'rain-garden'
              ? 'Plants can slow rainwater. Nice!'
              : choices.restoration === 'meadow'
                ? 'A native meadow could help pollinators.'
                : 'Trees need time and care to grow.',
    },
    {
      id: 'student',
      name: 'Local student',
      icon: '🎒',
      quote: choices.training
        ? 'Paid training? I could learn new skills!'
        : choices.access
          ? 'A green path for us to walk? Yes!'
          : 'How could young people benefit too?',
    },
  ]
}

/** One actionable next experiment, without claiming a universally best plan. */
export function nextChallenge(
  choices: PlanChoices,
  site: SiteContext,
): MiniChallenge {
  if (site.buildings || site.water || site.parks)
    return {
      id: 'site',
      title: 'Find a clear footprint',
      target: 'move',
      celebration: 'Footprint cleared!',
    }
  if (evaluatePlan(site, choices, 0, 'drought').remaining < 0)
    return {
      id: 'budget',
      title: 'Keep upgrades within 100 credits',
      target: 'cooling',
      celebration: 'Back on budget!',
    }
  if (choices.cooling === 'evaporative')
    return {
      id: 'water',
      title: 'Try cooling with less water',
      target: 'cooling',
      celebration: 'Water use reduced!',
    }
  if (!choices.trees && choices.restoration === 'none')
    return {
      id: 'nature',
      title: 'Make room for nature',
      target: 'land',
      celebration: 'Space for nature!',
    }
  if (!choices.training && !choices.access)
    return {
      id: 'share',
      title: 'Give something back to neighbors',
      target: 'people',
      celebration: 'A benefit to share!',
    }
  if (site.flood)
    return {
      id: 'flood',
      title: 'Explore a spot outside mapped flood areas',
      target: 'move',
      celebration: 'Mapped exposure reduced!',
    }
  return {
    id: 'compare',
    title: 'See what changes in ten years',
    target: 'future',
    celebration: '',
  }
}

export function challengeCompleted(
  id: MiniChallenge['id'],
  choices: PlanChoices,
  site: SiteContext,
): boolean {
  switch (id) {
    case 'site':
      return !site.buildings && !site.water && !site.parks
    case 'budget':
      return evaluatePlan(site, choices, 0, 'drought').remaining >= 0
    case 'water':
      return choices.cooling !== 'evaporative'
    case 'nature':
      return choices.trees > 0 || choices.restoration !== 'none'
    case 'share':
      return choices.training || choices.access
    case 'flood':
      return !site.flood
    case 'compare':
      return false
  }
}
