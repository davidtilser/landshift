import { evaluatePlan } from './consequences.ts'
import { nextChallenge } from './community.ts'
import type { CommunityVoice, VoiceId, MiniChallenge } from './community.ts'
import type {
  GameYear,
  PlanChoices,
  SiteContext,
  Weather,
} from './consequences.ts'
import type { PoloDiscussionFacts } from './polo/context.ts'

export interface DiscussionContext {
  choices: PlanChoices
  site: SiteContext
  year: GameYear
  weather: Weather
  polo?: PoloDiscussionFacts
}
export interface DiscussionTurn {
  role: 'user' | 'assistant'
  text: string
}
export interface DiscussionRequest {
  voice: CommunityVoice
  question: string
  history: DiscussionTurn[]
  context: DiscussionContext
  topic?: DiscussionTopic
}
export interface DiscussionReply {
  text: string
  source: 'scripted'
  topic: DiscussionTopic
}

export type DiscussionTopic =
  | 'heritage'
  | 'park'
  | 'water'
  | 'power'
  | 'nature'
  | 'flood'
  | 'benefit'
  | 'training'
  | 'access'
  | 'budget'
  | 'site'
  | 'next'
  | 'hello'
  | 'other'
function topicOf(text: string): DiscussionTopic {
  if (
    /memorial|heritage|remember|veteran|history|commemorat|boulder|heroes|gold star|monument/.test(
      text,
    )
  )
    return 'heritage'
  if (/park|public space|shared space|recreation/.test(text)) return 'park'
  if (/flood|hazard|safe|storm|rainwater/.test(text)) return 'flood'
  if (/water|cool|drought|dry summer/.test(text)) return 'water'
  if (/power|electric|energy|grid/.test(text)) return 'power'
  if (
    /tree|shade|plant|restor|meadow|garden|wildlife|nature|habitat|pollinat|biodivers/.test(
      text,
    )
  )
    return 'nature'
  if (/job|train|skill/.test(text)) return 'training'
  if (/walk|path|access/.test(text)) return 'access'
  if (/benefit|student|young|youth|communit/.test(text)) return 'benefit'
  if (/budget|credit|cost|money|afford/.test(text)) return 'budget'
  if (/where|site|place|footprint|building|river|park/.test(text)) return 'site'
  if (
    /should|next|improv|suggest|recommend|worr|concern|think|change|agree|why|help/.test(
      text,
    )
  )
    return 'next'
  if (/^(hi|hey|hello|thanks|thank you)[!. ?]*$/.test(text.trim()))
    return 'hello'
  return 'other'
}
const perspectives: Record<VoiceId, string> = {
  neighbor: 'I care about water and the people living nearby.',
  nature: 'I want room for living soil, plants, and wildlife.',
  student: 'I want young people to have a way to benefit too.',
}

/** Authored demo responses. No inference, network requests, or plan mutations. */
export function scriptedDiscussion(
  request: DiscussionRequest,
): DiscussionReply {
  const { voice, context, question } = request
  const { choices, site, year, weather } = context
  let topic = request.topic ?? topicOf(question.toLowerCase())
  if (
    !request.topic &&
    /^(why|how so|what about that|tell me more|how would that help)[?!. ]*$/i.test(
      question.trim(),
    )
  ) {
    const earlier = request.history
      .filter((turn) => turn.role === 'user')
      .at(-1)
    if (earlier) topic = topicOf(earlier.text.toLowerCase())
  }
  const result = evaluatePlan(site, choices, year, weather)
  let text: string
  switch (topic) {
    case 'heritage':
      text = site.heritage
        ? /mov(e|ing).*?(memorial|monument|stone)/i.test(question)
          ? 'Moving a stone is not the same as keeping a memorial. Its setting and meaning matter too. We should hear affected people, not assume agreement.'
          : 'This memorial marks local WWI remembrance. Its place and grove matter to people. New trees or training cannot replace that history.'
        : 'A memorial is more than a marker. Its setting and meaning matter, even when a building avoids the mapped point.'
      break
    case 'park':
      text = site.parks
        ? 'This footprint takes mapped public park space. People use it to walk, play and gather. A new path or training does not replace that loss.'
        : 'No park overlap appears in these layers. That is not permission to build; ownership, access and neighborhood impacts still need discussion.'
      break
    case 'water':
      text =
        choices.cooling === 'evaporative'
          ? 'Water cooling saves electricity but uses the most cooling water in our game. Hybrid or air cooling saves water, with more power needed.'
          : 'Your plan uses less direct water, but more electricity than water cooling in our game. Which matters more to you?'
      break
    case 'power':
      text =
        'Air cooling saves the most water but uses the most power in our game. Hybrid is the middle option.'
      break
    case 'nature':
      text = site.heritage
        ? 'The grove offers habitat and a place to remember. Saplings elsewhere cannot replace this place. Could we protect it and compare another site?'
        : site.buildings || site.water || site.parks
          ? 'Planting adds habitat, but cannot cancel a mapped footprint conflict. We still need to compare another spot.'
          : site.flood && /rain|flood/i.test(question)
            ? 'A rain garden can slow rainfall and add habitat. It does not remove this mapped flood exposure. We still need to compare locations.'
            : choices.restoration === 'none' && !choices.trees
              ? 'Trees bring shade over time. A meadow adds habitat; a rain garden slows rainfall. What would you make room for?'
              : choices.restoration === 'rain-garden'
                ? 'Your rain garden slows rainfall. It does not remove mapped flood exposure. Trees still need time and care.'
                : 'New habitat is a start! Trees need years of care before they give much shade. Peek at Year 10.'
      break
    case 'flood':
      text = site.flood
        ? 'This map flags flood exposure. Trees do not remove it. We cannot tell flood depth here—try comparing another spot.'
        : 'No flagged flood overlap here. That is not a guarantee of safety; a planner still needs more evidence.'
      break
    case 'training':
      text =
        site.heritage || site.parks
          ? 'Training could share skills, but it would not restore a memorial or replace public park space. Job opportunities and protecting a place are different questions.'
          : choices.training
            ? 'Your training card offers 12 fictional places per year. It is not a forecast of real jobs. Who should get to apply?'
            : 'Paid training could share new skills: 12 fictional places a year for 12 game credits. That is not a forecast of real jobs.'
      break
    case 'access':
      text = site.parks
        ? 'People already share this park. A new path does not make up for taking existing space away. How could we protect access first?'
        : choices.access
          ? 'Your green path shares space beyond the gates. It still needs suitable land and real access permission. Who would use it?'
          : 'A green path costs 10 game credits and offers space to walk. Real access still needs permission. Would you choose space or skills?'
      break
    case 'benefit':
      text = site.parks
        ? 'The park already offers a shared benefit. Taking it away and adding training is a trade-off, not an automatic improvement.'
        : choices.training
          ? 'Training shares skills. A path shares space. Different neighbors might value each differently—who else should we ask?'
          : choices.access
            ? 'A path gives people somewhere to walk. Training offers skills instead. There is more than one way to share a benefit.'
            : 'No training or shared path yet. We could share skills, or a place to walk. Which would help people here?'
      break
    case 'budget':
      text =
        result.remaining < 0
          ? `We are ${String(-result.remaining)} game credits over. Something has to give—cooling, planting, or shared benefits. These are fictional credits, not real costs.`
          : `${String(result.remaining)} game credits left. What would you fund first? Game credits are not real construction costs.`
      break
    case 'site': {
      const conflicts = [
        site.heritage ? 'a memorial point' : '',
        site.buildings ? 'buildings' : '',
        site.water ? 'water' : '',
        site.parks ? 'a park or trail corridor' : '',
      ].filter(Boolean)
      text = conflicts.length
        ? `Mapped ${conflicts.join(' and ')} overlap this footprint. Trees cannot cancel that conflict. Let’s compare another spot.`
        : site.flood
          ? 'No building, water or park overlap—but this spot has mapped flood exposure. A clear footprint alone is not permission to build.'
          : 'The mapped footprint checks are clear. We still need evidence about ownership, permits and environmental suitability.'
      break
    }
    case 'next': {
      const challenge = nextChallenge(choices, site)
      const reasons: Record<MiniChallenge['id'], string> = {
        heritage: 'A place of remembrance cannot be offset by upgrades.',
        water: 'Watch for the electricity trade-off.',
        nature: 'What would you trade for shade or habitat?',
        share: 'Would you share skills or a place to walk?',
        budget: 'Every upgrade means a compromise.',
        site: 'Upgrades cannot erase a mapped overlap.',
        flood: 'Planting does not remove mapped flood exposure.',
        compare: 'Trees grow slowly; compare Now with Year 10.',
      }
      text = challenge.title + '. ' + reasons[challenge.id]
      break
    }
    case 'hello':
      text = perspectives[voice.id] + ' What should we explore?'
      break
    case 'other':
      text =
        'In this demo, pick water, power, nature, flood maps, benefits or budget. Which trade-off shall we explore?'
      break
  }
  if (topic !== 'next' && topic !== 'hello' && topic !== 'other') {
    const lead =
      voice.id === 'nature' && topic === 'water'
        ? 'Living things need water too. '
        : voice.id === 'student' && topic === 'power'
          ? 'That is a tricky resource trade-off! '
          : voice.id === 'neighbor' && topic === 'benefit'
            ? 'I want our neighbors included. '
            : ''
    text = lead + text
  }
  return { text, source: 'scripted', topic }
}
