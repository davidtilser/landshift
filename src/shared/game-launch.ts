export interface GameLaunch {
  scenarioId: string
}

/** Pass the onboarding page URL as baseUrl; this also supports a base subpath. */
export function createGameUrl(launch: GameLaunch, baseUrl: string | URL): URL {
  const url = new URL('game.html', baseUrl)
  url.searchParams.set('scenario', launch.scenarioId)
  return url
}

export function readGameLaunch(url: URL): GameLaunch | null {
  const scenarioId = url.searchParams.get('scenario')
  return scenarioId ? { scenarioId } : null
}
