import './gameplay.css'
import { choiceArt } from './choice-art.ts'
import { CharacterChat } from './character-chat.ts'
import type { DialogueTarget } from './dialogue-choices.ts'
import {
  communityVoices,
  nextChallenge,
  challengeCompleted,
} from './community.ts'
import type { CommunityVoice, VoiceId, MiniChallenge } from './community.ts'
import type { DataPack } from './data.ts'
import type { LngLat } from './geometry.ts'
import {
  assessSite,
  evaluatePlan,
  DEFAULT_CHOICES,
  COOLING,
  WEATHER,
  MODEL_SOURCES,
} from './consequences.ts'
import type {
  GameYear,
  PlanChoices,
  PlanResult,
  SiteContext,
  Weather,
} from './consequences.ts'

interface SavedPlan {
  name: string
  center: LngLat
  bearing: number
  choices: PlanChoices
  weather: Weather
  result: PlanResult
  reflection: Reflection
}
interface Reflection {
  preference: string
  reason: string
  question: string
}
interface GameCallbacks {
  communityChanged: (voice: CommunityVoice) => void
  moveRequested: () => void
  beforeExperiment: () => void
  stageChanged: (stage: string) => void
  revealFuture: () => void
  landscapeChanged: (
    choices: PlanChoices,
    year: GameYear,
    weather: Weather,
  ) => void
  restoreSite: (center: LngLat, bearing: number) => void
  message: (text: string) => void
}
const emptySite: SiteContext = {
  buildings: 0,
  trees: 0,
  water: 0,
  parks: 0,
  flood: 0,
}
const choiceCard = (
  group: string,
  value: string,
  title: string,
  caption: string,
  cost: number,
  art: string,
): string =>
  '<button class="choice-card" data-choice="' +
  group +
  '" data-value="' +
  value +
  '" aria-pressed="false"><span class="card-cost">' +
  String(cost) +
  '<small> ●</small></span>' +
  choiceArt(art) +
  '<strong>' +
  title +
  '</strong><small class="card-caption">' +
  caption +
  '</small><span class="card-check" aria-hidden="true">✓</span></button>'

export class Gameplay {
  private readonly pack: DataPack
  private readonly callbacks: GameCallbacks
  private readonly panel: HTMLElement
  private readonly metrics: HTMLElement
  private readonly dialog: HTMLDialogElement
  private readonly modelDialog: HTMLDialogElement
  private readonly chat: CharacterChat
  private choices: PlanChoices = { ...DEFAULT_CHOICES }
  private activeTab = 'cooling'
  private year: GameYear = 0
  private futureReady = false
  private running = false
  private playbackTimers: number[] = []
  private feedbackText = 'Try a card. Watch the map.'
  private voiceId: VoiceId = 'neighbor'
  private miniChallenge: MiniChallenge | undefined
  private challengeWin = ''
  private weather: Weather = 'drought'
  private site: SiteContext = { ...emptySite }
  private center: LngLat
  private bearing = 28
  private saved: SavedPlan[] = []
  private readonly referenceSite: SiteContext
  private experimentNumber = 0
  private reflection: Reflection = { preference: '', reason: '', question: '' }

  constructor(pack: DataPack, callbacks: GameCallbacks) {
    this.pack = pack
    this.callbacks = callbacks
    this.center = [...pack.manifest.center]
    this.referenceSite = assessSite(pack, pack.manifest.center, 28)
    const studio = document.querySelector('.studio')
    if (!(studio instanceof HTMLElement))
      throw new Error('Missing game workspace')
    studio.classList.add('has-gameplay')
    this.panel = document.createElement('aside')
    this.panel.className = 'gameplay-panel panel'
    this.panel.setAttribute('aria-label', 'Design choices and challenge')
    this.panel.innerHTML = [
      '<header class="deck-heading"><div><span class="quest-kicker" id="quest-step">YOUR CITY · 1 / 3</span><h2 id="choice-question">Keep the servers cool.</h2></div><nav class="choice-tabs" role="tablist" aria-label="Your mission"><button id="tab-cooling" role="tab" aria-selected="true" aria-controls="choices-cooling" data-tab="cooling" title="Cooling">1<span>Cool</span></button><button id="tab-land" role="tab" aria-selected="false" aria-controls="choices-land" data-tab="land" title="Nature">2<span>Grow</span></button><button id="tab-people" role="tab" aria-selected="false" aria-controls="choices-people" data-tab="people" title="Neighbors">3<span>Share</span></button></nav><div class="game-budget" aria-label="Game credits remaining"><span class="coin">●</span><strong id="credits-left">100</strong><small>credits</small></div></header>',
      '<div class="community-quest"><button class="mini-challenge" data-action="challenge"><span id="mini-challenge-status">MINI CHALLENGE</span><strong id="mini-challenge-title"></strong><b aria-hidden="true">↗</b></button><div class="voice-picks" role="group" aria-label="Hear fictional community voices"><button data-voice="neighbor" aria-label="Hear the neighbor" aria-pressed="true">💧</button><button data-voice="nature" aria-label="Hear the nature volunteer" aria-pressed="false">🌱</button><button data-voice="student" aria-label="Hear the local student" aria-pressed="false">🎒</button></div></div><p class="sr-only" id="community-quote" aria-live="polite"></p>',
      '<div class="choice-pages"><section id="choices-cooling" role="tabpanel" aria-labelledby="tab-cooling">' +
        choiceCard(
          'cooling',
          'evaporative',
          'Use water',
          'Less power · more water',
          0,
          'water',
        ) +
        choiceCard(
          'cooling',
          'hybrid',
          'Mix air + water',
          'Balance both resources',
          32,
          'hybrid',
        ) +
        choiceCard(
          'cooling',
          'dry',
          'Use air',
          'Less water · more power',
          44,
          'air',
        ) +
        '</section>',
      '<section id="choices-land" role="tabpanel" aria-labelledby="tab-land" hidden>' +
        choiceCard(
          'nature',
          'none',
          'Keep it simple',
          'No new planting',
          0,
          'bare',
        ) +
        choiceCard(
          'nature',
          'grove',
          'Trees + meadow',
          '60 trees · native habitat',
          48,
          'grove',
        ) +
        choiceCard(
          'nature',
          'garden',
          'Trees + rain garden',
          '24 trees · slow the rain',
          42,
          'garden',
        ) +
        '</section>',
      '<section id="choices-people" role="tabpanel" aria-labelledby="tab-people" hidden>' +
        choiceCard(
          'sharing',
          'none',
          'Keep it private',
          'No shared space or training',
          0,
          'private',
        ) +
        choiceCard(
          'sharing',
          'training',
          'Teach new skills',
          'Fund paid local training',
          12,
          'training',
        ) +
        choiceCard(
          'sharing',
          'access',
          'Open a green path',
          'Give neighbors a place to walk',
          10,
          'walk',
        ) +
        '</section></div>',
      '<div class="deck-outcome" id="deck-outcome" hidden></div><footer class="deck-footer"><button class="deck-back" data-action="back" aria-label="Previous choice">←</button><p id="action-hint">Try a card. Watch the map.</p><button class="test-plan" data-action="test"><span>Grow next</span><b>→</b></button></footer>',
      '<div class="time-reveal" role="status" hidden><span>FAST FORWARD</span><strong id="reveal-year">Year 0</strong><small>Watch your choices grow.</small></div>',
    ].join('')
    this.metrics = document.createElement('section')
    this.metrics.className = 'play-hud'
    this.metrics.setAttribute('aria-label', 'Game world controls')
    this.metrics.innerHTML = [
      '<div class="year-hud"><span id="impact-year">NOW</span><div role="group" aria-label="View the future"><button data-year="0" aria-pressed="true">Now</button><button data-year="5" aria-pressed="false">5 years</button><button data-year="10" aria-pressed="false">10 years</button></div></div>',
      '<div class="hud-actions"><details class="challenge-picker"><summary id="challenge-label">☀ Dry summer</summary><div class="weather-picks" role="group" aria-label="Choose a weather test">' +
        Object.entries(WEATHER)
          .map(
            ([id, item]) =>
              '<button data-weather="' +
              id +
              '" aria-pressed="false">' +
              item.icon +
              ' ' +
              item.title +
              '</button>',
          )
          .join('') +
        '</div></details><details class="history-hud" hidden><summary>My plans</summary><div id="saved-plans"></div></details><button class="help-orb" data-action="model" aria-label="Game rules and sources">?</button></div>',
      '<button class="map-alert" id="map-alert" data-action="model"></button><span class="life-caption" title="Cars, pedestrians and reactions are authored game characters">Imagined city life</span>',
    ].join('')
    this.dialog = document.createElement('dialog')
    this.dialog.className = 'results-dialog'
    this.dialog.setAttribute('aria-labelledby', 'results-title')
    this.modelDialog = document.createElement('dialog')
    this.modelDialog.className = 'model-dialog'
    this.modelDialog.setAttribute('aria-labelledby', 'model-title')
    this.modelDialog.innerHTML = `<button class="dialog-close" data-action="close-model" aria-label="Close model explanation">×</button><span class="eyebrow">REAL GEOGRAPHY · SIMPLIFIED RULES</span><h2 id="model-title">What is real?<br>What is a game estimate?</h2><p>Buildings, waterbodies, street trees, parks, and mapped flood hazards come from the downloaded San José pack. The full campus pad is checked for overlaps. Coverage and dates vary; private trees are missing from the street-tree inventory.</p><p>Cars follow the downloaded street lines. People, gatherings and placards are imagined game characters, not observed traffic or a prediction of public opinion. The blue and yellow columns are symbolic water and power gauges, not physical infrastructure or measurements.</p><h3>Our sandbox assumptions</h3><p>This concept uses <strong>24 MW IT capacity at 70% average load</strong>, unrelated to the real applicant's design. Daily direct cooling water = average IT kW × 24 hours × water-use factor ÷ 1,000. Electricity = average IT MW × PUE × weather factor × 8,760 hours. The power figure annualizes the selected scenario; it is not a weather forecast.</p><table><caption>Illustrative cooling coefficients</caption><thead><tr><th>Cooling</th><th>PUE</th><th>Water L/kWh IT</th></tr></thead><tbody>${Object.values(
      COOLING,
    )
      .map(
        (item) =>
          `<tr><td>${item.title}</td><td>${String(item.pue)}</td><td>${String(item.wue)}</td></tr>`,
      )
      .join(
        '',
      )}</tbody></table><p>Heatwave: direct cooling water × 1.3; electricity × 1.06 / 1.10 / 1.18 for evaporative / hybrid / dry. Dry summer: cooling water × 1.12. Establishment irrigation adds 8 L per planted tree per day at year 0, then 3 L. Indirect electricity-related water is excluded.</p><p>Tree survival is 82% in the drought test and 90% otherwise. Canopy growth is 12% / 55% / 100% at years 0 / 5 / 10; restoration recovery is 20% / 65% / 100%. Nature, shade, runoff and local benefits are <strong>game indices, not measured ecological outcomes or public opinion</strong>. Training commitments are fictional. Credits are an upgrade allowance, not dollars or the cost of the building. Care is included.</p><p>Greening on the map is a schematic proposal. Soil suitability, land ownership, setbacks, tree species, detailed stormwater capacity, grid capacity, permitting and flood depths are not modeled. New planting cannot offset an occupied footprint or guarantee flood protection.</p><h3>Evidence behind the trade-offs</h3>${MODEL_SOURCES.map((source) => `<p><a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title} ↗</a><br>${source.detail}</p>`).join('')}<p class="model-footnote">The sources support the mechanisms. We chose the numeric coefficients for this educational prototype. See docs/game-model.md for every scoring formula.</p>`
    studio.append(this.panel, this.metrics, this.dialog, this.modelDialog)
    for (const container of [
      this.panel,
      this.metrics,
      this.dialog,
      this.modelDialog,
    ])
      container.addEventListener('click', this.onClick)
    for (const modal of [this.dialog, this.modelDialog])
      modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.close()
      })
    this.dialog.addEventListener('input', (event) => {
      const target = event.target
      if (
        target instanceof HTMLTextAreaElement &&
        target.id === 'reflection-reason'
      )
        this.reflection.reason = target.value
      if (
        target instanceof HTMLInputElement &&
        target.id === 'reflection-question'
      )
        this.reflection.question = target.value
    })
    this.panel
      .querySelector('.choice-tabs')
      ?.addEventListener('keydown', (event) => {
        if (
          !(event instanceof KeyboardEvent) ||
          !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
        )
          return
        const tabs = [
          ...this.panel.querySelectorAll<HTMLButtonElement>('[data-tab]'),
        ]
        const index = tabs.findIndex((tab) => tab === document.activeElement)
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabs.length - 1
              : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
                tabs.length
        event.preventDefault()
        tabs[next]?.click()
        tabs[next]?.focus()
      })
    const speakers = this.panel.querySelector('.voice-picks')
    const chatButton = document.createElement('button')
    chatButton.type = 'button'
    chatButton.dataset['action'] = 'chat'
    chatButton.setAttribute('aria-label', 'Chat with this character')
    chatButton.title = 'Chat with this character'
    chatButton.textContent = '💬'
    speakers?.append(chatButton)
    this.chat = new CharacterChat({
      getContext: () => ({
        choices: { ...this.choices },
        site: { ...this.site },
        year: this.year,
        weather: this.weather,
      }),
      tryIdea: (target) => {
        this.exploreIdea(target)
      },
    })
    this.render()
  }

  openDiscussion(): void {
    if (this.running) return
    this.callbacks.beforeExperiment()
    const voice = communityVoices(this.choices, this.site).find(
      (item) => item.id === this.voiceId,
    )
    if (voice) this.chat.open(voice)
  }

  setSite(center: LngLat, bearing: number): void {
    const moved =
      this.center[0] !== center[0] ||
      this.center[1] !== center[1] ||
      this.bearing !== bearing
    this.center = [...center]
    this.bearing = bearing
    this.site = assessSite(this.pack, center, bearing)
    if (moved)
      this.callbacks.message(
        this.site.buildings || this.site.water || this.site.parks
          ? 'This footprint has a mapped conflict. Open the consequences before committing.'
          : this.site.flood
            ? 'New site: mapped flood exposure remains. Planting does not remove it.'
            : 'New site checked. Compare its consequences and make your design choices.',
      )
    this.render()
    this.callbacks.landscapeChanged(this.choices, this.year, this.weather)
  }
  reset(): void {
    this.clearPlayback()
    this.chat.reset()
    this.running = false
    this.futureReady = false
    this.choices = { ...DEFAULT_CHOICES }
    this.miniChallenge = undefined
    this.challengeWin = ''
    this.activeTab = 'cooling'
    this.selectTab('cooling')
    this.year = 0
    this.weather = 'drought'
    this.saved = []
    this.experimentNumber = 0
    this.reflection = { preference: '', reason: '', question: '' }
    this.dialog.close()
    this.render()
    this.callbacks.landscapeChanged(this.choices, this.year, this.weather)
  }
  private result(): PlanResult {
    return evaluatePlan(this.site, this.choices, this.year, this.weather)
  }
  private render(): void {
    const result = this.result()
    const next = nextChallenge(this.choices, this.site)
    if (this.miniChallenge && this.miniChallenge.id !== next.id) {
      this.challengeWin = challengeCompleted(
        this.miniChallenge.id,
        this.choices,
        this.site,
      )
        ? this.miniChallenge.celebration
        : ''
    }
    this.miniChallenge = next
    const questTitle = this.panel.querySelector('#mini-challenge-title')
    if (questTitle) questTitle.textContent = next.title
    const questStatus = this.panel.querySelector('#mini-challenge-status')
    if (questStatus)
      questStatus.textContent = this.challengeWin
        ? '✓ ' + this.challengeWin
        : 'MINI CHALLENGE'
    const voices = communityVoices(this.choices, this.site)
    const voice = voices.find((item) => item.id === this.voiceId)
    if (voice) {
      const quote = this.panel.querySelector('#community-quote')
      if (quote) quote.textContent = voice.name + ': ' + voice.quote
      this.callbacks.communityChanged(voice)
    }
    for (const button of this.panel.querySelectorAll<HTMLButtonElement>(
      '[data-voice]',
    ))
      button.setAttribute(
        'aria-pressed',
        String(button.dataset['voice'] === this.voiceId),
      )
    const baseline = evaluatePlan(
      this.referenceSite,
      DEFAULT_CHOICES,
      this.year,
      this.weather,
    )
    const credits = this.panel.querySelector('#credits-left')
    if (credits) credits.textContent = String(result.remaining)
    this.panel.classList.toggle('over-budget', result.remaining < 0)
    this.panel.classList.toggle('future-ready', this.futureReady)
    this.panel.classList.toggle('is-running', this.running)
    const question = this.panel.querySelector('#choice-question')
    const step = this.panel.querySelector('#quest-step')
    if (question)
      question.textContent = this.futureReady
        ? 'Ten years. Your choices.'
        : this.activeTab === 'cooling'
          ? 'Keep the servers cool.'
          : this.activeTab === 'land'
            ? 'Bring this place to life.'
            : 'Be a good neighbor.'
    if (step)
      step.textContent = this.futureReady
        ? 'YOUR FUTURE'
        : 'YOUR CITY · ' +
          (this.activeTab === 'cooling'
            ? '1'
            : this.activeTab === 'land'
              ? '2'
              : '3') +
          ' / 3'
    for (const button of this.panel.querySelectorAll<HTMLButtonElement>(
      '[data-choice]',
    )) {
      const group = button.dataset['choice'],
        value = button.dataset['value']
      const selected =
        group === 'cooling'
          ? this.choices.cooling === value
          : group === 'nature'
            ? value === 'none'
              ? this.choices.restoration === 'none'
              : value === 'grove'
                ? this.choices.restoration === 'meadow'
                : this.choices.restoration === 'rain-garden'
            : value === 'none'
              ? !this.choices.training && !this.choices.access
              : value === 'training'
                ? this.choices.training
                : this.choices.access
      button.setAttribute('aria-pressed', String(selected))
    }
    for (const button of this.metrics.querySelectorAll<HTMLButtonElement>(
      '[data-year]',
    ))
      button.setAttribute(
        'aria-pressed',
        String(button.dataset['year'] === String(this.year)),
      )
    for (const button of this.metrics.querySelectorAll<HTMLButtonElement>(
      '[data-weather]',
    ))
      button.setAttribute(
        'aria-pressed',
        String(button.dataset['weather'] === this.weather),
      )
    const year = this.metrics.querySelector('#impact-year')
    if (year) year.textContent = this.year ? 'YEAR ' + String(this.year) : 'NOW'
    const challenge = this.metrics.querySelector('#challenge-label')
    if (challenge)
      challenge.textContent =
        WEATHER[this.weather].icon + ' ' + WEATHER[this.weather].title
    const alert = this.metrics.querySelector('#map-alert')
    if (alert) {
      alert.textContent = this.site.buildings
        ? '⚠ Building in the way'
        : this.site.water || this.site.parks
          ? '⚠ Protect this corridor'
          : this.site.flood
            ? '⚑ Flood map: check this spot'
            : '✓ No mapped footprint conflict'
      alert.classList.toggle(
        'warning',
        Boolean(
          this.site.buildings ||
          this.site.water ||
          this.site.parks ||
          this.site.flood,
        ),
      )
    }
    const pages = this.panel.querySelector('.choice-pages')
    const outcome = this.panel.querySelector('#deck-outcome')
    if (pages instanceof HTMLElement) pages.hidden = this.futureReady
    if (outcome instanceof HTMLElement) {
      outcome.hidden = !this.futureReady
      const water = Math.round((1 - result.water / baseline.water) * 100)
      const power = Math.round((result.power / baseline.power - 1) * 100)
      outcome.innerHTML =
        '<span><b>💧 ' +
        String(Math.abs(water)) +
        '% ' +
        (water >= 0 ? 'less' : 'more') +
        '</b>cooling water</span><span><b>⚡ ' +
        String(power) +
        '% more</b>electricity</span><span><b>🌳 ' +
        String(result.survivingTrees) +
        '</b>trees growing</span>'
    }
    const hint = this.panel.querySelector('#action-hint')
    if (hint)
      hint.textContent =
        result.remaining < 0
          ? 'Too many upgrades. Swap a card.'
          : this.futureReady
            ? 'Look around. What would you change?'
            : this.feedbackText
    const back = this.panel.querySelector('[data-action="back"]')
    if (back instanceof HTMLButtonElement)
      back.disabled = this.activeTab === 'cooling' && !this.futureReady
    const nextButton = this.panel.querySelector('[data-action="test"] > span')
    if (nextButton)
      nextButton.textContent = this.futureReady
        ? 'Compare plans'
        : this.activeTab === 'cooling'
          ? 'Grow next'
          : this.activeTab === 'land'
            ? 'Share next'
            : 'See 10 years'
    const reveal = this.panel.querySelector('.time-reveal')
    if (reveal instanceof HTMLElement) reveal.hidden = !this.running
    const revealYear = this.panel.querySelector('#reveal-year')
    if (revealYear)
      revealYear.textContent = this.year ? 'Year ' + String(this.year) : 'Today'
    const saved = this.metrics.querySelector('#saved-plans')
    if (saved)
      saved.innerHTML = this.saved
        .map(
          (plan, index) =>
            '<button data-restore="' +
            String(index) +
            '">' +
            plan.name +
            '<span>' +
            String(plan.result.goals.filter((goal) => goal.passed).length) +
            '/4 goals ↗</span></button>',
        )
        .join('')
    const history = this.metrics.querySelector('.history-hud')
    if (history instanceof HTMLElement) history.hidden = !this.saved.length
  }
  private selectTab(tab: string): void {
    if (this.running) return
    this.activeTab = tab
    this.voiceId =
      tab === 'land' ? 'nature' : tab === 'people' ? 'student' : 'neighbor'
    this.futureReady = false
    this.feedbackText =
      tab === 'cooling'
        ? 'Watch the water and power markers.'
        : tab === 'land'
          ? 'Plant now. Fast-forward to see it grow.'
          : 'Your neighbors have something to say.'
    for (const button of this.panel.querySelectorAll<HTMLButtonElement>(
      '[data-tab]',
    )) {
      const selected = button.dataset['tab'] === tab
      button.setAttribute('aria-selected', String(selected))
      button.tabIndex = selected ? 0 : -1
    }
    for (const section of this.panel.querySelectorAll<HTMLElement>(
      '[role="tabpanel"]',
    ))
      section.hidden = section.id !== 'choices-' + tab
    this.callbacks.stageChanged(tab)
    this.render()
  }
  private startFuture(): void {
    if (this.running) return
    this.running = true
    this.futureReady = false
    this.year = 0
    this.render()
    this.callbacks.stageChanged('future')
    this.callbacks.revealFuture()
    this.callbacks.landscapeChanged(this.choices, this.year, this.weather)
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const finish = (): void => {
      this.year = 10
      this.running = false
      this.futureReady = true
      this.render()
      this.callbacks.landscapeChanged(this.choices, this.year, this.weather)
    }
    if (reduced) {
      finish()
      return
    }
    this.playbackTimers.push(
      window.setTimeout(() => {
        this.year = 5
        this.render()
        this.callbacks.landscapeChanged(this.choices, this.year, this.weather)
      }, 700),
    )
    this.playbackTimers.push(window.setTimeout(finish, 1800))
  }
  private clearPlayback(): void {
    for (const timer of this.playbackTimers) window.clearTimeout(timer)
    this.playbackTimers = []
  }
  destroy(): void {
    this.clearPlayback()
    this.chat.destroy()
  }

  private followChallenge(): void {
    this.exploreIdea(this.miniChallenge?.target)
  }
  private exploreIdea(target: DialogueTarget | undefined): void {
    if (this.running) return
    this.callbacks.beforeExperiment()
    if (target === 'move') {
      this.voiceId = 'neighbor'
      this.render()
      this.callbacks.moveRequested()
    } else if (target === 'future') {
      this.startFuture()
    } else if (target) {
      this.selectTab(target)
    }
  }
  private comparisonRows(result: PlanResult): string {
    const reference = evaluatePlan(
      this.referenceSite,
      DEFAULT_CHOICES,
      10,
      this.weather,
    )
    const rows: [string, string, string][] = [
      ['Direct water (m³/day)', String(reference.water), String(result.water)],
      ['Electricity (GWh/year)', String(reference.power), String(result.power)],
      [
        'Nature game index',
        String(reference.nature) + '/100',
        String(result.nature) + '/100',
      ],
      [
        'Local-benefit game index',
        String(reference.community) + '/100',
        String(result.community) + '/100',
      ],
      [
        'Runoff game index · lower is better',
        String(reference.runoff) + '/100',
        String(result.runoff) + '/100',
      ],
      ['Upgrade credits used', String(reference.spent), String(result.spent)],
      [
        'Mapped footprint conflicts',
        String(
          this.referenceSite.buildings +
            this.referenceSite.water +
            this.referenceSite.parks,
        ),
        String(this.site.buildings + this.site.water + this.site.parks),
      ],
    ]
    return rows
      .map(
        ([label, before, after]) =>
          `<tr><th>${label}</th><td>${before}</td><td>${after}</td></tr>`,
      )
      .join('')
  }
  private showResults(): void {
    this.year = 10
    this.render()
    this.callbacks.landscapeChanged(this.choices, this.year, this.weather)
    const result = this.result()
    const passed = result.goals.filter((goal) => goal.passed).length
    const title =
      passed === 4
        ? this.site.flood
          ? 'Greener plan. Flood risk remains.'
          : 'You found a balance!'
        : result.blockers.length
          ? 'The site needs another look.'
          : 'Good start. Try another mix!'
    const reference = evaluatePlan(
      this.referenceSite,
      DEFAULT_CHOICES,
      10,
      this.weather,
    )
    const waterChange = Math.round((1 - result.water / reference.water) * 100)
    const powerChange = Math.round((result.power / reference.power - 1) * 100)
    const friendlyGoals = [
      this.weather === 'drought'
        ? 'Use less cooling water'
        : this.weather === 'heatwave'
          ? 'Grow a useful shade canopy'
          : 'Give rain somewhere to soak in',
      'Make room for nature',
      'Share a local benefit',
      'Keep the footprint clear and stay on budget',
    ]
    const friendlySummary = `<div class="future-cards"><article><span>WATER</span><strong>${waterChange ? String(Math.abs(waterChange)) + '% ' + (waterChange > 0 ? 'less' : 'more') : 'No change'}</strong><p>${this.choices.cooling === 'dry' ? 'Air does most of the cooling work.' : this.choices.cooling === 'hybrid' ? 'Your mix saves water, but needs more power.' : 'Evaporating water carries the heat away.'}</p></article><article class="tradeoff"><span>THE TRADE-OFF</span><strong>${powerChange ? String(powerChange) + '% more power' : 'Same power use'}</strong><p>Saving one resource can put more demand on another.</p></article><article><span>NATURE</span><strong>${String(result.survivingTrees)} trees growing</strong><p>${this.choices.restoration === 'rain-garden' ? 'A rain garden gives rainfall somewhere to slow down.' : this.choices.restoration === 'meadow' ? 'Native plants give insects and wildlife more space.' : 'Trees need years of care to create shade.'}</p></article><article><span>YOUR NEIGHBORS</span><strong>${this.choices.training || this.choices.access ? 'Something shared' : 'Room to do more'}</strong><p>${this.choices.training && this.choices.access ? 'Paid training and a green place to walk.' : this.choices.training ? 'Paid training offers a way to learn new skills.' : this.choices.access ? 'A green walking space outside the secure campus.' : 'Could your plan share skills or green space?'}</p></article></div>`
    this.dialog.innerHTML = `<button class="dialog-close" data-action="close-results" aria-label="Return to designing">×</button><span class="eyebrow">TEN YEARS LATER · ${WEATHER[this.weather].title.toUpperCase()}</span><div class="results-hero"><div><h2 id="results-title">${title}</h2><p>You changed the plan. Here is what changed with it.</p></div><div class="score-orb" style="--score:${String(passed * 25)}%"><strong>${String(passed)}<small>/ 4 goals</small></strong></div></div>
      <div class="result-tags"><span>${String(result.remaining)} credits left</span><span>Compared with the same starting sketch</span></div>${friendlySummary}
      <details class="comparison-details"><summary>Curious? Compare the numbers</summary><table class="plan-comparison"><caption>Year 10 · same weather test · reference sketch stays fixed</caption><thead><tr><th>Consequence</th><th>Reference</th><th>Your plan</th></tr></thead><tbody>${this.comparisonRows(result)}</tbody></table></details><div class="result-goals">${result.goals.map((goal, index) => `<div class="${goal.passed ? 'passed' : 'missed'}"><span>${goal.passed ? '✓' : '○'}</span>${friendlyGoals[index] ?? goal.label}</div>`).join('')}</div>
      ${result.blockers.length ? `<div class="result-blockers">${result.blockers.map((blocker) => `<p>⚠ ${blocker}</p>`).join('')}</div>` : ''}
      ${result.feedback
        .filter((item) => item.tone === 'warning')
        .map(
          (item) =>
            `<article class="consequence warning"><strong>${item.title}</strong><p>${item.detail}</p></article>`,
        )
        .join(
          '',
        )}<details class="optional-perspectives"><summary>Hear two possible viewpoints</summary><div class="community-voices"><article><span>NEIGHBOR · FICTIONAL VIEWPOINT</span><p>${this.choices.access ? '“The green walking space gives us a reason to spend time here. Please make sure everyone can use it.”' : '“We live with the changes. What will this site offer people beyond its gates?”'}</p></article><article><span>${this.choices.training ? 'APPRENTICE' : 'LAND STEWARD'} · FICTIONAL VIEWPOINT</span><p>${this.choices.training ? '“Paid training opens a route into technical work. Who can apply, and how will those places be shared?”' : this.choices.restoration !== 'none' ? '“Restoring this land creates work too. Keep funding maintenance after opening day.”' : '“There is room for living soil and native plants. Can we turn part of this footprint into an opportunity for nature?”'}</p></article></div></details>
      <details class="learning-card"><summary>What would you tell a planner?</summary><div><span class="eyebrow">YOUR VOICE MATTERS</span><strong>Which plan would you take to a planning meeting?</strong><div class="preference-options" role="group" aria-label="Your preference"><button data-preference="reference" aria-pressed="false">Keep the reference</button><button data-preference="alternative" aria-pressed="false">Prefer my plan</button><button data-preference="evidence" aria-pressed="false">Need more evidence</button></div><label for="reflection-reason">My reason and the compromise I accept</label><textarea id="reflection-reason" rows="2" placeholder="I prefer… because… The trade-off I accept is…"></textarea><label for="reflection-question">A question for a developer or planner</label><input id="reflection-question" placeholder="Where will the cooling water come from in a dry year?"><p>Private practice in this tab. Nothing is sent or treated as community agreement.</p></div></details>
      <div class="results-actions"><button class="test-plan" data-action="save">Save my plan</button><button class="secondary-game-button" data-action="close-results">Try another mix ↗</button></div><p class="result-disclaimer">Illustrative game estimates. <button class="inline-details" data-action="model">How we worked it out ↗</button></p>`
    const reason = this.dialog.querySelector('#reflection-reason')
    const question = this.dialog.querySelector('#reflection-question')
    if (reason instanceof HTMLTextAreaElement)
      reason.value = this.reflection.reason
    if (question instanceof HTMLInputElement)
      question.value = this.reflection.question
    for (const item of this.dialog.querySelectorAll<HTMLButtonElement>(
      '[data-preference]',
    ))
      item.setAttribute(
        'aria-pressed',
        String(item.dataset['preference'] === this.reflection.preference),
      )
    this.dialog.showModal()
  }
  private readonly onClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest('button')
    if (!(button instanceof HTMLButtonElement) || this.running) return
    if (button.dataset['action'] === 'chat') {
      this.openDiscussion()
      return
    }
    const voice = button.dataset['voice']
    if (voice === 'neighbor' || voice === 'nature' || voice === 'student') {
      this.voiceId = voice
      this.render()
      return
    }
    if (button.dataset['action'] === 'challenge') {
      this.followChallenge()
      return
    }
    if (
      button.dataset['choice'] ||
      button.dataset['weather'] ||
      button.dataset['year'] ||
      button.dataset['action'] === 'test'
    )
      this.callbacks.beforeExperiment()
    const tab = button.dataset['tab']
    if (tab) {
      this.selectTab(tab)
      return
    }
    const weather = button.dataset['weather']
    if (weather === 'drought' || weather === 'heatwave' || weather === 'storm')
      this.weather = weather
    const year = button.dataset['year']
    if (year === '0' || year === '5' || year === '10')
      this.year = year === '0' ? 0 : year === '5' ? 5 : 10
    const group = button.dataset['choice'],
      value = button.dataset['value']
    if (
      group === 'cooling' &&
      (value === 'evaporative' || value === 'hybrid' || value === 'dry')
    )
      this.choices.cooling = value
    if (
      group === 'trees' &&
      (value === '0' || value === '24' || value === '60')
    )
      this.choices.trees = value === '0' ? 0 : value === '24' ? 24 : 60
    if (
      group === 'restoration' &&
      (value === 'none' || value === 'meadow' || value === 'rain-garden')
    )
      this.choices.restoration = value
    if (
      group === 'nature' &&
      (value === 'none' || value === 'grove' || value === 'garden')
    ) {
      this.choices.trees = value === 'none' ? 0 : value === 'grove' ? 60 : 24
      this.choices.restoration =
        value === 'none' ? 'none' : value === 'grove' ? 'meadow' : 'rain-garden'
    }
    if (
      group === 'sharing' &&
      (value === 'none' || value === 'training' || value === 'access')
    ) {
      this.choices.training = value === 'training'
      this.choices.access = value === 'access'
    }
    if (weather || year || group) {
      this.futureReady = false
      this.feedbackText =
        group === 'cooling'
          ? this.choices.cooling === 'evaporative'
            ? 'Water rises. Power stays lower.'
            : this.choices.cooling === 'hybrid'
              ? 'Water down. A little more power.'
              : 'Water drops. Power climbs.'
          : group === 'nature'
            ? this.choices.restoration === 'none'
              ? 'A quieter landscape.'
              : this.choices.restoration === 'meadow'
                ? 'New trees. New habitat.'
                : 'A garden that slows the rain.'
            : 'Watch the neighborhood react.'
      this.render()
      this.callbacks.landscapeChanged(this.choices, this.year, this.weather)
    }
    if (button.dataset['restore'] !== undefined) {
      const plan = this.saved[Number(button.dataset['restore'])]
      if (plan) {
        this.choices = { ...plan.choices }
        this.weather = plan.weather
        this.year = 10
        this.reflection = { ...plan.reflection }
        this.selectTab('people')
        this.callbacks.restoreSite([...plan.center], plan.bearing)
        this.callbacks.message(
          'Experiment restored. Change one choice and compare the trade-off.',
        )
      }
    }
    const action = button.dataset['action']
    if (action === 'test') {
      if (this.futureReady) this.showResults()
      else if (this.activeTab === 'cooling') this.selectTab('land')
      else if (this.activeTab === 'land') this.selectTab('people')
      else this.startFuture()
    }
    if (action === 'back') {
      if (this.futureReady) {
        this.year = 0
        this.selectTab('cooling')
        this.callbacks.landscapeChanged(this.choices, this.year, this.weather)
      } else this.selectTab(this.activeTab === 'people' ? 'land' : 'cooling')
    }
    if (action === 'close-results') this.dialog.close()
    if (action === 'model') this.modelDialog.showModal()
    if (action === 'close-model') this.modelDialog.close()
    if (action === 'save') {
      this.experimentNumber++
      this.saved = [
        ...this.saved.slice(-2),
        {
          name:
            COOLING[this.choices.cooling].title +
            ' · plan ' +
            String(this.experimentNumber),
          center: [...this.center],
          bearing: this.bearing,
          choices: { ...this.choices },
          weather: this.weather,
          result: this.result(),
          reflection: { ...this.reflection },
        },
      ]
      this.dialog.close()
      this.render()
      this.callbacks.message(
        'Experiment saved. Try a different cooling or landscape strategy.',
      )
    }
    const preference = button.dataset['preference']
    if (preference) {
      this.reflection.preference = preference
      for (const item of this.dialog.querySelectorAll<HTMLButtonElement>(
        '[data-preference]',
      ))
        item.setAttribute('aria-pressed', String(item === button))
    }
  }
}
