import { POLO_TODAY_TABS } from './today.ts'
import type { PoloTodayTab } from './today.ts'

export interface PoloReaderPosition {
  tab: PoloTodayTab
  step: number
}

/** Reading moves within a chapter; it never chooses a construction phase. */
export function movePoloReader(
  position: PoloReaderPosition,
  direction: -1 | 1,
  lengths: Record<PoloTodayTab, number>,
): PoloReaderPosition {
  const nextStep = position.step + direction
  if (nextStep >= 0 && nextStep < lengths[position.tab])
    return { tab: position.tab, step: nextStep }
  const tab = POLO_TODAY_TABS[POLO_TODAY_TABS.indexOf(position.tab) + direction]
  if (!tab) return position
  return { tab, step: direction === 1 ? 0 : lengths[tab] - 1 }
}
