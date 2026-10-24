import { evaluatePlan } from './consequences.ts'
import { communityVoices, nextChallenge } from './community.ts'
import type { CommunityVoice, VoiceId } from './community.ts'
import type {
  GameYear,
  PlanChoices,
  SiteContext,
  Weather,
} from './consequences.ts'

export interface DiscussionContext {
  choices: PlanChoices
  site: SiteContext
  year: GameYear
  weather: Weather
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
}
export interface DiscussionReply {
  text: string
  source: 'scripted' | 'gemma'
}
/** Replace this adapter with Gemma later; the UI does not depend on an SDK. */
export interface DiscussionProvider {
  reply: (
    request: DiscussionRequest,
    signal: AbortSignal,
  ) => Promise<DiscussionReply>
}

type Topic =
  | 'water'
  | 'power'
  | 'nature'
  | 'flood'
  | 'benefit'
  | 'budget'
  | 'site'
  | 'next'
  | 'hello'
  | 'other'
function topicOf(text: string): Topic {
  if (/flood|hazard|safe|storm|rainwater/.test(text)) return 'flood'
  if (/water|cool|drought|dry summer/.test(text)) return 'water'
  if (/power|electric|energy|grid/.test(text)) return 'power'
  if (
    /tree|shade|plant|restor|meadow|garden|wildlife|nature|habitat|pollinat|biodivers/.test(
      text,
    )
  )
    return 'nature'
  if (
    /job|train|skill|benefit|student|young|youth|walk|path|access|communit/.test(
      text,
    )
  )
    return 'benefit'
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
  let topic = topicOf(question.toLowerCase())
  if (
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
    case 'water':
      text =
        choices.cooling === 'evaporative'
          ? 'Water cooling saves electricity, but uses the most cooling water in our game. Try “Mix air + water” and watch both columns. Would that compromise work for you?'
          : 'Your cooling choice uses less direct water than water cooling, but needs more electricity in our game. Saving water is a win with a trade-off. Would you compare it with the other cooling cards?'
      break
    case 'power':
      text =
        'Air cooling uses the most electricity in our model while saving the most cooling water. Hybrid sits between the two. Which resource would you protect first, and why?'
      break
    case 'nature':
      text =
        choices.restoration === 'none' && !choices.trees
          ? 'This plan has no new planting yet. Trees can add shade as they grow; a meadow offers habitat, and a rain garden slows rainfall. Try a nature card and then visit Year 10.'
          : choices.restoration === 'rain-garden'
            ? 'Your rain garden can slow rainfall, and your trees need time and care to grow. It does not remove mapped flood exposure. What changes when you jump to Year 10?'
            : 'Your planting makes room for nature in this game. Young trees need years of care before they offer much shade. Compare Now and Year 10—what would you keep funding after opening day?'
      break
    case 'flood':
      text = site.flood
        ? 'The downloaded flood map flags this footprint. Trees and rain gardens do not remove that exposure. Try another spot and compare the warning; this game cannot tell us flood depth or approve a safe site.'
        : 'This footprint has no flagged overlap in our downloaded flood layer. That is a useful check, not a guarantee of safety. A planner would still need more evidence, including flood depths and site conditions.'
      break
    case 'benefit':
      text = choices.training
        ? 'You chose paid local training: 12 fictional places a year in this game. That offers a way to learn skills; it is not a forecast of real jobs. How would you make those opportunities fair to apply for?'
        : choices.access
          ? 'Your proposed green path gives neighbors somewhere to walk outside the secure campus. Real access would still need permission and suitable land. Who should help design that space?'
          : 'The current plan offers neither training nor a shared path. The Share cards let you fund paid local training or propose a green walking space. Which would matter most to people here?'
      break
    case 'budget':
      text =
        result.remaining < 0
          ? `Your upgrades are ${String(-result.remaining)} game credits over budget. Try swapping a cooling or nature card, then compare what you give up. Credits are a game allowance, not real construction costs.`
          : `You have ${String(result.remaining)} game credits left. Spend them on the trade-off that matters to you, or keep comparing alternatives. These credits are not real money or a construction estimate.`
      break
    case 'site': {
      const conflicts = [
        site.buildings ? 'buildings' : '',
        site.water ? 'water' : '',
        site.parks ? 'a park or trail corridor' : '',
      ].filter(Boolean)
      text = conflicts.length
        ? `The footprint overlaps mapped ${conflicts.join(' and ')}. Adding trees or training cannot cancel that conflict. Use Move to try a clear footprint and check the map again.`
        : site.flood
          ? 'The footprint is clear of the mapped buildings, water, and parks we check, but it still overlaps a mapped flood area. Try another location and compare. A clear map check alone is not permission to build.'
          : 'The footprint is clear of the mapped overlaps this game checks. Ownership, permits, and detailed environmental suitability still need evidence. Could another location offer a better balance?'
      break
    }
    case 'next': {
      const challenge = nextChallenge(choices, site)
      const reason =
        challenge.id === 'water'
          ? 'Our water-heavy cooling choice saves electricity but puts more demand on water.'
          : challenge.id === 'flood'
            ? 'Planting and shared benefits leave the mapped flood exposure unresolved.'
            : challenge.id === 'site'
              ? 'The mapped footprint conflict stays even if we add upgrades.'
              : challenge.id === 'budget'
                ? 'We need to make a compromise to stay within the game allowance.'
                : perspectives[voice.id]
      text = `${reason} My next experiment would be: ${challenge.title.toLowerCase()}. Tap “Try the challenge” to explore it yourself.`
      break
    }
    case 'hello':
      text = `${perspectives[voice.id]} What would you like to discuss about your plan?`
      break
    case 'other': {
      const current = communityVoices(choices, site).find(
        (item) => item.id === voice.id,
      )
      text = `${current?.quote ?? perspectives[voice.id]} In this demo, I can discuss water, power, nature, flood checks, shared benefits, or your budget. Which one shall we explore?`
      break
    }
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
  return { text, source: 'scripted' }
}

export const mockDiscussionProvider: DiscussionProvider = {
  reply: (request, signal) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException('Discussion canceled', 'AbortError'))
        return
      }
      const cancel = (): void => {
        window.clearTimeout(timer)
        reject(new DOMException('Discussion canceled', 'AbortError'))
      }
      const timer = window.setTimeout(() => {
        signal.removeEventListener('abort', cancel)
        resolve(scriptedDiscussion(request))
      }, 350)
      signal.addEventListener('abort', cancel, { once: true })
    }),
}
