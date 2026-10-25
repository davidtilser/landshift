import './talk-picker.css'
import type { CommunityId } from '../../shared/community-contract.ts'
import type { PoloSceneState } from './model.ts'

export const POLO_TALK_PEOPLE = [
  { id: 'neighbor', avatar: 'maya', name: 'Maya', role: 'Park regular' },
  { id: 'nature', avatar: 'aisha', name: 'Aisha', role: 'Soil volunteer' },
  { id: 'student', avatar: 'leo', name: 'Leo', role: 'Young player' },
  { id: 'operator', avatar: 'owen', name: 'Owen', role: 'Campus designer' },
] as const

/** Trial the people chooser in Foundations while preserving the existing chats. */
export function setupPoloTalkPicker(
  root: HTMLElement,
  peopleControls: HTMLElement,
  getState: () => PoloSceneState,
  openPerson: (id: CommunityId) => void,
): {
  sync(): void
  dismiss(): void
  attachChatFocus(): void
  destroy(): void
} {
  const launcher = document.createElement('button')
  launcher.type = 'button'
  launcher.className = 'polo-talk-launcher'
  launcher.setAttribute('aria-haspopup', 'dialog')
  launcher.setAttribute('aria-controls', 'polo-talk-picker')
  launcher.setAttribute('aria-expanded', 'false')
  launcher.innerHTML =
    '<span class="polo-talk-launcher-copy"><strong>Talk <span aria-hidden="true">↗</span></strong><span>Hear four perspectives</span></span><span class="polo-talk-faces" aria-hidden="true"></span>'
  const faces = launcher.querySelector('.polo-talk-faces')
  for (const person of POLO_TALK_PEOPLE) {
    const image = document.createElement('img')
    image.src = '/avatars/' + person.avatar + '.png'
    image.alt = ''
    image.width = image.height = 32
    faces?.append(image)
  }
  peopleControls.append(launcher)

  const picker = document.createElement('dialog')
  picker.className = 'polo-talk-picker'
  picker.id = 'polo-talk-picker'
  picker.setAttribute('aria-labelledby', 'polo-talk-title')
  picker.innerHTML =
    '<header class="polo-talk-heading"><h2 id="polo-talk-title">Who would you like to talk to?</h2><button type="button" class="polo-talk-close" aria-label="Close people chooser">×</button></header><div class="polo-talk-grid"></div>'
  const grid = picker.querySelector('.polo-talk-grid')
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
    grid?.append(choice)
  }
  root.querySelector('.polo-studio')?.append(picker)

  let privateChat: HTMLDialogElement | undefined
  const active = (): boolean =>
    getState().confirmed && getState().phase === 'M1'
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
    sync(): void {
      launcher.hidden = !active()
      if (!active()) dismiss()
    },
    dismiss,
    attachChatFocus(): void {
      const dialog = root.querySelector('.character-chat')
      if (!(dialog instanceof HTMLDialogElement) || privateChat) return
      privateChat = dialog
      dialog.addEventListener('close', restoreFocus)
    },
    destroy(): void {
      privateChat?.removeEventListener('close', restoreFocus)
      picker.remove()
      launcher.remove()
    },
  }

  function restoreFocus(): void {
    if (active() && !root.querySelector('dialog[open]')) launcher.focus()
  }
}
