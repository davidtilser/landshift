import './talk-picker.css'
import type { CommunityId } from '../../shared/community-contract.ts'
import type { ConversationReactions } from '../community-reactions.ts'
import type { PoloSceneState } from './model.ts'
import { PoloTalkFeed } from './talk-feed.ts'

export const POLO_TALK_PEOPLE = [
  { id: 'neighbor', avatar: 'maya', name: 'Maya', role: 'Park regular' },
  { id: 'nature', avatar: 'aisha', name: 'Aisha', role: 'Soil volunteer' },
  { id: 'student', avatar: 'leo', name: 'Leo', role: 'Young player' },
  { id: 'operator', avatar: 'owen', name: 'Owen', role: 'Campus designer' },
] as const

/** One people chooser and private-chat flow across all five chapters. */
export function setupPoloTalkPicker(
  root: HTMLElement,
  peopleControls: HTMLElement,
  getState: () => PoloSceneState,
  openPerson: (id: CommunityId) => void,
): {
  sync(restart?: boolean): void
  dismiss(): void
  attachChatFocus(): void
  setReactions(reactions: ConversationReactions): void
  destroy(): void
} {
  const launcher = document.createElement('button')
  launcher.type = 'button'
  launcher.className = 'polo-talk-launcher'
  launcher.setAttribute('aria-haspopup', 'dialog')
  launcher.setAttribute('aria-controls', 'polo-talk-picker')
  launcher.setAttribute('aria-expanded', 'false')
  launcher.setAttribute('aria-label', 'Talk · Hear all four perspectives')
  launcher.innerHTML =
    '<span class="polo-talk-top"><strong>Talk <span aria-hidden="true">↗</span></strong></span><span class="polo-talk-preview" role="status" aria-live="polite" aria-atomic="true"><span class="polo-talk-waiting">Hear different perspectives<span class="polo-talk-typing" aria-hidden="true"><i></i><i></i><i></i></span></span></span><span class="polo-talk-footer"><span class="polo-talk-faces" aria-hidden="true"></span><span>Meet all 4 <span aria-hidden="true">→</span></span></span>'
  const preview = launcher.querySelector('.polo-talk-preview')
  const feed = new PoloTalkFeed()
  let reactionTimer: ReturnType<typeof setTimeout> | undefined
  let destroyed = false
  let hovered = false
  let focused = false
  const faceImages = new Map<CommunityId, HTMLImageElement>()
  const faces = launcher.querySelector('.polo-talk-faces')
  for (const person of POLO_TALK_PEOPLE) {
    const image = document.createElement('img')
    image.src = '/avatars/' + person.avatar + '.png'
    image.alt = ''
    image.width = image.height = 32
    faceImages.set(person.id, image)
    faces?.append(image)
  }
  peopleControls.append(launcher)

  function showNextReaction(): void {
    if (destroyed || !active() || !feed.remaining) return
    // Keep a reaction readable while someone inspects the card or a conversation.
    if (
      document.hidden ||
      hovered ||
      focused ||
      root.querySelector('dialog[open]') ||
      root.querySelector('.community-open')
    ) {
      reactionTimer = setTimeout(showNextReaction, 1000)
      return
    }
    const opinion = feed.next()
    if (!opinion || !preview) return
    const person = POLO_TALK_PEOPLE.find((item) => item.id === opinion.id)
    const reaction = document.createElement('span')
    reaction.className = 'polo-talk-reaction'
    const byline = document.createElement('span')
    byline.className = 'polo-talk-byline'
    const avatar = document.createElement('img')
    avatar.src = `/avatars/${opinion.avatar}.png`
    avatar.alt = ''
    avatar.width = avatar.height = 48
    const identity = document.createElement('span')
    const name = document.createElement('strong')
    name.textContent = opinion.name
    const role = document.createElement('span')
    role.textContent = person?.role ?? ''
    identity.append(name, role)
    byline.append(avatar, identity)
    const quote = document.createElement('span')
    quote.className = 'polo-talk-quote'
    quote.textContent = `“${opinion.text}”`
    reaction.append(byline, quote)
    preview.replaceChildren(reaction)
    for (const [id, image] of faceImages)
      image.classList.toggle('is-speaking', id === opinion.id)
    if (feed.remaining) reactionTimer = setTimeout(showNextReaction, 6500)
  }
  launcher.addEventListener('mouseenter', () => {
    hovered = true
  })
  launcher.addEventListener('mouseleave', () => {
    hovered = false
  })
  launcher.addEventListener('focus', () => {
    focused = true
  })
  launcher.addEventListener('blur', () => {
    focused = false
  })

  const picker = document.createElement('dialog')
  picker.className = 'polo-talk-picker'
  picker.id = 'polo-talk-picker'
  picker.setAttribute('aria-labelledby', 'polo-talk-title')
  picker.innerHTML =
    '<header class="polo-talk-heading"><h2 id="polo-talk-title">Who would you like to talk to?</h2><button type="button" class="polo-talk-close" aria-label="Close people chooser">×</button></header><div class="polo-talk-grid"></div>'
  const grid = picker.querySelector('.polo-talk-grid')
  const choices = new Map<CommunityId, HTMLButtonElement>()
  for (const person of POLO_TALK_PEOPLE) {
    const choice = document.createElement('button')
    choice.type = 'button'
    choice.className = 'polo-talk-choice'
    choice.setAttribute(
      'aria-label',
      'Talk privately to ' + person.name + ', ' + person.role.toLowerCase(),
    )
    choice.innerHTML =
      '<img src="/avatars/' +
      person.avatar +
      '.png" alt="" width="72" height="72"><strong>' +
      person.name +
      '</strong><span>' +
      person.role +
      '</span>'
    choice.addEventListener('click', () => {
      dismiss()
      openPerson(person.id)
    })
    choices.set(person.id, choice)
    grid?.append(choice)
  }
  root.querySelector('.polo-studio')?.append(picker)

  let privateChat: HTMLDialogElement | undefined
  const active = (): boolean => getState().confirmed
  function open(): void {
    if (!active()) return
    if (!picker.open) picker.showModal()
    launcher.setAttribute('aria-expanded', 'true')
    picker.querySelector<HTMLButtonElement>('.polo-talk-choice')?.focus()
  }
  function dismiss(): void {
    if (picker.open) picker.close()
    launcher.setAttribute('aria-expanded', 'false')
  }
  launcher.addEventListener('click', open)
  picker.querySelector('.polo-talk-close')?.addEventListener('click', dismiss)
  picker.addEventListener('close', () => {
    launcher.setAttribute('aria-expanded', 'false')
  })
  picker.addEventListener('click', (event) => {
    if (event.target !== picker) return
    const box = picker.getBoundingClientRect()
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      dismiss()
  })

  return {
    sync(restart = false): void {
      launcher.hidden = !active()
      if (!active()) dismiss()
      if (!feed.sync(getState(), restart)) return
      clearTimeout(reactionTimer)
      for (const image of faceImages.values())
        image.classList.remove('is-speaking')
      if (preview)
        preview.innerHTML =
          '<span class="polo-talk-waiting">People are sharing their thoughts<span class="polo-talk-typing" aria-hidden="true"><i></i><i></i><i></i></span></span>'
      if (active()) reactionTimer = setTimeout(showNextReaction, 1200)
    },
    dismiss,
    setReactions(reactions): void {
      for (const person of POLO_TALK_PEOPLE) {
        const choice = choices.get(person.id)
        if (!choice) continue
        const reaction = reactions.get(person.id)
        if (reaction) {
          choice.dataset['mood'] = reaction.mood
          const scope =
            reaction.scope === 'private'
              ? 'From your private chat, visible only to you'
              : 'From the Community discussion'
          choice.title = `${person.name} · ${scope}: ${reaction.text}`
        } else {
          delete choice.dataset['mood']
          choice.title = `Talk to ${person.name}`
        }
      }
    },
    attachChatFocus(): void {
      const dialog = root.querySelector('.character-chat')
      if (!(dialog instanceof HTMLDialogElement) || privateChat) return
      privateChat = dialog
      dialog.addEventListener('close', restoreFocus)
    },
    destroy(): void {
      destroyed = true
      clearTimeout(reactionTimer)
      privateChat?.removeEventListener('close', restoreFocus)
      picker.remove()
      launcher.remove()
    },
  }

  function restoreFocus(): void {
    if (active() && !root.querySelector('dialog[open]')) launcher.focus()
  }
}
