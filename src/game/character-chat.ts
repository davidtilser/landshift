import './character-chat.css'
import { insertBeforeMapCredits } from './map-credits.ts'
import {
  authoredPrivateCommunityReply,
  privateReplyWithTyping,
} from './community-replies.ts'
import { messageUiText } from './ui-text.ts'
import { dialogueChoices } from './dialogue-choices.ts'
import type { DialogueChoice, DialogueTarget } from './dialogue-choices.ts'
import type { DiscussionContext, DiscussionTopic } from './discussion.ts'
import type { CommunityId, PlannerState } from '../shared/community-contract.ts'
import type { CommunityProfile } from './community-profiles.ts'
import type { CommunityClient } from './community-client.ts'
import type { CommunitySession, CommunityThread } from './community-session.ts'

const PORTRAITS: Record<CommunityId | 'planner', string> = {
  neighbor: 'maya',
  nature: 'aisha',
  student: 'leo',
  operator: 'owen',
  planner: 'community-guide',
}
export function communityAvatarPath(id: CommunityId | 'planner'): string {
  return '/avatars/' + PORTRAITS[id] + '.png'
}
export function setCommunityAvatar(
  element: HTMLElement,
  id: CommunityId | 'planner',
  fallback: string,
): void {
  element.textContent = fallback
  const image = document.createElement('img')
  image.src = communityAvatarPath(id)
  image.alt = ''
  image.addEventListener(
    'error',
    () => {
      image.remove()
    },
    { once: true },
  )
  element.append(image)
}

interface ChatOptions {
  getContext: () => DiscussionContext
  getPlan: () => PlannerState
  tryIdea: (target: DialogueTarget) => void
  beforeOpen: () => void
  client: CommunityClient
  session: CommunitySession
}
interface Pending {
  controller: AbortController
  thread: CommunityThread
  lineId: number | undefined
  message: string
}

/** Original bubble conversation popup, with live replies and independent private memory. */
export class CharacterChat {
  private readonly dialog = document.createElement('dialog')
  private readonly options: ChatOptions
  private readonly title: HTMLElement
  private readonly avatar: HTMLElement
  private readonly subtitle: HTMLElement
  private readonly list: HTMLElement
  private readonly promptList: HTMLElement
  private readonly input: HTMLInputElement
  private readonly send: HTMLButtonElement
  private readonly status: HTMLElement
  private readonly composer: HTMLDetailsElement
  private readonly logResizeObserver: ResizeObserver
  private followBottom = true
  private logWidth = 0
  private logHeight = 0
  private profile: CommunityProfile | undefined
  private pending: Pending | undefined
  private error = ''
  private destroyed = false
  private renderedProfile: CommunityId | undefined
  private readonly renderedLines = new Map<
    number,
    { text: string; element: HTMLElement }
  >()

  constructor(options: ChatOptions) {
    this.options = options
    this.dialog.className = 'character-chat is-conversation'
    this.dialog.setAttribute('aria-labelledby', 'chat-person-name')
    this.dialog.innerHTML =
      '<header class="chat-header"><span class="chat-avatar" aria-hidden="true"></span><div><span class="chat-label">MEET YOUR NEIGHBORS</span><h2 id="chat-person-name"></h2><p class="chat-subtitle"></p></div><button type="button" class="chat-close" aria-label="Close private conversation">×</button></header><div class="chat-messages" role="log" aria-label="Private dialogue" aria-live="polite" aria-relevant="additions text"></div><p class="dialogue-prompt">KEEP TALKING <span>Choose a follow-up · 1 / 2 / 3</span></p><div class="chat-prompts" role="group" aria-label="Choose your dialogue"></div><div class="chat-status" role="status"></div><details class="chat-custom" open><summary>Write your own reply</summary><form class="chat-composer"><label for="chat-question" class="sr-only">Your private message</label><input id="chat-question" maxlength="600" autocomplete="off" placeholder="What would you like to ask?"><button type="submit" aria-label="Send private message">↑</button></form></details><footer class="chat-footer"><span>Private conversation · not shared to Community</span><button type="button" class="chat-back">Back to map ↗</button></footer>'
    const get = <T extends HTMLElement>(
      selector: string,
      type: { new (): T },
    ): T => {
      const element = this.dialog.querySelector(selector)
      if (!(element instanceof type))
        throw new Error('Missing private chat control: ' + selector)
      return element
    }
    this.title = get('#chat-person-name', HTMLElement)
    this.avatar = get('.chat-avatar', HTMLElement)
    this.subtitle = get('.chat-subtitle', HTMLElement)
    this.list = get('.chat-messages', HTMLElement)
    this.promptList = get('.chat-prompts', HTMLElement)
    this.input = get('#chat-question', HTMLInputElement)
    this.send = get('button[type="submit"]', HTMLButtonElement)
    this.status = get('.chat-status', HTMLElement)
    this.composer = get('.chat-custom', HTMLDetailsElement)
    this.list.addEventListener('scroll', this.onLogScroll, { passive: true })
    this.logResizeObserver = new ResizeObserver(() => {
      this.logWidth = this.list.clientWidth
      this.logHeight = this.list.clientHeight
      if (this.followBottom && this.dialog.open && !this.destroyed)
        this.list.scrollTop = this.list.scrollHeight
    })
    this.logResizeObserver.observe(this.list)
    get('.chat-close', HTMLButtonElement).addEventListener('click', () => {
      this.dialog.close()
    })
    get('.chat-back', HTMLButtonElement).addEventListener('click', () => {
      this.dialog.close()
    })
    this.dialog.addEventListener('close', () => {
      this.cancel()
    })
    get('form', HTMLFormElement).addEventListener('submit', (event) => {
      event.preventDefault()
      void this.submit(this.input.value)
    })
    this.input.addEventListener('input', () => {
      const current = this.currentThread()
      if (current) current.draft = this.input.value
      this.send.disabled = Boolean(this.pending) || !this.input.value.trim()
    })
    this.composer.addEventListener('toggle', () => {
      if (this.composer.open && this.dialog.open) this.input.focus()
    })
    this.promptList.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return
      const button = event.target.closest('button')
      if (button) this.choose(Number(button.dataset['choiceIndex']))
    })
    this.dialog.addEventListener('keydown', (event) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return
      if (/^[123]$/.test(event.key)) {
        event.preventDefault()
        this.choose(Number(event.key) - 1)
      }
    })
    this.dialog.addEventListener('click', (event) => {
      if (event.target !== this.dialog) return
      const box = this.dialog.getBoundingClientRect()
      if (
        event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom
      )
        this.dialog.close()
    })
    const studio = document.querySelector('.studio')
    if (studio) insertBeforeMapCredits(studio, this.dialog)
    else document.body.append(this.dialog)
  }
  open(profile: CommunityProfile): void {
    if (this.destroyed) return
    this.cancel()
    this.options.beforeOpen()
    this.profile = profile
    this.followBottom = true
    this.error = ''
    this.refresh()
    this.composer.open = true
    this.render()
    if (!this.dialog.open) this.dialog.showModal()
    if (this.currentThread()?.freeText) this.input.focus()
    else this.promptList.querySelector<HTMLButtonElement>('button')?.focus()
  }
  sync(profiles: CommunityProfile[]): void {
    if (!this.profile || !this.dialog.open) return
    this.profile = profiles.find((profile) => profile.id === this.profile?.id)
    this.cancel()
    this.refresh()
    this.render()
  }
  private refresh(): void {
    const profile = this.profile
    const current = this.currentThread()
    if (
      !profile ||
      !current ||
      current.revision === this.options.session.revision
    )
      return
    this.options.session.append(current, [
      {
        speaker: 'planner',
        text: 'Plan updated · let’s look again.',
        source: 'scenario',
        kind: 'update',
      },
      { speaker: profile.id, text: profile.post, source: 'scenario' },
    ])
    current.revision = this.options.session.revision
    current.topic = undefined
  }
  private currentThread(): CommunityThread | undefined {
    return this.profile
      ? this.options.session.privateThread(this.profile)
      : undefined
  }
  private choices(): DialogueChoice[] {
    if (this.options.getContext().polo && this.profile)
      return dialogueChoices(
        this.profile.id,
        this.currentThread()?.topic,
        this.options.getContext(),
        this.currentThread()?.lines,
      )
    if (this.profile?.id === 'operator')
      return [
        {
          kind: 'say',
          topic: 'power',
          label: 'Why build a data center?',
          hint: 'Understand the need',
          icon: '⚡',
        },
        {
          kind: 'say',
          topic: 'water',
          label: 'What could we change?',
          hint: 'Compare water and power',
          icon: '💧',
        },
        {
          kind: 'try',
          target: 'move',
          label: 'Compare another site',
          hint: 'Try it on the map →',
          icon: '🧭',
        },
      ]
    return this.profile
      ? dialogueChoices(
          this.profile.id,
          this.currentThread()?.topic,
          this.options.getContext(),
        )
      : []
  }
  private render(): void {
    const profile = this.profile,
      current = this.currentThread()
    if (!profile || !current) return
    this.title.textContent = profile.name
    setCommunityAvatar(this.avatar, profile.id, profile.icon)
    this.dialog.dataset['voice'] = profile.id
    this.composer.open = true
    const choices = this.choices()
    this.promptList.hidden = choices.length === 0
    const prompt = this.dialog.querySelector<HTMLElement>('.dialogue-prompt')
    if (prompt) prompt.hidden = choices.length === 0
    if (this.renderedProfile !== profile.id) {
      this.list.replaceChildren()
      this.renderedLines.clear()
      this.renderedProfile = profile.id
    }
    const ids = new Set(current.lines.map((line) => line.id))
    for (const [id, cached] of this.renderedLines) {
      if (!ids.has(id)) {
        cached.element.remove()
        this.renderedLines.delete(id)
      }
    }
    const latestAssistant = current.lines.findLastIndex(
      (line) => line.speaker !== 'planner',
    )
    for (const line of current.lines) {
      const cached = this.renderedLines.get(line.id)
      if (cached?.text === line.text) continue
      const role =
        line.kind === 'update'
          ? 'notice'
          : line.speaker === 'planner'
            ? 'user'
            : 'assistant'
      const speaker =
        role === 'notice'
          ? 'Plan update'
          : role === 'user'
            ? 'You'
            : profile.name
      const element = messageUiText(line.text, 'chat-message ' + role)
      element.setAttribute('aria-label', speaker)
      cached?.element.replaceWith(element)
      if (element.parentElement !== this.list) this.list.append(element)
      this.renderedLines.set(line.id, { text: line.text, element })
    }
    const source = current.lines[latestAssistant]?.source
    this.subtitle.textContent = 'Private conversation'
    this.subtitle.title =
      source === 'live' ? 'AI-assisted reply' : 'Prepared conversation'
    this.promptList.replaceChildren()
    choices.forEach((choice, index) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'dialogue-choice ' + choice.kind
      button.dataset['choiceIndex'] = String(index)
      button.setAttribute('aria-keyshortcuts', String(index + 1))
      button.disabled = Boolean(this.pending)
      const icon = document.createElement('span')
      icon.className = 'dialogue-choice-icon'
      icon.textContent = choice.icon
      icon.setAttribute('aria-hidden', 'true')
      const copy = document.createElement('span'),
        title = document.createElement('strong'),
        hint = document.createElement('small')
      title.textContent = choice.label
      hint.textContent = choice.hint
      copy.append(title, hint)
      const key = document.createElement('kbd')
      key.textContent = String(index + 1)
      key.setAttribute('aria-hidden', 'true')
      button.append(icon, copy, key)
      this.promptList.append(button)
    })
    this.status.replaceChildren(
      messageUiText(
        this.error || (this.pending ? profile.name + ' is typing…' : ''),
      ),
    )
    this.status.classList.toggle('is-typing', Boolean(this.pending))
    this.input.value = current.draft
    this.input.disabled = Boolean(this.pending)
    this.send.disabled = Boolean(this.pending) || !current.draft.trim()
    requestAnimationFrame(() => {
      if (this.list.isConnected && this.followBottom) {
        this.logWidth = this.list.clientWidth
        this.logHeight = this.list.clientHeight
        this.list.scrollTop = this.list.scrollHeight
      }
    })
  }
  private readonly onLogScroll = (): void => {
    // A responsive layout can emit scroll before ResizeObserver runs. Keep the
    // previous reading intent until that observer has handled the new viewport.
    if (
      this.list.clientWidth !== this.logWidth ||
      this.list.clientHeight !== this.logHeight
    )
      return
    this.followBottom =
      this.list.scrollHeight - this.list.clientHeight - this.list.scrollTop <=
      32
  }
  private choose(index: number): void {
    if (this.pending) return
    const choice = this.choices()[index]
    if (!choice) return
    if (choice.kind === 'try') {
      this.dialog.close()
      this.options.tryIdea(choice.target)
    } else void this.submit(choice.label, choice.topic)
  }
  private async submit(value: string, topic?: DiscussionTopic): Promise<void> {
    const current = this.currentThread(),
      profile = this.profile
    const message = value.trim().slice(0, 600)
    if (!current || !profile || !message || this.pending || this.destroyed)
      return
    this.followBottom = true
    if (topic === undefined) this.options.session.useFreeText(current)
    const history = this.options.session.history(current)
    const lineId = this.options.session.append(current, [
      { speaker: 'planner', text: message, source: 'planner' },
    ])[0]?.id
    const pending: Pending = {
      controller: new AbortController(),
      thread: current,
      lineId,
      message,
    }
    this.pending = pending
    current.draft = ''
    this.error = ''
    this.render()
    try {
      const request = {
        mode: 'private' as const,
        target: profile.id,
        plan: this.options.getPlan(),
        history,
        message,
      }
      const context = this.options.getContext()
      const authored =
        topic !== undefined
          ? authoredPrivateCommunityReply(request, context)
          : undefined
      const reply = await privateReplyWithTyping(
        () =>
          authored ??
          this.options.client.exchange(
            request,
            context,
            pending.controller.signal,
          ),
        pending.controller.signal,
      )
      if (!this.isCurrent(pending)) return
      this.options.session.append(
        current,
        reply.messages.map((line) => ({ ...line, source: reply.source })),
      )
      current.topic = topic
    } catch (error) {
      if (!this.isCurrent(pending)) return
      if (lineId !== undefined) this.options.session.remove(current, lineId)
      current.draft = message
      this.error =
        error instanceof Error
          ? error.message
          : 'That reply did not arrive. Try again.'
    } finally {
      if (this.pending === pending) {
        this.pending = undefined
        this.render()
        if (this.dialog.open) {
          if (topic === undefined) this.input.focus()
          else
            this.promptList.querySelector<HTMLButtonElement>('button')?.focus()
        }
      }
    }
  }
  private isCurrent(pending: Pending): boolean {
    return (
      this.pending === pending &&
      !pending.controller.signal.aborted &&
      !this.destroyed
    )
  }
  private cancel(): void {
    const pending = this.pending
    if (!pending) return
    this.pending = undefined
    pending.controller.abort()
    if (pending.lineId !== undefined)
      this.options.session.remove(pending.thread, pending.lineId)
    pending.thread.draft = pending.message
  }
  close(): void {
    this.cancel()
    this.dialog.close()
  }
  reset(): void {
    this.close()
    this.profile = undefined
    this.renderedLines.clear()
    this.renderedProfile = undefined
    this.followBottom = true
    this.error = ''
  }
  destroy(): void {
    this.destroyed = true
    this.reset()
    this.logResizeObserver.disconnect()
    this.list.removeEventListener('scroll', this.onLogScroll)
    this.dialog.remove()
  }
}
