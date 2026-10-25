import { POLO_SCENARIO_ID } from './polo/model.ts'

if (
  new URL(window.location.href).searchParams.get('scenario') ===
  POLO_SCENARIO_ID
) {
  const { startPoloDemo } = await import('./polo/main.ts')
  await startPoloDemo()
} else {
  await import('./main.ts')
}
