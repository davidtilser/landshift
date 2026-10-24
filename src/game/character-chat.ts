import type { CommunityVoice, VoiceId } from './community.ts'
import { dialogueChoices } from './dialogue-choices.ts'
import type { DialogueTarget } from './dialogue-choices.ts'
import { mockDiscussionProvider } from './discussion.ts'
import type {
  DiscussionContext,
  DiscussionProvider,
  DiscussionTurn,
  DiscussionTopic,
} from './discussion.ts'

interface ChatMessage {
  role: 'user' | 'assistant' | 'notice'
  text: string
}
interface Thread {
  messages: ChatMessage[]
  contextKey: string
  draft: string
  topic: DiscussionTopic | undefined
  pending: AbortController | undefined
}
interface ChatOptions {
  getContext: () => DiscussionContext
  tryIdea: (target: DialogueTarget) => void
  provider?: DiscussionProvider
}
function appendMessage(thread: Thread, message: ChatMessage): void {
  thread.messages = [...thread.messages.slice(-39), message]
}
export class CharacterChat {
  private readonly dialog = document.createElement('dialog')
  private readonly threads = new Map<VoiceId, Thread>()
  private readonly options: ChatOptions
  private readonly provider: DiscussionProvider
  private readonly title: HTMLElement
  private readonly avatar: HTMLElement
  private readonly list: HTMLElement
  private readonly promptList: HTMLElement
  private readonly input: HTMLInputElement
  private readonly send: HTMLButtonElement
  private readonly status: HTMLElement
  private readonly composer: HTMLDetailsElement
  private readonly history: HTMLDetailsElement
  private readonly transcript: HTMLElement
  private voice: CommunityVoice | undefined
  private destroyed = false

  constructor(options: ChatOptions) {
    this.options = options
    this.provider = options.provider ?? mockDiscussionProvider
    this.dialog.className = 'character-chat'
    this.dialog.setAttribute('aria-labelledby', 'chat-person-name')
    this.dialog.innerHTML =
      '<header class="chat-header"><span class="chat-avatar" aria-hidden="true"></span><div><span class="chat-label">MEET YOUR NEIGHBORS</span><h2 id="chat-person-name"></h2><p>Fictional character · scripted demo</p></div><button type="button" class="chat-close" aria-label="Close conversation">×</button></header><div class="chat-messages" role="log" aria-label="Current dialogue" aria-live="polite" aria-relevant="additions text"></div><p class="dialogue-prompt">YOUR MOVE <span>Choose a line · 1 / 2 / 3</span></p><div class="chat-prompts" role="group" aria-label="Choose your dialogue"></div><p class="chat-status" role="status"></p><details class="chat-custom"><summary>Ask your own question</summary><form class="chat-composer"><label for="chat-question" class="sr-only">Ask this character about your plan</label><input id="chat-question" maxlength="600" autocomplete="off" placeholder="Ask about your plan…"><button type="submit" aria-label="Send message">↑</button></form></details><details class="chat-history" hidden><summary>Earlier dialogue</summary><div class="chat-transcript"></div></details><footer class="chat-footer"><span>Explore an idea. You choose what to build.</span><button type="button" class="chat-back">Back to map ↗</button></footer>'
    const get = <T extends HTMLElement>(
      selector: string,
      type: { new (): T },
    ): T => {
      const element = this.dialog.querySelector(selector)
      if (!(element instanceof type))
        throw new Error('Missing chat control: ' + selector)
      return element
    }
    this.title = get('#chat-person-name', HTMLElement)
    this.avatar = get('.chat-avatar', HTMLElement)
    this.list = get('.chat-messages', HTMLElement)
    this.promptList = get('.chat-prompts', HTMLElement)
    this.input = get('#chat-question', HTMLInputElement)
    this.send = get('button[type="submit"]', HTMLButtonElement)
    this.status = get('.chat-status', HTMLElement)
    this.composer = get('.chat-custom', HTMLDetailsElement)
    this.history = get('.chat-history', HTMLDetailsElement)
    this.transcript = get('.chat-transcript', HTMLElement)
    this.composer.addEventListener('toggle', () => {
      if (this.composer.open) this.input.focus()
    })
    get('.chat-close', HTMLButtonElement).addEventListener('click', () => {
      this.dialog.close()
    })
    get('.chat-back', HTMLButtonElement).addEventListener('click', () => {
      this.dialog.close()
    })
    get('form', HTMLFormElement).addEventListener('submit', (event) => {
      event.preventDefault()
      void this.submit()
    })
    this.input.addEventListener('input', () => {
      const thread = this.currentThread()
      if (thread) thread.draft = this.input.value
      this.send.disabled = Boolean(thread?.pending) || !this.input.value.trim()
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
      if (event.target === this.dialog) {
        const rect = this.dialog.getBoundingClientRect()
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          this.dialog.close()
      }
    })
    document.querySelector('.studio')?.append(this.dialog)
  }

  open(voice: CommunityVoice): void {
    if (this.destroyed) return
    const contextKey = JSON.stringify(this.options.getContext())
    let thread = this.threads.get(voice.id)
    if (!thread) {
      thread = {
        messages: [{ role: 'assistant', text: voice.quote }],
        contextKey,
        draft: '',
        topic: undefined,
        pending: undefined,
      }
      this.threads.set(voice.id, thread)
    } else if (thread.contextKey !== contextKey) {
      thread.contextKey = contextKey
      appendMessage(thread, {
        role: 'notice',
        text: 'Plan updated · let’s look again.',
      })
      appendMessage(thread, { role: 'assistant', text: voice.quote })
      thread.topic = undefined
    }
    this.voice = voice
    this.composer.open = false
    this.history.open = false
    this.render()
    if (!this.dialog.open) this.dialog.showModal()
    this.focusChoice()
  }

  private currentThread(): Thread | undefined {
    return this.voice ? this.threads.get(this.voice.id) : undefined
  }

  private render(): void {
    const voice = this.voice
    const thread = this.currentThread()
    if (!voice || !thread) return
    this.title.textContent = voice.name
    this.avatar.textContent = voice.icon
    this.dialog.dataset['voice'] = voice.id
    this.list.replaceChildren()
    this.transcript.replaceChildren()
    const assistantIndex = thread.messages.findLastIndex(
      (item) => item.role === 'assistant',
    )
    const userIndex = thread.messages.findLastIndex(
      (item) => item.role === 'user',
    )
    const noticeIndex = thread.messages.findLastIndex(
      (item) => item.role === 'notice',
    )
    const visible = new Set([
      assistantIndex,
      userIndex > noticeIndex ? userIndex : -1,
      noticeIndex,
    ])
    for (const [index, message] of thread.messages.entries()) {
      const item = document.createElement('p')
      item.className = 'chat-message ' + message.role
      item.textContent = message.text
      if (message.role !== 'notice')
        item.setAttribute(
          'aria-label',
          (message.role === 'user' ? 'You: ' : voice.name + ': ') +
            message.text,
        )
      if (visible.has(index)) this.list.append(item)
      else this.transcript.append(item)
    }
    this.history.hidden = !this.transcript.childElementCount
    this.promptList.replaceChildren()
    const choices = dialogueChoices(
      voice.id,
      thread.topic,
      this.options.getContext(),
    )
    choices.forEach((choice, index) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.dataset['choiceIndex'] = String(index)
      button.className = 'dialogue-choice ' + choice.kind
      button.setAttribute('aria-keyshortcuts', String(index + 1))
      const icon = document.createElement('span')
      icon.className = 'dialogue-choice-icon'
      icon.setAttribute('aria-hidden', 'true')
      icon.textContent = choice.icon
      const copy = document.createElement('span')
      const title = document.createElement('strong')
      title.textContent = choice.label
      const hint = document.createElement('small')
      hint.textContent = choice.hint
      copy.append(title, hint)
      const key = document.createElement('kbd')
      key.textContent = String(index + 1)
      key.setAttribute('aria-hidden', 'true')
      button.append(icon, copy, key)
      button.disabled = Boolean(thread.pending)
      this.promptList.append(button)
    })
    this.status.textContent = thread.pending ? voice.name + ' is replying…' : ''
    this.input.value = thread.draft
    this.input.disabled = Boolean(thread.pending)
    this.send.disabled = Boolean(thread.pending) || !thread.draft.trim()
    this.list.scrollTop = this.list.scrollHeight
  }

  private focusChoice(): void {
    if (this.composer.open) this.input.focus()
    else this.promptList.querySelector<HTMLButtonElement>('button')?.focus()
  }

  private choose(index: number): void {
    const voice = this.voice
    const thread = this.currentThread()
    if (!voice || !thread || thread.pending) return
    const choice = dialogueChoices(
      voice.id,
      thread.topic,
      this.options.getContext(),
    )[index]
    if (!choice) return
    if (choice.kind === 'try') {
      this.dialog.close()
      this.options.tryIdea(choice.target)
    } else void this.submit(choice.label, choice.topic)
  }

  private async submit(
    value = this.input.value,
    topic?: DiscussionTopic,
  ): Promise<void> {
    const question = value.trim().slice(0, 600)
    const voice = this.voice
    const thread = this.currentThread()
    if (!question || !voice || !thread || thread.pending || this.destroyed)
      return
    const context = this.options.getContext()
    const history: DiscussionTurn[] = thread.messages
      .filter((message): message is DiscussionTurn => message.role !== 'notice')
      .slice(-12)
    appendMessage(thread, { role: 'user', text: question })
    thread.draft = ''
    const pending = new AbortController()
    thread.pending = pending
    this.render()
    try {
      const reply = await this.provider.reply(
        { voice, question, history, context, ...(topic ? { topic } : {}) },
        pending.signal,
      )
      if (pending.signal.aborted || this.threads.get(voice.id) !== thread)
        return
      thread.topic = reply.topic
      appendMessage(thread, { role: 'assistant', text: reply.text })
    } catch {
      if (pending.signal.aborted || this.threads.get(voice.id) !== thread)
        return
      appendMessage(thread, {
        role: 'notice',
        text: 'That reply did not arrive. Try your question again.',
      })
      thread.draft = question
    } finally {
      if (thread.pending === pending) thread.pending = undefined
      if (
        this.voice?.id === voice.id &&
        this.threads.get(voice.id) === thread
      ) {
        this.render()
        if (this.dialog.open) this.focusChoice()
      }
    }
  }

  reset(): void {
    this.dialog.close()
    for (const thread of this.threads.values()) thread.pending?.abort()
    this.threads.clear()
    this.voice = undefined
  }

  destroy(): void {
    this.destroyed = true
    this.reset()
    this.dialog.remove()
  }
}
