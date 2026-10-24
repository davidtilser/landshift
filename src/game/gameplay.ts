import './gameplay.css'
import type { DataPack } from './data.ts'
import type { LngLat } from './geometry.ts'
import {
  assessSite,
  evaluatePlan,
  DEFAULT_CHOICES,
  COOLING,
  RESTORATION,
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
  beforeExperiment: () => void
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
  description: string,
  cost: number,
): string =>
  `<button class="choice-card" data-choice="${group}" data-value="${value}" aria-pressed="false"><span class="choice-radio"></span><span><strong>${title}</strong><small>${description}</small></span><b>${cost ? '+' + String(cost) : '0'}<small>credits</small></b></button>`

export class Gameplay {
  private readonly pack: DataPack
  private readonly callbacks: GameCallbacks
  private readonly panel: HTMLElement
  private readonly metrics: HTMLElement
  private readonly dialog: HTMLDialogElement
  private readonly modelDialog: HTMLDialogElement
  private choices: PlanChoices = { ...DEFAULT_CHOICES }
  private activeTab = 'cooling'
  private year: GameYear = 0
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
    this.panel.innerHTML = `
      <div class="gameplay-heading"><div><span class="eyebrow">SMALL CHOICES. LASTING CHANGE.</span><h2>Make your move.</h2></div><button class="model-info" data-action="model" aria-label="Explain game estimates">?</button></div>
      <div class="game-budget"><span>Your upgrade budget</span><strong id="credits-left">100 <small>/ 100 credits</small></strong><div class="budget-track"><span id="budget-fill"></span></div></div>
      <details class="challenge-picker"><summary id="challenge-label">Challenge: a dry summer</summary><div class="weather-picks" role="group" aria-label="Choose a stress test">${Object.entries(
        WEATHER,
      )
        .map(
          ([id, item]) =>
            `<button data-weather="${id}" aria-pressed="false"><span>${item.icon}</span>${item.title}</button>`,
        )
        .join('')}</div>
      <p class="weather-story" id="weather-story"></p></details><div id="mission-targets" class="mission-targets"></div>
      <div class="choice-tabs" role="tablist" aria-label="Design categories"><button id="tab-cooling" role="tab" aria-selected="true" aria-controls="choices-cooling" data-tab="cooling">1 · Cool it</button><button id="tab-land" role="tab" aria-selected="false" aria-controls="choices-land" data-tab="land">2 · Add nature</button><button id="tab-people" role="tab" aria-selected="false" aria-controls="choices-people" data-tab="people">3 · Share</button></div>
      <div class="choice-pages">
        <section id="choices-cooling" role="tabpanel" aria-labelledby="tab-cooling"><p class="choice-intro">How will you cool the servers?</p>${Object.entries(
          COOLING,
        )
          .map(([id, item]) =>
            choiceCard('cooling', id, item.title, item.summary, item.cost),
          )
          .join('')}<p class="choice-lesson" id="cooling-lesson"></p></section>
        <section id="choices-land" role="tabpanel" aria-labelledby="tab-land" hidden><p class="choice-intro">What could grow here?</p><div class="land-label">Plant and care for native trees</div><div class="tree-picks" role="group" aria-label="Number of proposed trees">${[0, 24, 60].map((count, index) => `<button data-choice="trees" data-value="${String(count)}" aria-pressed="false"><strong>${String(count)}</strong><span>trees</span><small>${String([0, 14, 30][index] ?? 0)} credits</small></button>`).join('')}</div><div class="land-label">Restore the land</div>${Object.entries(
          RESTORATION,
        )
          .map(([id, item]) =>
            choiceCard('restoration', id, item.title, item.summary, item.cost),
          )
          .join(
            '',
          )}<p class="choice-lesson">Planting is the start. Shade and soil benefits build over years; upkeep is included in the game cost.</p></section>
        <section id="choices-people" role="tabpanel" aria-labelledby="tab-people" hidden><p class="choice-intro">What will you offer your neighbors?</p>${choiceCard('training', 'toggle', 'Paid training for local people', 'Help young people build new skills.', 12)}${choiceCard('access', 'toggle', 'A green place to walk', 'Share some green space with neighbors.', 10)}<div class="livelihood-card"><span>A PROPOSAL TO DISCUSS</span><strong>Share skills. Care for the land.</strong><p id="livelihood-note"></p></div><p class="choice-lesson">Training places are fictional commitments in this game. Actual employment and eligibility need evidence and negotiation.</p></section>
      </div>
      <div class="time-control"><span>Watch the land recover</span><div role="group" aria-label="Simulation year"><button data-year="0" aria-pressed="true">Now</button><button data-year="5" aria-pressed="false">Year 5</button><button data-year="10" aria-pressed="false">Year 10</button></div></div>
      <p id="site-finding" class="site-finding"></p><details class="site-feedback"><summary id="site-summary">Read the consequences</summary><div id="consequence-feed"></div></details>
      <div id="saved-plans" class="saved-plans"></div>
      <div class="gameplay-footer"><button class="test-plan" data-action="test"><span>Next: add nature</span><span>↗</span></button><p>Try a choice. Watch what changes.</p></div>
    `
    this.metrics = document.createElement('section')
    this.metrics.className = 'impact-strip panel'
    this.metrics.setAttribute('aria-label', 'Illustrative consequences')
    this.metrics.innerHTML = `<div class="impact-heading"><span><i></i> YOUR PLAN · <strong id="impact-year">YEAR 0</strong></span><button data-action="model">Game estimates · Details ↗</button></div><div id="impact-values" class="impact-values"></div>`
    this.dialog = document.createElement('dialog')
    this.dialog.className = 'results-dialog'
    this.dialog.setAttribute('aria-labelledby', 'results-title')
    this.modelDialog = document.createElement('dialog')
    this.modelDialog.className = 'model-dialog'
    this.modelDialog.setAttribute('aria-labelledby', 'model-title')
    this.modelDialog.innerHTML = `<button class="dialog-close" data-action="close-model" aria-label="Close model explanation">×</button><span class="eyebrow">REAL GEOGRAPHY · SIMPLIFIED RULES</span><h2 id="model-title">What is real?<br>What is a game estimate?</h2><p>Buildings, waterbodies, street trees, parks, and mapped flood hazards come from the downloaded San José pack. The full campus pad is checked for overlaps. Coverage and dates vary; private trees are missing from the street-tree inventory.</p><h3>Our sandbox assumptions</h3><p>This concept uses <strong>24 MW IT capacity at 70% average load</strong>, unrelated to the real applicant's design. Daily direct cooling water = average IT kW × 24 hours × water-use factor ÷ 1,000. Electricity = average IT MW × PUE × weather factor × 8,760 hours. The power figure annualizes the selected scenario; it is not a weather forecast.</p><table><caption>Illustrative cooling coefficients</caption><thead><tr><th>Cooling</th><th>PUE</th><th>Water L/kWh IT</th></tr></thead><tbody>${Object.values(
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
    this.render()
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
    this.choices = { ...DEFAULT_CHOICES }
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
    const credits = this.panel.querySelector('#credits-left')
    if (credits)
      credits.innerHTML = `${String(result.remaining)} <small>/ 100 credits</small>`
    this.panel.classList.toggle('over-budget', result.remaining < 0)
    const fill = this.panel.querySelector('#budget-fill')
    if (fill instanceof HTMLElement)
      fill.style.width = `${String(Math.max(0, Math.min(100, result.remaining)))}%`
    const challenge = this.panel.querySelector('#challenge-label')
    if (challenge)
      challenge.textContent =
        'Challenge: ' + WEATHER[this.weather].title.toLowerCase() + ' ⌄'
    const story = this.panel.querySelector('#weather-story')
    if (story) story.textContent = WEATHER[this.weather].description
    const targets = this.panel.querySelector('#mission-targets')
    if (targets) {
      const weatherTarget =
        this.weather === 'drought'
          ? 'Water ≤ 300 m³/day'
          : this.weather === 'heatwave'
            ? 'Shade ≥ 45'
            : 'Runoff ≤ 45'
      targets.innerHTML = [weatherTarget, 'Nature ≥ 55', 'Benefits ≥ 60']
        .map((label) => `<span>${label}</span>`)
        .join('')
    }
    const finding = this.panel.querySelector('#site-finding')
    if (finding) {
      finding.textContent =
        result.blockers[0] ??
        (this.site.flood
          ? '⚠ Mapped flood hazard here. A rain garden does not remove exposure.'
          : this.site.trees
            ? '⚠ The footprint contains street-tree records. Check the consequences.'
            : 'No mapped footprint conflict. Ownership and other constraints still need checking.')
      finding.classList.toggle(
        'warning',
        Boolean(result.blockers.length || this.site.flood || this.site.trees),
      )
    }
    const lesson = this.panel.querySelector('#cooling-lesson')
    if (lesson) lesson.textContent = COOLING[this.choices.cooling].lesson
    for (const button of this.panel.querySelectorAll<HTMLButtonElement>(
      '[data-choice]',
    )) {
      const group = button.dataset['choice'],
        value = button.dataset['value']
      const selected =
        group === 'cooling'
          ? this.choices.cooling === value
          : group === 'trees'
            ? String(this.choices.trees) === value
            : group === 'restoration'
              ? this.choices.restoration === value
              : group === 'training'
                ? this.choices.training
                : this.choices.access
      button.setAttribute('aria-pressed', String(selected))
    }
    for (const button of this.panel.querySelectorAll<HTMLButtonElement>(
      '[data-weather]',
    ))
      button.setAttribute(
        'aria-pressed',
        String(button.dataset['weather'] === this.weather),
      )
    for (const button of this.panel.querySelectorAll<HTMLButtonElement>(
      '[data-year]',
    ))
      button.setAttribute(
        'aria-pressed',
        String(button.dataset['year'] === String(this.year)),
      )
    const note = this.panel.querySelector('#livelihood-note')
    if (note)
      note.textContent =
        String(result.apprenticeships) +
        ' paid training places / year. ' +
        (this.choices.restoration === 'none'
          ? 'Restoration could also create land-care opportunities.'
          : 'Your restoration choice includes long-term land care.')
    const year = this.metrics.querySelector('#impact-year')
    if (year)
      year.textContent = this.year ? `YEAR ${String(this.year)}` : 'YEAR 0'
    const baseline = evaluatePlan(
      this.referenceSite,
      DEFAULT_CHOICES,
      this.year,
      this.weather,
    )
    const values = this.metrics.querySelector('#impact-values')
    const waterChange = Math.round((1 - result.water / baseline.water) * 100)
    const powerChange = Math.round((result.power / baseline.power - 1) * 100)
    if (values)
      values.innerHTML = [
        this.simpleMetric(
          'Water',
          result.water < 300
            ? 'Water-wise'
            : result.water > 500
              ? 'Thirsty'
              : 'Moderate',
          waterChange
            ? String(Math.abs(waterChange)) +
                '% ' +
                (waterChange > 0 ? 'less' : 'more') +
                ' than the start'
            : 'Your starting plan',
          waterChange > 0,
        ),
        this.simpleMetric(
          'Power',
          powerChange > 0 ? 'Uses more' : 'Starting use',
          powerChange
            ? '+' + String(powerChange) + '% electricity'
            : 'Your starting plan',
          false,
        ),
        this.simpleMetric(
          'Nature',
          result.nature > 55
            ? 'More life'
            : this.choices.trees || this.choices.restoration !== 'none'
              ? 'Growing'
              : 'Little cover',
          this.choices.trees
            ? String(this.year ? result.survivingTrees : this.choices.trees) +
                (this.year ? ' trees growing' : ' young trees')
            : this.choices.restoration !== 'none'
              ? 'New planting'
              : 'Try trees or a garden',
          result.nature > baseline.nature,
        ),
        this.simpleMetric(
          'Neighbors',
          this.choices.training || this.choices.access
            ? 'Something shared'
            : 'Not yet',
          this.choices.training && this.choices.access
            ? 'Skills + green space'
            : this.choices.training
              ? 'Paid training'
              : this.choices.access
                ? 'A place to walk'
                : 'What could you offer?',
          this.choices.training || this.choices.access,
        ),
      ].join('')
    const feed = this.panel.querySelector('#consequence-feed')
    if (feed)
      feed.innerHTML = result.feedback
        .map(
          (item) =>
            `<article class="consequence ${item.tone}"><strong>${item.title}</strong><p>${item.detail}</p></article>`,
        )
        .join('')
    const summary = this.panel.querySelector('#site-summary')
    if (summary)
      summary.textContent = `${result.feedback.filter((item) => item.tone === 'warning').length ? '⚠ ' : '↳ '}Read ${String(result.feedback.length)} consequences`
    const saved = this.panel.querySelector('#saved-plans')
    if (saved)
      saved.innerHTML = this.saved.length
        ? `<span class="land-label">YOUR EXPERIMENTS · YEAR 10</span>${this.saved.map((plan, index) => `<button data-restore="${String(index)}"><span>${plan.name}<small>${WEATHER[plan.weather].title} · ${String(plan.result.water)} m³/day</small></span><b>${String(plan.result.goals.filter((goal) => goal.passed).length)}/4<small>restore ↗</small></b></button>`).join('')}`
        : ''
  }
  private simpleMetric(
    label: string,
    value: string,
    note: string,
    positive: boolean,
  ): string {
    return `<div class="impact-metric simple"><span>${label}</span><strong>${value}</strong><em class="${positive ? 'improved' : ''}">${note}</em></div>`
  }
  private selectTab(tab: string): void {
    this.activeTab = tab
    this.panel.scrollTop = 0
    for (const item of this.panel.querySelectorAll<HTMLButtonElement>(
      '[data-tab]',
    )) {
      item.setAttribute('aria-selected', String(item.dataset['tab'] === tab))
      item.tabIndex = item.dataset['tab'] === tab ? 0 : -1
    }
    for (const section of this.panel.querySelectorAll<HTMLElement>(
      '[role="tabpanel"]',
    ))
      section.hidden = section.id !== 'choices-' + tab
    const next = this.panel.querySelector('[data-action="test"] > span')
    if (next)
      next.textContent =
        tab === 'cooling'
          ? 'Next: add nature'
          : tab === 'land'
            ? 'Next: share the benefits'
            : 'See it in 10 years'
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
    if (!(button instanceof HTMLButtonElement)) return
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
    if (group === 'training') this.choices.training = !this.choices.training
    if (group === 'access') this.choices.access = !this.choices.access
    if (weather || year || group) {
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
      if (this.activeTab === 'cooling') this.selectTab('land')
      else if (this.activeTab === 'land') this.selectTab('people')
      else this.showResults()
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
