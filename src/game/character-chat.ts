import type { CommunityVoice, VoiceId } from './community.ts'
import { mockDiscussionProvider } from './discussion.ts'
import type {
  DiscussionContext,
  DiscussionProvider,
  DiscussionTurn,
} from './discussion.ts'

interface ChatMessage {
  role: 'user' | 'assistant' | 'notice'
  text: string
}
interface Thread {
  messages: ChatMessage[]
  contextKey: string
  draft: string
  pending: AbortController | undefined
}
interface ChatOptions {
  getContext: () => DiscussionContext
  tryChallenge: () => void
  provider?: DiscussionProvider
}
function appendMessage(thread: Thread, message: ChatMessage): void {
  thread.messages = [...thread.messages.slice(-39), message]
}
const prompts: Record<VoiceId, string[]> = {
  neighbor: ['What worries you?', 'Why use less water?', 'What should I try?'],
  nature: [
    'How could wildlife benefit?',
    'What about flooding?',
    'What should I try?',
  ],
  student: [
    'How could young people benefit?',
    'What about training?',
    'What should I try?',
  ],
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
  private voice: CommunityVoice | undefined
  private destroyed = false

  constructor(options: ChatOptions) {
    this.options = options
    this.provider = options.provider ?? mockDiscussionProvider
    this.dialog.className = 'character-chat'
    this.dialog.setAttribute('aria-labelledby', 'chat-person-name')
    this.dialog.innerHTML =
      '<header class="chat-header"><span class="chat-avatar" aria-hidden="true"></span><div><span class="chat-label">DEMO DIALOGUE</span><h2 id="chat-person-name"></h2><p>Fictional character · scripted replies</p></div><button type="button" class="chat-close" aria-label="Close conversation">×</button></header><div class="chat-messages" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text"></div><div class="chat-prompts" aria-label="Try a question"></div><p class="chat-status" role="status"></p><form class="chat-composer"><label for="chat-question" class="sr-only">Ask this character about your plan</label><input id="chat-question" maxlength="600" autocomplete="off" placeholder="Ask about your plan…" autofocus><button type="submit" aria-label="Send message">↑</button></form><footer class="chat-footer"><span>Stays in this tab. Your plan is yours.</span><button type="button" class="chat-try">Try the challenge ↗</button></footer>'
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
    get('.chat-close', HTMLButtonElement).addEventListener('click', () => {
      this.dialog.close()
    })
    get('.chat-try', HTMLButtonElement).addEventListener('click', () => {
      this.dialog.close()
      this.options.tryChallenge()
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
      if (!(event.target instanceof HTMLButtonElement)) return
      void this.submit(event.target.textContent)
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
        pending: undefined,
      }
      this.threads.set(voice.id, thread)
    } else if (thread.contextKey !== contextKey) {
      thread.contextKey = contextKey
      appendMessage(thread, {
        role: 'notice',
        text: 'Plan updated · new replies use your latest choices.',
      })
    }
    this.voice = voice
    this.render()
    if (!this.dialog.open) this.dialog.showModal()
    this.input.focus()
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
    for (const message of thread.messages) {
      const item = document.createElement('p')
      item.className = 'chat-message ' + message.role
      item.textContent = message.text
      if (message.role !== 'notice')
        item.setAttribute(
          'aria-label',
          (message.role === 'user' ? 'You: ' : voice.name + ': ') +
            message.text,
        )
      this.list.append(item)
    }
    this.promptList.replaceChildren()
    for (const prompt of prompts[voice.id]) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = prompt
      button.disabled = Boolean(thread.pending)
      this.promptList.append(button)
    }
    this.status.textContent = thread.pending ? voice.name + ' is replying…' : ''
    this.input.value = thread.draft
    this.input.disabled = Boolean(thread.pending)
    this.send.disabled = Boolean(thread.pending) || !thread.draft.trim()
    this.list.scrollTop = this.list.scrollHeight
  }

  private async submit(value = this.input.value): Promise<void> {
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
        { voice, question, history, context },
        pending.signal,
      )
      if (pending.signal.aborted || this.threads.get(voice.id) !== thread)
        return
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
        if (this.dialog.open) this.input.focus()
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
