import './volunteer-ui.css'
import { insertBeforeMapCredits } from '../map-credits.ts'
import {
  POLO_VOLUNTEER_AREA,
  POLO_VOLUNTEER_DEMO_LABEL,
  type PoloVolunteerEntry,
} from './volunteer-points.ts'

function requireControl(host: ParentNode, selector: string): HTMLElement {
  const control = host.querySelector<HTMLElement>(selector)
  if (!control) throw new Error(`Missing volunteer control: ${selector}`)
  return control
}

type VolunteerSnapshot = {
  readonly xp: number
  readonly rank: number
  readonly entries: readonly PoloVolunteerEntry[]
}

/** The navbar is the only entry point to this fictional local leaderboard. */
export function setupPoloVolunteer(
  root: HTMLElement,
  navParent: HTMLElement,
  getSnapshot: () => VolunteerSnapshot,
): { sync(): void; dismiss(): void; destroy(): void } {
  const launcher = document.createElement('button')
  launcher.type = 'button'
  launcher.className = 'polo-volunteer-launch'
  launcher.setAttribute('aria-haspopup', 'dialog')
  launcher.setAttribute('aria-controls', 'polo-volunteer-dialog')
  launcher.setAttribute('aria-expanded', 'false')
  launcher.innerHTML =
    '<span aria-hidden="true">✦</span><strong></strong><span class="polo-volunteer-launch-label">Leaderboard</span>'
  const launcherXp = requireControl(launcher, 'strong')
  navParent.prepend(launcher)

  const dialog = document.createElement('dialog')
  dialog.id = 'polo-volunteer-dialog'
  dialog.className = 'polo-volunteer-dialog'
  dialog.setAttribute('aria-labelledby', 'polo-volunteer-title')
  dialog.setAttribute('aria-describedby', 'polo-volunteer-description')
  dialog.innerHTML = `
    <header class="polo-volunteer-header">
      <div class="polo-volunteer-heading"><div><h2 id="polo-volunteer-title">Local changemakers</h2></div><button type="button" class="polo-volunteer-close" aria-label="Close leaderboard">×</button></div>
      <p id="polo-volunteer-description"></p>
      <div class="polo-volunteer-earn" aria-label="Ways to earn volunteer points"><span><b>+20 XP</b> Complete a chapter</span><span><b>+40 XP</b> Propose a change</span><span><b>+15 XP</b> Talk to the community</span></div>
    </header>
    <div class="polo-volunteer-content" tabindex="0" aria-label="Leaderboard rankings">
      <div class="polo-volunteer-list-heading"><span>Volunteer leaderboard</span><span class="polo-volunteer-demo"></span></div>
      <ol class="polo-volunteer-list" role="list"></ol>
      <button type="button" class="polo-volunteer-show-all" aria-expanded="false">Show whole leaderboard <span aria-hidden="true">↓</span></button>
    </div>
    <footer class="polo-volunteer-footer"><div class="polo-volunteer-you"><span><strong></strong></span><span class="polo-volunteer-your-rank"></span></div><p><span aria-hidden="true">✦</span> <span>Top 3 could be invited to a local planning or NGO session.</span></p></footer>`
  const host = root.querySelector('.polo-studio') ?? root
  insertBeforeMapCredits(host, dialog)
  const list = requireControl(dialog, '.polo-volunteer-list')
  const showAll = requireControl(dialog, '.polo-volunteer-show-all')
  const content = requireControl(dialog, '.polo-volunteer-content')
  const closeButton = requireControl(dialog, '.polo-volunteer-close')
  const status = document.createElement('span')
  status.className = 'polo-volunteer-status'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  navParent.append(status)
  const area = requireControl(dialog, '#polo-volunteer-description')
  const demo = requireControl(dialog, '.polo-volunteer-demo')
  const yourXp = requireControl(dialog, '.polo-volunteer-you strong')
  const yourRank = requireControl(dialog, '.polo-volunteer-your-rank')
  area.textContent = POLO_VOLUNTEER_AREA
  demo.textContent = POLO_VOLUNTEER_DEMO_LABEL

  let expanded = false
  let previousXp = getSnapshot().xp

  function renderRow(entry: PoloVolunteerEntry): HTMLLIElement {
    const row = document.createElement('li')
    row.className = 'polo-volunteer-row'
    row.classList.toggle('is-you', entry.isCurrentPlayer)
    if (entry.rank <= 3) row.classList.add('is-top-three')
    const rank = document.createElement('span')
    rank.className = 'polo-volunteer-rank'
    rank.textContent = String(entry.rank).padStart(2, '0')
    rank.setAttribute('aria-hidden', 'true')
    const identity = document.createElement('span')
    identity.className = 'polo-volunteer-person'
    if (entry.rank <= 3 && entry.avatar) {
      const avatar = document.createElement('img')
      avatar.src = entry.avatar
      avatar.alt = ''
      avatar.width = avatar.height = 40
      identity.append(avatar)
    }
    const name = document.createElement('span')
    name.textContent = entry.name
    if (entry.isCurrentPlayer && entry.name !== 'You') {
      const you = document.createElement('small')
      you.textContent = 'You'
      name.append(you)
    }
    identity.append(name)
    const points = document.createElement('strong')
    points.className = 'polo-volunteer-points'
    points.textContent = `${entry.xp.toLocaleString('en-US')} `
    const unit = document.createElement('span')
    unit.textContent = 'XP'
    points.append(unit)
    row.append(rank, identity, points)
    return row
  }

  function sync(): void {
    const snapshot = getSnapshot()
    launcherXp.textContent = `${String(snapshot.xp)} XP`
    launcher.setAttribute(
      'aria-label',
      `${String(snapshot.xp)} volunteer XP. Open local leaderboard. Rank ${String(snapshot.rank)}.`,
    )
    if (snapshot.xp > previousXp) {
      status.textContent = `+${String(snapshot.xp - previousXp)} volunteer XP. ${String(snapshot.xp)} XP total.`
      launcher.classList.remove('has-earned')
      requestAnimationFrame(() => {
        launcher.classList.add('has-earned')
      })
    }
    previousXp = snapshot.xp
    const scrollTop = content.scrollTop
    list.replaceChildren(
      ...snapshot.entries.slice(0, expanded ? undefined : 10).map(renderRow),
    )
    content.scrollTop = scrollTop
    showAll.setAttribute('aria-expanded', String(expanded))
    showAll.innerHTML = expanded
      ? 'Show top 10 <span aria-hidden="true">↑</span>'
      : 'Show whole leaderboard <span aria-hidden="true">↓</span>'
    yourXp.textContent = `${String(snapshot.xp)} volunteer XP`
    yourRank.textContent = `#${String(snapshot.rank)} in your area`
  }

  function dismiss(): void {
    if (dialog.open) dialog.close()
  }
  launcher.addEventListener('click', () => {
    if (root.querySelector('dialog[open]')) return
    expanded = false
    sync()
    dialog.showModal()
    content.scrollTop = 0
    launcher.setAttribute('aria-expanded', 'true')
    closeButton.focus({ preventScroll: true })
  })
  closeButton.addEventListener('click', dismiss)
  dialog.addEventListener('close', () => {
    launcher.setAttribute('aria-expanded', 'false')
    if (launcher.isConnected && !root.querySelector('dialog[open]'))
      launcher.focus()
  })
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return
    const bounds = dialog.getBoundingClientRect()
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dismiss()
  })
  showAll.addEventListener('click', () => {
    expanded = !expanded
    sync()
  })
  launcher.addEventListener('animationend', () => {
    launcher.classList.remove('has-earned')
  })
  sync()
  return {
    sync,
    dismiss,
    destroy(): void {
      dismiss()
      launcher.remove()
      dialog.remove()
      status.remove()
    },
  }
}
