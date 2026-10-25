import './opinion-bubbles.css'
import type { CommunityId } from '../../shared/community-contract.ts'
import type { PoloOpinion } from './opinions.ts'

export class PoloOpinionBubbles {
  readonly element = document.createElement('div')
  private cards: { id: CommunityId; element: HTMLButtonElement }[] = []
  private readonly open: (id: CommunityId) => void

  constructor(container: Element, open: (id: CommunityId) => void) {
    this.open = open
    this.element.className = 'polo-opinions'
    this.element.setAttribute('role', 'group')
    this.element.setAttribute(
      'aria-label',
      'Community conversation invitations',
    )
    container.append(this.element)
  }

  update(opinions: PoloOpinion[]): void {
    this.element.replaceChildren()
    this.cards = opinions.slice(0, 2).map((opinion) => {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'polo-opinion'
      card.dataset['tone'] = opinion.tone
      card.dataset['person'] = opinion.id
      card.setAttribute(
        'aria-label',
        `${opinion.name}: ${opinion.text} Talk privately.`,
      )
      const avatar = document.createElement('img')
      avatar.src = `/avatars/${opinion.avatar}.png`
      avatar.alt = ''
      const byline = document.createElement('span')
      byline.className = 'polo-opinion-byline'
      const name = document.createElement('strong')
      name.textContent = opinion.name
      const tone = document.createElement('span')
      tone.textContent = opinion.tone === 'concern' ? 'A concern' : 'An idea'
      byline.append(name, tone)
      const text = document.createElement('span')
      text.className = 'polo-opinion-text'
      text.textContent = opinion.text
      const action = document.createElement('span')
      action.className = 'polo-opinion-action'
      action.textContent = 'Let’s talk ↗'
      card.append(avatar, byline, text, action)
      card.addEventListener('click', () => {
        this.open(opinion.id)
      })
      this.element.append(card)
      return { id: opinion.id, element: card }
    })
  }

  position(
    project: (id: CommunityId) => { x: number; y: number } | undefined,
  ): void {
    const width = this.element.clientWidth
    const height = this.element.clientHeight
    const mobile = width <= 700
    const studio = this.element.closest('.polo-studio')
    const tools = studio
      ?.querySelector('.polo-impact-tools')
      ?.getBoundingClientRect()
    const deck = studio?.querySelector('.polo-deck')?.getBoundingClientRect()
    const placement = studio
      ?.querySelector('.polo-placement-controls')
      ?.getBoundingClientRect()
    const origin = this.element.getBoundingClientRect()
    const rowLeft = deck ? deck.right - origin.left + 16 : 20
    const rowRight = tools ? tools.left - origin.left - 16 : width - 20
    const rowWidth =
      this.cards.reduce((sum, card) => sum + card.element.offsetWidth, 0) +
      Math.max(0, this.cards.length - 1) * 16
    const useTopRow =
      !mobile && !!deck?.height && rowRight - rowLeft >= rowWidth
    let previous: { left: number; top: number; height: number } | undefined
    for (const [index, card] of this.cards.entries()) {
      const point = project(card.id)
      card.element.hidden = !mobile && !point
      if (mobile || !point) continue
      const cardWidth = card.element.offsetWidth
      const cardHeight = card.element.offsetHeight
      if (useTopRow) {
        const left =
          rowLeft +
          (rowRight - rowLeft - rowWidth) / 2 +
          index * (cardWidth + 16)
        card.element.style.left = `${String(left)}px`
        card.element.style.top = '140px'
        continue
      }
      let left = Math.max(
        20,
        Math.min(width - cardWidth - 20, point.x - cardWidth / 2),
      )
      let top = Math.max(
        140,
        Math.min(height - cardHeight - 160, point.y - cardHeight - 24),
      )
      if (tools && top < tools.bottom - origin.top + 16)
        left = Math.max(
          20,
          Math.min(left, tools.left - origin.left - cardWidth - 16),
        )
      if (deck?.height && left < deck.right - origin.left + 16)
        top = Math.max(
          100,
          Math.min(top, deck.top - origin.top - cardHeight - 16),
        )
      if (
        previous &&
        Math.abs(left - previous.left) < cardWidth + 16 &&
        top < previous.top + previous.height + 16 &&
        top + cardHeight > previous.top - 16
      ) {
        const above = previous.top - cardHeight - 16
        top = above >= 100 ? above : previous.top + previous.height + 16
        if (
          deck?.height &&
          top + cardHeight > deck.top - origin.top - 16 &&
          left < deck.right - origin.left + 16
        )
          left = Math.min(width - cardWidth - 20, deck.right - origin.left + 16)
      }
      if (
        placement?.height &&
        left < placement.right - origin.left + 12 &&
        left + cardWidth > placement.left - origin.left - 12 &&
        top < placement.bottom - origin.top + 12 &&
        top + cardHeight > placement.top - origin.top - 12
      )
        top = placement.bottom - origin.top + 16
      card.element.style.left = `${String(left)}px`
      card.element.style.top = `${String(top)}px`
      previous = { left, top, height: cardHeight }
    }
  }

  destroy(): void {
    this.element.remove()
  }
}
