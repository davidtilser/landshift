export type StatusRole =
  | 'good'
  | 'caution'
  | 'money'
  | 'angry'
  | 'live'
  | 'water'
  | 'amber'
  | 'community-green'
  | 'community-blue'
  | 'community-purple'
  | 'planner'
  | 'character'
  | 'player'

/** A status mark. Not a button. The fill is the named status role. */
export function createStatus(role: StatusRole, label: string): HTMLSpanElement {
  const chip = document.createElement('span')
  chip.className = statusClass(role)
  const mark = document.createElement('span')
  mark.className = 'ls-status-mark'
  mark.setAttribute('aria-hidden', 'true')
  chip.append(mark, label)
  return chip
}

function statusClass(role: StatusRole): string {
  switch (role) {
    case 'good':
      return 'ls-status ls-status-good'
    case 'caution':
      return 'ls-status ls-status-caution'
    case 'money':
      return 'ls-status ls-status-money'
    case 'angry':
      return 'ls-status ls-status-angry'
    case 'live':
      return 'ls-status ls-status-live'
    case 'water':
      return 'ls-status ls-status-water'
    case 'amber':
      return 'ls-status ls-status-amber'
    case 'community-green':
      return 'ls-status ls-status-community-green'
    case 'community-blue':
      return 'ls-status ls-status-community-blue'
    case 'community-purple':
      return 'ls-status ls-status-community-purple'
    case 'planner':
      return 'ls-status ls-status-planner'
    case 'character':
      return 'ls-status ls-status-character'
    case 'player':
      return 'ls-status ls-status-player'
  }
}
