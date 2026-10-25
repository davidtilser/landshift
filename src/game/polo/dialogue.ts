import type {
  CommunityId,
  ConversationLine,
} from '../../shared/community-contract.ts'
import type { DialogueChoice } from '../dialogue-choices.ts'
import type { DiscussionTopic } from '../discussion.ts'
import type { PoloDiscussionFacts } from './context.ts'
import { poloImprovementSummary } from './interventions.ts'
import { poloReactions } from './reactions.ts'
import { activePoloLearnings } from './learnings.ts'

export type PoloDialogueTopic =
  | 'priority'
  | 'benefit'
  | 'loss'
  | 'water'
  | 'power'
  | 'heat'
  | 'recipient'
  | 'roof'
  | 'rain'
  | 'recycled'
  | 'evidence'
  | 'alternative'
  | 'access'
  | 'care'
  | 'construction'
  | 'next'

interface DialogueNode {
  label: string
  hint: string
  icon: string
  topic: DiscussionTopic
  followups: PoloDialogueTopic[]
}
const NODES: Record<PoloDialogueTopic, DialogueNode> = {
  priority: {
    label: 'What matters most to you?',
    hint: 'Hear this person’s priorities',
    icon: '💬',
    topic: 'park',
    followups: ['loss', 'benefit', 'alternative'],
  },
  benefit: {
    label: 'Who benefits from this idea?',
    hint: 'Name the gains and the losses',
    icon: '🤝',
    topic: 'benefit',
    followups: ['recipient', 'access', 'evidence'],
  },
  loss: {
    label: 'What would people lose?',
    hint: 'Look at the existing field',
    icon: '⚽',
    topic: 'park',
    followups: ['alternative', 'access', 'roof'],
  },
  water: {
    label: 'Where does the water go?',
    hint: 'Follow supply, cooling and drainage',
    icon: '💧',
    topic: 'water',
    followups: ['recycled', 'power', 'evidence'],
  },
  power: {
    label: 'What needs electricity?',
    hint: 'Computing and its supporting systems',
    icon: '⚡',
    topic: 'power',
    followups: ['heat', 'water', 'evidence'],
  },
  heat: {
    label: 'How would sharing heat work?',
    hint: 'Follow the separate heat circuit',
    icon: '♨️',
    topic: 'power',
    followups: ['recipient', 'power', 'loss'],
  },
  recipient: {
    label: 'What if nobody needs the heat?',
    hint: 'Test the recipient and the backup',
    icon: '🏊',
    topic: 'benefit',
    followups: ['evidence', 'loss', 'power'],
  },
  roof: {
    label: 'Does a green roof replace the field?',
    hint: 'Separate roof plants from public space',
    icon: '🌱',
    topic: 'nature',
    followups: ['rain', 'care', 'loss'],
  },
  rain: {
    label: 'Could this prevent flooding?',
    hint: 'Rainfall and flood predictions differ',
    icon: '🌧️',
    topic: 'flood',
    followups: ['roof', 'water', 'evidence'],
  },
  recycled: {
    label: 'Would recycled water solve it?',
    hint: 'Check supply, quality and backup',
    icon: '♻️',
    topic: 'water',
    followups: ['water', 'power', 'evidence'],
  },
  evidence: {
    label: 'What do we still need to verify?',
    hint: 'Separate the model from real evidence',
    icon: '🔎',
    topic: 'other',
    followups: ['alternative', 'construction', 'next'],
  },
  alternative: {
    label: 'Could we use another site or size?',
    hint: 'Compare before accepting this footprint',
    icon: '🧭',
    topic: 'site',
    followups: ['loss', 'benefit', 'next'],
  },
  access: {
    label: 'Could people still play here?',
    hint: 'Ask about access and displacement',
    icon: '🎒',
    topic: 'access',
    followups: ['alternative', 'benefit', 'loss'],
  },
  care: {
    label: 'Who would care for the plants?',
    hint: 'A green roof needs ongoing work',
    icon: '🌿',
    topic: 'nature',
    followups: ['roof', 'water', 'evidence'],
  },
  construction: {
    label: 'What changes during construction?',
    hint: 'Follow the selected story chapter',
    icon: '🏗️',
    topic: 'site',
    followups: ['water', 'power', 'loss'],
  },
  next: {
    label: 'What should I compare next?',
    hint: 'Choose a useful next investigation',
    icon: '🎯',
    topic: 'next',
    followups: ['alternative', 'evidence', 'benefit'],
  },
}
const INITIAL: Record<CommunityId, PoloDialogueTopic[]> = {
  neighbor: ['priority', 'benefit', 'alternative'],
  nature: ['priority', 'water', 'rain'],
  student: ['priority', 'benefit', 'access'],
  operator: ['priority', 'water', 'power'],
}
const TOPICS = [
  'priority',
  'benefit',
  'loss',
  'water',
  'power',
  'heat',
  'recipient',
  'roof',
  'rain',
  'recycled',
  'evidence',
  'alternative',
  'access',
  'care',
  'construction',
  'next',
] as const satisfies readonly PoloDialogueTopic[]

const CONTINUATION =
  /^(why|how so|tell me more|what about that|how would that help)[?!. ]*$/iu

/** Exact suggested lines and transparent keyword routing, never random selection. */
export function poloDialogueTopic(
  question: string,
  history: readonly ConversationLine[] = [],
): PoloDialogueTopic | undefined {
  const text = question.trim().toLowerCase()
  const exact = TOPICS.find((id) => NODES[id].label.toLowerCase() === text)
  if (exact) return exact
  if (CONTINUATION.test(text)) {
    const earlier = history.findLast((line) => line.speaker === 'planner')
    return earlier ? poloDialogueTopic(earlier.text) : undefined
  }
  if (
    /who.*(?:benefit|gain|get)|benefit|jobs|training|why.*(?:build|center|centre)/iu.test(
      text,
    )
  )
    return 'benefit'
  if (
    /recipient|pool|nobody|no one|unavailable|(?:off|stop).*heat|need.*heat/iu.test(
      text,
    )
  )
    return 'recipient'
  if (/who.*(?:care|maintain)|maintenance|look after/iu.test(text))
    return 'care'
  if (/lose|lost|loss|give up|displac/iu.test(text)) return 'loss'
  if (
    /another|elsewhere|alternative|move|smaller|size|footprint|other site/iu.test(
      text,
    )
  )
    return 'alternative'
  if (/roof|rooftop/iu.test(text)) return 'roof'
  if (/rain|flood|runoff|storm/iu.test(text)) return 'rain'
  if (/recycl|reclaim|wastewater supply/iu.test(text)) return 'recycled'
  if (/heat|warm/iu.test(text)) return 'heat'
  if (/water|cooling|coolant|drain/iu.test(text)) return 'water'
  if (/power|electric|energy/iu.test(text)) return 'power'
  if (/access|play|sport|team|public space|walk/iu.test(text)) return 'access'
  if (/construct|foundation|dust|concrete|building work/iu.test(text))
    return 'construction'
  if (
    /evidence|missing|verify|source|real|prove|measur|true|know|data/iu.test(
      text,
    )
  )
    return 'evidence'
  if (/next|compare|try/iu.test(text)) return 'next'
  if (
    /matter|priorit|worr|concern|think|protect|protest|oppose|support|hello|^hi[!. ]*$/iu.test(
      text,
    )
  )
    return 'priority'
  return undefined
}

/** Follow the answered topic, then offer unasked neighboring branches. */
export function poloDialogueChoices(
  voice: CommunityId,
  facts: PoloDiscussionFacts,
  history: readonly ConversationLine[],
): DialogueChoice[] {
  const questions = history.filter((line) => line.speaker === 'planner')
  const asked = new Set(
    questions.flatMap((line) => {
      const topic = poloDialogueTopic(line.text)
      return topic ? [topic] : []
    }),
  )
  const latest = questions.findLast((line) => poloDialogueTopic(line.text))
  const topic = latest ? poloDialogueTopic(latest.text) : undefined
  const related = topic ? [...NODES[topic].followups] : [...INITIAL[voice]]
  if (
    topic === 'benefit' &&
    (facts.scene.proposal !== 'heat_reuse_neighbors' || !facts.scene.preview)
  )
    related.splice(0, 1, 'alternative')
  const candidates = [...new Set([...related, ...INITIAL[voice], ...TOPICS])]
  return candidates
    .filter((id) => !asked.has(id))
    .slice(0, 3)
    .map((id) => ({
      ...NODES[id],
      kind: 'say' as const,
    }))
}

const PRIORITIES: Record<CommunityId, string> = {
  neighbor:
    'I want people to keep sharing this field. It is a place to meet and walk.',
  nature:
    'I care about living soil and lasting plant care. Drainage matters too.',
  student: 'I want our team to have a welcoming place to play and meet.',
  operator:
    'I want computing with clear resource and land costs. It must also be reliable.',
}
const BENEFITS: Record<CommunityId, string> = {
  neighbor:
    'Computing users could gain services. Neighbors would lose shared field space.',
  nature:
    'Computing users may gain services. Soil and field habitat would bear the land change.',
  student:
    'Computing users could gain services. This plan promises no jobs or training places for us.',
  operator:
    'The facility would serve computing users. Local jobs, revenue and permits are not established.',
}

/** Authored fictional answers refer to this person, chapter and active concept. */
export function poloDialogueReply(
  voice: CommunityId,
  question: string,
  facts: PoloDiscussionFacts,
  history: readonly ConversationLine[] = [],
): { text: string; topic: DiscussionTopic } {
  const id = poloDialogueTopic(question, history)
  const learned = activePoloLearnings(facts.scene)
  if (learned.length && id) {
    const target =
      id === 'water' || id === 'recycled'
        ? 'water'
        : id === 'heat'
          ? 'heat'
          : id === 'rain' || id === 'care'
            ? 'roof'
            : 'soil'
    const item = learned.find((entry) => entry.id === target) ?? learned[0]
    return {
      text:
        poloReactions(facts.scene).voices[voice].text +
        '\n\n' +
        (item ? item.action + ' ' + item.tradeoff : '') +
        '\n\nSavings are not quantified.',
      topic: NODES[id].topic,
    }
  }
  const improvements = poloImprovementSummary(facts.scene)
  if (improvements) {
    const resourceQuestion =
      id &&
      ['water', 'power', 'heat', 'rain', 'recycled', 'evidence'].includes(id)
    return {
      text:
        poloReactions(facts.scene).voices[voice].text +
        '\n\n' +
        (resourceQuestion
          ? 'Water, power and material quantities have not been recalculated for your construction changes. The original figures describe the original plan.'
          : improvements) +
        '\n\nThese changes do not restore the public playing field. Detailed design and safety checks still need review.',
      topic: id ? NODES[id].topic : 'other',
    }
  }
  if (!id)
    return {
      text: 'I don’t know enough to answer that. We can discuss this plan’s water, power, public space and benefits.',
      topic: 'other',
    }
  const { scene } = facts
  const active =
    scene.confirmed && scene.phase === 'M6' && scene.preview
      ? scene.proposal
      : null
  const stage = !scene.confirmed
    ? 'This is a placement preview. Nothing has been built.'
    : scene.phase === 'M0'
      ? 'In Today, people still use the field.'
      : scene.phase === 'M1'
        ? 'In Foundations, work replaces part of the turf.'
        : scene.phase === 'M4'
          ? 'In Structure, the frame and roof occupy part of the field.'
          : scene.phase === 'M5'
            ? 'In Commissioning, equipment is fitted; computing is still off.'
            : 'In Operating, computing needs cooling and electricity.'
  if (CONTINUATION.test(question.trim())) {
    const further: Record<PoloDialogueTopic, string> = {
      priority:
        PRIORITIES[voice] +
        '\n\nA place has existing users before it becomes a project. Benefits elsewhere do not establish their agreement or replace the same use.',
      benefit:
        active === 'heat_reuse_neighbors'
          ? 'Heat only benefits a recipient that can use it when it is available. No recipient means no delivery. That possible gain is separate from park users losing their field.'
          : 'Computing services and a public field serve different uses. The model does not establish a fair exchange or local jobs. We need to ask which people receive each gain and bear each loss.',
      loss: 'Remaining turf is not automatically a replacement pitch. Team space, safe access and the ability to meet need checking separately; an equal-looking green area may serve a different use.',
      water:
        !scene.confirmed || scene.phase === 'M0'
          ? 'Irrigation cares for the existing field. We cannot replace unknown park water use with zero just because campus cooling is inactive.'
          : 'Evaporation removes water from cooling. Blowdown controls circulating-water quality. Both need real supply and wastewater checks; a schematic pipe does not establish capacity.',
      power:
        'Useful computing is only part of facility electricity. Pumps, cooling and electrical losses also need power. A visual heat connection does not quantify those extra loads or prove a saving.',
      heat: 'The exchanger transfers energy, not the original coolant. A delivery loop takes heat to the recipient and returns cooler. Pumps need power; the original cooling system remains available.',
      recipient:
        'A recipient needs compatible temperatures and demand at useful times. A pipe alone does not create that demand. Storage or backup may be needed, but neither is sized in this concept.',
      roof: 'Planting does not make a roof a safely accessible playing field. Soil depth, roof load, drainage and access differ. No modeled result establishes that the public-space loss is repaired.',
      rain: 'A rainfall depth and a runoff volume describe different things. Neither tells us flood depth at a neighbor’s home. That would require a separate drainage and flood assessment.',
      recycled:
        'Recycled water still needs treatment and quality checks. Pumping matters too. Whether it displaces another source depends on a confirmed allocation and a workable connection, neither established here.',
      evidence:
        'An assumption helps us compare options. A survey, utility agreement or engineering calculation would provide different evidence. The plan still needs those checks.',
      alternative:
        'A smaller footprint changes the planning assumptions. Another location changes who and what may be affected. Both options still need a site assessment.',
      access:
        'A team needs a usable layout and safe access. A remaining patch of grass may not provide that. We have not established replacement capacity, opening hours or a public-access agreement.',
      care: 'Plants can fail without irrigation, inspections and replacement. A funded plan must name who does that work over time. Those commitments are not supplied by the green rendering.',
      construction:
        'Count each construction allowance once. Selected water, diesel and electricity figures cover their named stages, not every activity.',
      next: 'Compare one change at the same stage and location. Then check what the model leaves unknown. That helps separate a plausible mechanism from a proven benefit.',
    }
    return { text: further[id], topic: NODES[id].topic }
  }
  let text: string
  switch (id) {
    case 'priority':
      text =
        PRIORITIES[voice] +
        '\n\n' +
        stage +
        '\n\n' +
        (active
          ? 'A better cooling idea still cannot restore the public field.'
          : 'We should compare the existing use before accepting the change.')
      break
    case 'benefit':
      text =
        BENEFITS[voice] +
        '\n\n' +
        (active === 'heat_reuse_neighbors'
          ? scene.recipientAvailable
            ? 'The proposed pool could receive useful heat. Actual savings are unknown; it does not restore the field.'
            : 'The pool is unavailable, so it receives no heat now. Original cooling stays active.'
          : active === 'recycled_water'
            ? 'Recycled supply could change the water source. Its availability and saved volume are unverified.'
            : active === 'green_roof'
              ? 'Roof plants may hold some rain and add habitat. Benefits are unquantified and the field stays lost.'
              : 'No local benefit is guaranteed. Shared space is a real use to compare with those possible gains.')
      break
    case 'loss':
      text =
        (voice === 'student'
          ? 'We lose room for team play and everyday meetings.'
          : voice === 'nature'
            ? 'Living turf and soil would be disturbed. Rainfall pathways would change too.'
            : voice === 'operator'
              ? 'The facility occupies land already used as a public playing field.'
              : 'People lose shared space for walking, sport and meeting.') +
        '\n\n' +
        stage +
        '\n\nA pool heat link, roof plants or training would not replace the same public field.'
      break
    case 'water':
      text =
        !scene.confirmed || scene.phase === 'M0'
          ? 'The field already needs irrigation. Its actual supply source is not established. Campus cooling is inactive in Today.'
          : scene.phase === 'M6'
            ? (active === 'recycled_water'
                ? 'The concept changes the source of cooling make-up water. Treatment, checks and a backup supply still matter.'
                : 'Make-up water supports cooling. Some evaporates; blowdown leaves as managed wastewater.') +
              ' Neither an actual utility connection nor its capacity is established.'
            : 'Construction water supports dust control and concrete work. The cards show selected stage budgets, not a full project inventory.'
      break
    case 'power':
      text =
        !scene.confirmed || scene.phase === 'M0'
          ? 'Existing park electricity use is unknown. An inactive campus does not mean the park uses no power.'
          : scene.phase === 'M6'
            ? 'Servers need a reliable electricity supply. Cooling, pumps and other supporting systems use electricity too.' +
              (active === 'heat_reuse_neighbors'
                ? ' Heat delivery adds an unquantified pump and possible heat-pump demand.'
                : ' Utility capacity and proposal savings are not established.')
            : 'Selected work stages use machinery and temporary services. Diesel and electricity are different budgets; neither is the whole project.'
      break
    case 'heat':
      text =
        'Heat moves through an exchanger to a separate loop. That supply-and-return loop serves a proposed pool. The liquids stay separate.' +
        '\n\n' +
        (active === 'heat_reuse_neighbors'
          ? scene.recipientAvailable
            ? 'The recipient is available now. Extra equipment and electricity are needed; backup cooling and heating remain.'
            : 'The recipient is off now. Heat delivery stops and original cooling rejects the heat.'
          : 'That link is a concept to try in Operating. It is not part of the original cooling arrangement.')
      break
    case 'recipient':
      text =
        active === 'heat_reuse_neighbors'
          ? scene.recipientAvailable
            ? 'Turn off the pool’s demand to test it. Delivery stops when no recipient is available; original cooling keeps computing running.'
            : 'The pool is unavailable now, so no heat is delivered. Computing continues with original cooling.'
          : 'Without a suitable recipient, there is no useful heat delivery. The original cooling system must still reject server heat.'
      text +=
        '\n\nThe pool and connection are proposed. The recipient’s demand still needs checking.'
      break
    case 'roof':
      text =
        'No, a planted roof is not a public sports field. It has vegetation, substrate and drainage, with structural and access needs.' +
        '\n\n' +
        (active === 'green_roof'
          ? 'The active roof concept can hold some rain temporarily, then drains. It does not restore the lost field.'
          : 'Try the roof concept in Operating to inspect those layers. Its benefits remain unquantified.')
      break
    case 'rain':
      text =
        'We cannot claim that this prevents flooding. The replay compares the same storm assumptions and selected surfaces.' +
        '\n\n' +
        (active === 'green_roof'
          ? 'Roof plants may hold some rain temporarily, but they still drain. No retention saving or flood depth is calculated.'
          : 'Runoff is water leaving a surface. It is not a prediction of neighborhood flooding or lake pollution.')
      break
    case 'recycled':
      text =
        'It could change the source of make-up water. It does not remove the cooling need or automatically save a known volume.' +
        '\n\n' +
        (active === 'recycled_water'
          ? 'You are viewing that concept now. Its source, treatment, delivery line and backup need verification.'
          : 'The recycled-water concept is available in Operating. Actual supply, allocation and quality still need checking.')
      break
    case 'evidence':
      text =
        'We need site, utility and planning evidence. That includes surveys, water supply and permission to build. Proposal performance needs engineering evidence.' +
        '\n\n' +
        (active === 'heat_reuse_neighbors'
          ? 'Heat delivery also needs a real recipient, demand profile, temperatures and a viable route.'
          : active === 'green_roof'
            ? 'A planted roof also needs load, drainage, maintenance and access checks.'
            : active === 'recycled_water'
              ? 'Recycled supply also needs a confirmed allocation, treatment and water-quality checks.'
              : 'The plan uses assumptions. Moving the campus does not produce a new site assessment.')
      break
    case 'alternative':
      text =
        (voice === 'operator'
          ? 'Yes, compare a smaller footprint or a different site. Do that before accepting this plan.'
          : 'Yes, keeping the field is a meaningful alternative. We can examine another site or a smaller footprint.') +
        '\n\nMoving or resizing the campus does not establish a permit, surveyed boundary or a viable alternative site.'
      break
    case 'access':
      text =
        voice === 'student'
          ? 'The campus removes part of our playing space. We cannot assume the remaining area supports the same team activities.'
          : 'Existing public use needs to be assessed. Remaining turf or a path does not guarantee the same sporting access.'
      text +=
        '\n\nNo replacement playing field or public access agreement is established in this scenario.'
      break
    case 'care':
      text =
        'A roof operator needs a funded maintenance plan. It covers plant care, drainage, safe access and any irrigation.' +
        '\n\nNo responsible organization or maintenance agreement is established here. A greener rendering does not provide that care.'
      break
    case 'construction':
      text =
        stage +
        '\n\n' +
        (!scene.confirmed || scene.phase === 'M0'
          ? 'If confirmed, the story follows ground works, foundations, structure, fit-out and operation.'
          : scene.phase === 'M6'
            ? 'Construction has reached the operating chapter. Proposed pipes or roof work would introduce additional work, not erase earlier disturbance.'
            : 'The selected chapter changes the same footprint. Replay shows the work again; it does not add a second budget.') +
        '\n\nPeople’s access, soil disturbance and resource demands deserve separate attention.'
      break
    case 'next':
      text =
        active === 'heat_reuse_neighbors'
          ? 'Compare original cooling with heat reuse first. Then turn the recipient off. Ask what still works and who could benefit.'
          : active === 'recycled_water'
            ? 'Compare the original supply with the recycled concept. Then check the unverified source, quality and backup needs.'
            : active === 'green_roof'
              ? 'Compare the original roof with planting during the same rain. Keep roof retention separate from restoring public space.'
              : scene.confirmed && scene.phase === 'M6'
                ? 'Compare one Operating concept with the original arrangement. Then ask about public space and the evidence still missing.'
                : 'Follow the next chapter, or compare a different footprint. Keep existing field users in the discussion.'
      break
  }
  return { text, topic: NODES[id].topic }
}
