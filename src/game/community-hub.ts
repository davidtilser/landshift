import './community-hub.css'
import { messageUiText } from './ui-text.ts'
import { CharacterChat, setCommunityAvatar } from './character-chat.ts'
import { CommunityClient } from './community-client.ts'
import { CommunityAutoplay } from './community-autoplay.ts'
import { revealCommunityReplies } from './community-replies.ts'
import { CommunitySession } from './community-session.ts'
import type { CommunityLine } from './community-session.ts'
import { communityProfiles } from './community-profiles.ts'
import { MOOD_PRESENTATION } from './community-mood.ts'
import type { CommunityProfile } from './community-profiles.ts'
import { communityIdSchema } from '../shared/community-contract.ts'
import type {
  CommunityId,
  PlannerState,
  CommunityMood,
} from '../shared/community-contract.ts'
import type { CommunityVoice } from './community.ts'
import type { DiscussionContext } from './discussion.ts'
import type { DialogueTarget } from './dialogue-choices.ts'
import type { ConversationReactions } from './community-reactions.ts'

interface HubOptions {
  getContext: () => DiscussionContext
  getPlan: () => PlannerState
  tryIdea: (target: DialogueTarget) => void
  beforeOpen: () => void
  reactionsChanged?: (reactions: ConversationReactions) => void
  contributionCompleted?: (id: CommunityId | 'public') => void
}
interface Pending {
  controller: AbortController
  lineId: number | undefined
  message: string
  replyTo: number | undefined
  delivered: boolean
}
function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  element.className = className
  if (text !== undefined) element.textContent = text
  return element
}
function action(
  label: string,
  name: string,
  value?: string,
): HTMLButtonElement {
  const button = node('button', 'community-action', label)
  button.type = 'button'
  button.dataset['communityAction'] = name
  if (value !== undefined) button.dataset['value'] = value
  return button
}

/** Bubble clicks open the original private popup; Community owns just one public timeline. */
export class CommunityHub {
  private readonly options: HubOptions
  private readonly client = new CommunityClient()
  private readonly session: CommunitySession
  private readonly privateChat: CharacterChat
  private readonly autoplay: CommunityAutoplay
  private readonly root = node('aside', 'community-hub')
  private readonly launcher = action('◎ Community', 'open')
  private readonly timeline = node('div', 'community-timeline')
  private readonly status = node('div', 'community-status')
  private readonly engine = node('span', 'community-engine', 'Connecting…')
  private readonly moodList = node('div', 'community-moods')
  private readonly composer = node('div', 'community-compose-area')
  private profiles: CommunityProfile[] = []
  private selectedReply: number | undefined
  private pending: Pending | undefined
  private planKey = ''
  private error = ''
  private destroyed = false

  constructor(options: HubOptions) {
    this.options = options
    this.session = new CommunitySession(() => {
      options.reactionsChanged?.(this.session.bubbleReactions())
    })
    this.root.hidden = true
    this.root.id = 'community-hub'
    this.root.setAttribute('aria-label', 'Shared community discussion')
    const header = node('header', 'community-header')
    const heading = node('div', '')
    heading.append(
      node('span', 'community-eyebrow', 'ONE PLACE · DIFFERENT PERSPECTIVES'),
      node('h2', '', 'Community'),
    )
    const close = action('×', 'close')
    close.setAttribute('aria-label', 'Close community')
    header.append(heading, close)
    const context = node('div', 'community-context')
    context.append(node('span', '', 'One shared discussion'), this.engine)
    this.moodList.setAttribute('role', 'group')
    this.moodList.setAttribute(
      'aria-label',
      'Estimated crowd emotions, separate from Support out of 100',
    )
    this.timeline.setAttribute('role', 'log')
    this.timeline.setAttribute('aria-label', 'Public community thread')
    this.timeline.setAttribute('aria-live', 'polite')
    this.timeline.setAttribute('aria-relevant', 'additions')
    this.status.setAttribute('role', 'status')
    const footer = node('footer', 'community-footer')
    footer.append(
      this.status,
      this.composer,
      node(
        'p',
        'community-disclosure',
        'Public replies stay in this shared thread.',
      ),
    )
    this.root.append(header, context, this.moodList, this.timeline, footer)
    const studio = document.querySelector('.studio')
    if (!(studio instanceof HTMLElement))
      throw new Error('Missing game workspace')
    studio.append(this.root)
    this.launcher.className = 'text-button community-launch'
    this.launcher.setAttribute('aria-controls', this.root.id)
    this.launcher.setAttribute('aria-expanded', 'false')
    document.querySelector('.top-actions')?.prepend(this.launcher)
    this.launcher.addEventListener('click', () => {
      if (this.root.hidden) this.openPublic()
      else this.closePublic()
    })
    this.root.addEventListener('click', this.onClick)
    this.root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        this.closePublic()
      }
    })
    this.privateChat = new CharacterChat({
      ...options,
      client: this.client,
      session: this.session,
      beforeOpen: () => {
        this.closePublic(false)
        options.beforeOpen()
      },
    })
    this.autoplay = new CommunityAutoplay({
      run: async () => {
        const success = await this.submit('')
        return success && this.client.configured
      },
      canRun: () =>
        !this.destroyed &&
        !this.root.hidden &&
        !document.hidden &&
        !this.pending &&
        !this.session.publicThread.draft.trim() &&
        this.selectedReply === undefined,
      onIdle: () => {
        if (!this.destroyed) this.updateStatus()
      },
    })
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    void this.client.status().then(() => {
      if (!this.destroyed) this.renderMeta()
    })
  }
  sync(): void {
    if (this.destroyed) return
    const plan = this.options.getPlan(),
      key = JSON.stringify(plan)
    if (key === this.planKey) return
    this.autoplay.stop()
    this.cancel() // Cancel before appending plan updates; never roll an update back with an old reply.
    this.planKey = key
    this.profiles = communityProfiles(this.options.getContext())
    this.session.sync(plan, this.profiles)
    this.privateChat.sync(this.profiles)
    this.error = ''
    if (!this.root.hidden) {
      this.render(true)
      this.restartDiscussion(false)
    }
  }
  open(voice: CommunityVoice): void {
    this.openPerson(voice.id)
  }
  openPerson(id: CommunityId): void {
    this.sync()
    this.openPrivate(id)
  }
  private openPrivate(id: CommunityId): void {
    this.privateChat.open(this.profile(id))
  }
  private profile(id: CommunityId): CommunityProfile {
    const result = this.profiles.find((profile) => profile.id === id)
    if (!result) throw new Error('Missing community profile')
    return result
  }
  private openPublic(): void {
    this.privateChat.close()
    this.options.beforeOpen()
    this.sync()
    this.root.hidden = false
    document.querySelector('.studio')?.classList.add('community-open')
    this.launcher.setAttribute('aria-expanded', 'true')
    this.error = ''
    this.render(this.session.publicThread.lines.length > 5)
    this.root
      .querySelector<HTMLButtonElement>('.community-header button')
      ?.focus()
    this.restartDiscussion(true)
  }
  private closePublic(focus = true): void {
    this.autoplay.stop()
    this.cancel()
    this.root.hidden = true
    document.querySelector('.studio')?.classList.remove('community-open')
    this.launcher.setAttribute('aria-expanded', 'false')
    if (focus) this.launcher.focus()
  }
  private label(line: CommunityLine): string {
    return line.kind === 'update'
      ? 'Plan update'
      : line.speaker === 'planner'
        ? 'You · youth planner'
        : this.profile(line.speaker).name
  }
  private renderMeta(): void {
    this.engine.textContent = 'Community conversation'
    this.engine.title = this.client.configured
      ? this.client.model
      : 'Prepared replies are available while AI is not connected.'
    this.moodList.replaceChildren()
    const mood = this.session.publicMood
    if (mood) {
      const heading = node('div', 'community-mood-heading')
      heading.append(node('strong', '', 'Crowd emotions'))
      const bar = node('div', 'community-mood-bar'),
        values = node('div', 'community-mood-values')
      bar.setAttribute('aria-hidden', 'true')
      for (const key of [
        'concerned',
        'angry',
        'neutral',
        'hopeful',
      ] satisfies CommunityMood[]) {
        const presentation = MOOD_PRESENTATION[key],
          percent = String(mood[key]) + '%',
          segment = node('span', ''),
          badge = node('div', 'community-mood')
        segment.dataset['mood'] = key
        segment.style.width = percent
        badge.dataset['mood'] = key
        badge.setAttribute('aria-label', percent + ' ' + presentation.label)
        badge.append(
          node('strong', 'mood-value', percent),
          node(
            'span',
            'mood-name',
            presentation.emoji + ' ' + presentation.label,
          ),
        )
        bar.append(segment)
        values.append(badge)
      }
      const description =
        mood.reason +
        ' Modeled crowd reaction, not a real poll or approval rating. Emotion mix is separate from Support /100.'
      this.moodList.title = description
      this.moodList.setAttribute('aria-description', description)
      this.moodList.append(heading, bar, values)
    }
  }
  private updateStatus(): void {
    const text =
      this.error ||
      (this.pending
        ? 'The community is replying…'
        : this.session.publicThread.draft.trim() ||
            this.selectedReply !== undefined
          ? 'Your turn.'
          : this.autoplay.active
            ? 'The conversation continues…'
            : 'The community is listening. Add your voice.')
    this.status.replaceChildren(messageUiText(text))
  }
  private restartDiscussion(immediate: boolean): void {
    if (this.destroyed || this.root.hidden) return
    this.autoplay.start(immediate)
    this.updateStatus()
  }
  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.autoplay.stop()
      if (this.pending?.message === '') this.cancel()
    } else if (!this.root.hidden) this.restartDiscussion(false)
  }
  private render(scrollToEnd = false): void {
    this.renderMeta()
    const scroll = this.timeline.scrollTop
    this.timeline.replaceChildren()
    const lines = this.session.publicThread.lines
    for (const [index, line] of lines.entries()) {
      if (line.kind === 'update') {
        const update = node('article', 'community-plan-update')
        update.id = 'community-post-' + String(line.id)
        update.tabIndex = -1
        update.append(
          node('span', '', '↻ Plan update'),
          messageUiText(line.text),
        )
        this.timeline.append(update)
        continue
      }
      const post = node(
        'article',
        'community-post' + (index === 0 ? ' proposal-post' : ''),
      )
      post.id = 'community-post-' + String(line.id)
      post.tabIndex = -1
      const avatar =
        line.speaker === 'planner'
          ? node('span', 'community-avatar planner', '🧭')
          : action(this.profile(line.speaker).icon, 'private', line.speaker)
      avatar.classList.add('community-avatar')
      setCommunityAvatar(
        avatar,
        line.speaker,
        line.speaker === 'planner' ? '🧭' : this.profile(line.speaker).icon,
      )
      if (line.speaker !== 'planner') {
        avatar.classList.add(this.profile(line.speaker).color)
        avatar.setAttribute(
          'aria-label',
          'Private chat with ' + this.profile(line.speaker).name,
        )
      }
      const body = node('div', 'community-post-body'),
        head = node('div', 'community-post-head')
      head.append(node('strong', '', this.label(line)))
      const time = node(
        'time',
        '',
        new Intl.DateTimeFormat(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        }).format(line.createdAt),
      )
      time.dateTime = new Date(line.createdAt).toISOString()
      head.append(time)
      const source = node(
        'span',
        'community-source',
        index === 0
          ? 'WHAT IF · PROPOSAL'
          : line.source === 'scenario'
            ? 'Conversation starter'
            : line.source === 'planner'
              ? 'Your public reply'
              : 'Reply',
      )
      source.title =
        line.source === 'live'
          ? 'AI-assisted reply'
          : line.source === 'demo'
            ? 'Prepared reply'
            : ''
      body.append(head, source)
      if (line.replyTo !== undefined && line.replyTo !== lines[0]?.id) {
        const parent = lines.find((item) => item.id === line.replyTo)
        const quote = action(
          parent ? '↳ Replying to ' + this.label(parent) : '↳ Earlier post',
          'parent',
          String(line.replyTo),
        )
        quote.classList.add('community-reply-context')
        if (parent) quote.title = 'View original post'
        body.append(quote)
      }
      body.append(messageUiText(line.text, 'community-post-text'))
      const actions = node('div', 'community-post-actions')
      const reply = action('↩ Reply', 'reply', String(line.id))
      reply.setAttribute('aria-label', 'Reply to ' + this.label(line))
      actions.append(reply)
      if (line.speaker !== 'planner')
        actions.append(action('Message privately', 'private', line.speaker))
      body.append(actions)
      post.append(avatar, body)
      this.timeline.append(post)
    }
    this.updateStatus()
    this.renderComposer()
    requestAnimationFrame(() => {
      if (!this.root.hidden)
        this.timeline.scrollTop = scrollToEnd
          ? this.timeline.scrollHeight
          : scroll
    })
  }
  private renderComposer(): void {
    const current = this.session.publicThread
    this.composer.replaceChildren()
    const target = current.lines.find((line) => line.id === this.selectedReply)
    if (target) {
      const chip = node('div', 'community-reply-target')
      chip.append(node('span', '', 'Replying to ' + this.label(target)))
      const clear = action('×', 'clear-reply')
      clear.setAttribute('aria-label', 'Cancel reply target')
      chip.append(clear)
      this.composer.append(chip)
    }
    const form = node('form', 'community-composer'),
      label = node('label', 'sr-only', 'Your public reply')
    const input = node('textarea', '')
    input.id = 'community-reply'
    label.htmlFor = input.id
    input.rows = 2
    input.maxLength = 600
    input.value = current.draft
    input.placeholder = target ? 'Reply to this post…' : 'Add your voice…'
    input.disabled = Boolean(this.pending?.message)
    const send = node('button', 'community-send', 'Post ↗')
    send.type = 'submit'
    send.disabled = Boolean(this.pending?.message) || !current.draft.trim()
    input.addEventListener('input', () => {
      current.draft = input.value
      if (current.draft.trim()) {
        this.autoplay.stop()
        if (this.pending?.message === '') this.cancel()
      } else if (this.selectedReply === undefined && !this.pending)
        this.restartDiscussion(false)
      this.updateStatus()
      send.disabled = Boolean(this.pending?.message) || !current.draft.trim()
    })
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        if (!send.disabled) form.requestSubmit()
      }
    })
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      void this.postReply(input.value)
    })
    form.append(label, input, send)
    this.composer.append(form)
  }
  private async postReply(value: string): Promise<void> {
    if (!value.trim() || this.destroyed) return
    this.autoplay.stop()
    if (this.pending?.message === '') this.cancel()
    if (await this.submit(value)) this.restartDiscussion(false)
  }
  private async submit(value: string): Promise<boolean> {
    if (this.pending || this.destroyed) return false
    const message = value.trim().slice(0, 600),
      current = this.session.publicThread
    const parent =
      current.lines.find((line) => line.id === this.selectedReply) ??
      current.lines.findLast((line) => line.kind !== 'update')
    const history = this.session.history(current)
    const pending: Pending = {
      controller: new AbortController(),
      lineId: undefined,
      message,
      replyTo: this.selectedReply,
      delivered: false,
    }
    this.pending = pending
    this.error = ''
    let replyTo = parent?.id
    if (message) {
      pending.lineId = this.session.append(current, [
        {
          speaker: 'planner',
          text: message,
          source: 'planner',
          ...(replyTo !== undefined ? { replyTo } : {}),
        },
      ])[0]?.id
      replyTo = pending.lineId
      current.draft = ''
    }
    this.render(Boolean(message))
    try {
      const response = await this.client.exchange(
        {
          mode: 'discussion',
          target:
            parent?.speaker === 'planner'
              ? 'operator'
              : (parent?.speaker ?? 'neighbor'),
          plan: this.options.getPlan(),
          history,
          message,
          ...(this.session.publicMood
            ? { previousMood: this.session.publicMood }
            : {}),
          ...(parent
            ? { replyTo: { speaker: parent.speaker, text: parent.text } }
            : {}),
        },
        this.options.getContext(),
        pending.controller.signal,
      )
      if (!this.isCurrent(pending)) return false
      const complete = await revealCommunityReplies(
        response.messages,
        pending.controller.signal,
        (line) => {
          if (!this.isCurrent(pending)) return
          const added = this.session.replyPublic(
            [{ ...line, source: response.source }],
            replyTo,
          )
          // Keep every answer to an intervention attached to the player's post.
          // Autonomous exchanges still form a conversation between characters.
          if (!message) replyTo = added[0]?.id ?? replyTo
          pending.delivered = true
          this.render(true)
        },
      )
      if (!complete || !this.isCurrent(pending)) return false
      if (message) {
        this.selectedReply = undefined
        if (pending.delivered) this.options.contributionCompleted?.('public')
      }
      return true
    } catch (error) {
      if (!this.isCurrent(pending)) return false
      if (pending.lineId !== undefined)
        this.session.remove(current, pending.lineId)
      if (message) current.draft = message
      this.error = message
        ? error instanceof Error
          ? error.message
          : 'That reply did not arrive. Try again.'
        : 'The discussion paused for a moment. You can still post a reply.'
      return false
    } finally {
      if (this.pending === pending) {
        this.pending = undefined
        this.render(true)
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
    if (pending.lineId !== undefined && !pending.delivered)
      this.session.remove(this.session.publicThread, pending.lineId)
    if (pending.message && !pending.delivered) {
      this.session.publicThread.draft = pending.message
      this.selectedReply = pending.replyTo
    }
    if (pending.delivered) this.selectedReply = undefined
  }
  private readonly onClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest<HTMLButtonElement>(
      '[data-community-action]',
    )
    if (!button) return
    const value = button.dataset['value']
    switch (button.dataset['communityAction']) {
      case 'close':
        this.closePublic()
        break
      case 'private': {
        const id = communityIdSchema.safeParse(value)
        if (id.success) this.openPrivate(id.data)
        break
      }
      case 'reply':
        this.autoplay.stop()
        this.cancel()
        this.selectedReply = Number(value)
        this.render()
        this.root.querySelector('textarea')?.focus()
        break
      case 'clear-reply':
        this.selectedReply = undefined
        this.renderComposer()
        this.root.querySelector('textarea')?.focus()
        this.restartDiscussion(false)
        break
      case 'parent': {
        const parent = this.root.querySelector<HTMLElement>(
          '#community-post-' + String(Number(value)),
        )
        parent?.scrollIntoView({ block: 'center' })
        parent?.focus({ preventScroll: true })
        break
      }
      case 'open':
        this.openPublic()
        break
      case undefined:
      default:
        break
    }
  }
  reset(): void {
    this.autoplay.stop()
    this.cancel()
    this.privateChat.reset()
    this.session.reset()
    this.planKey = ''
    this.selectedReply = undefined
    this.error = ''
    this.closePublic()
  }
  destroy(): void {
    this.destroyed = true
    this.autoplay.stop()
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.cancel()
    this.privateChat.destroy()
    this.root.remove()
    this.launcher.remove()
    document.querySelector('.studio')?.classList.remove('community-open')
  }
}
