import type { FeatureCollection, Polygon } from 'geojson'
import type { DataPack } from './data.ts'
import { campus, intersectingFeatures } from './geometry.ts'
import type { LngLat } from './geometry.ts'

export type Cooling = 'evaporative' | 'hybrid' | 'dry'
export type Restoration = 'none' | 'meadow' | 'rain-garden'
export type Weather = 'drought' | 'heatwave' | 'storm'
export type GameYear = 0 | 5 | 10
export interface PlanChoices {
  cooling: Cooling
  trees: 0 | 24 | 60
  restoration: Restoration
  training: boolean
  access: boolean
}
export interface SiteContext {
  buildings: number
  trees: number
  water: number
  parks: number
  flood: number
  heritage?: number
  heritageContext?: boolean
}
export interface Consequence {
  id: string
  tone: 'warning' | 'good' | 'info'
  title: string
  detail: string
}
export interface PlanResult {
  spent: number
  remaining: number
  water: number
  power: number
  nature: number
  community: number
  runoff: number
  shade: number
  survivingTrees: number
  apprenticeships: number
  goals: { label: string; passed: boolean }[]
  blockers: string[]
  feedback: Consequence[]
}

export const DEFAULT_CHOICES: PlanChoices = {
  cooling: 'evaporative',
  trees: 0,
  restoration: 'none',
  training: false,
  access: false,
}
export const COOLING = {
  evaporative: {
    title: 'Use water',
    cost: 0,
    pue: 1.25,
    wue: 1.8,
    summary: 'Less power. Much more water.',
    lesson:
      'Evaporating water carries heat away efficiently. That water must be replaced.',
  },
  hybrid: {
    title: 'Mix air + water',
    cost: 32,
    pue: 1.35,
    wue: 0.6,
    summary: 'Balance water and power.',
    lesson:
      'Dry cooling most of the time, with water assistance when it gets hot.',
  },
  dry: {
    title: 'Use air',
    cost: 44,
    pue: 1.48,
    wue: 0.03,
    summary: 'Save water. Use more power.',
    lesson:
      'Fans and mechanical cooling reject heat to the air. Hot days increase the electricity demand.',
  },
} as const
export const RESTORATION = {
  none: {
    title: 'No restoration',
    cost: 0,
    summary: 'Leave the landscape as it is.',
  },
  meadow: {
    title: 'Native meadow',
    cost: 18,
    summary: 'Restore soil and pollinator habitat.',
  },
  'rain-garden': {
    title: 'Rain garden',
    cost: 28,
    summary: 'Living soil slows and filters runoff.',
  },
} as const
export const WEATHER = {
  drought: {
    title: 'Dry summer',
    icon: '☀',
    description: 'Water is scarce. Can your design use less?',
    waterLimit: 300,
  },
  heatwave: {
    title: 'Heatwave',
    icon: '↗',
    description: 'Cooling works harder. Trees need time to offer shade.',
    waterLimit: 500,
  },
  storm: {
    title: 'Heavy rain',
    icon: '☂',
    description: 'Hard surfaces shed water. Give it somewhere to soak in.',
    waterLimit: 500,
  },
} as const
export const MODEL_SOURCES = [
  {
    title: 'LBNL · Data center energy and cooling',
    url: 'https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report.pdf',
    detail:
      'Cooling choices can trade water consumption against electricity use. Performance depends on climate and equipment.',
  },
  {
    title: 'EPA · Trees and vegetation',
    url: 'https://www.epa.gov/heatislands/benefits-trees-and-vegetation',
    detail:
      'Trees provide shade and habitat, intercept rain, and can improve public spaces. They need establishment and care.',
  },
  {
    title: 'EPA · Green infrastructure',
    url: 'https://www.epa.gov/water-research/green-and-gray-infrastructure-research',
    detail:
      'Rain gardens and living soils capture and filter rainfall. A site design still needs hydrological assessment.',
  },
] as const

export function assessSite(
  pack: Pick<DataPack, 'layers'>,
  center: LngLat,
  bearing: number,
): SiteContext {
  const proposal = campus(center, bearing)
  const pad = proposal.volumes.features[0]
  const area: FeatureCollection<Polygon> = {
    type: 'FeatureCollection',
    features: pad ? [pad] : proposal.footprints.features,
  }
  return {
    buildings: intersectingFeatures(area, pack.layers.buildings),
    trees: intersectingFeatures(area, pack.layers.trees),
    water: intersectingFeatures(area, {
      type: 'FeatureCollection',
      features: pack.layers.water.features.filter(
        (f) => f.properties?.['class'] !== 'swimming_pool',
      ),
    }),
    parks: intersectingFeatures(area, pack.layers.parks),
    heritage: pack.layers.heritage
      ? intersectingFeatures(area, pack.layers.heritage)
      : 0,
    heritageContext: Boolean(pack.layers.heritage?.features.length),
    flood: intersectingFeatures(area, {
      type: 'FeatureCollection',
      features: pack.layers.flood.features.filter(
        (f) => f.properties?.['SFHATF'] === 'T',
      ),
    }),
  }
}

const clamp = (value: number): number =>
  Math.round(Math.max(0, Math.min(100, value)))
export function evaluatePlan(
  site: SiteContext,
  choices: PlanChoices,
  year: GameYear,
  weather: Weather,
): PlanResult {
  const cooling = COOLING[choices.cooling]
  const treeCost = choices.trees === 60 ? 30 : choices.trees === 24 ? 14 : 0
  const spent =
    cooling.cost +
    treeCost +
    RESTORATION[choices.restoration].cost +
    (choices.training ? 12 : 0) +
    (choices.access ? 10 : 0)
  const remaining = 100 - spent
  const growth = year === 0 ? 0.12 : year === 5 ? 0.55 : 1
  const recovery =
    choices.restoration === 'none'
      ? 0
      : year === 0
        ? 0.2
        : year === 5
          ? 0.65
          : 1
  const survivingTrees = Math.round(
    choices.trees * (weather === 'drought' ? 0.82 : 0.9),
  )
  // All coefficients below are explicit game assumptions, not measurements of SJDC04.
  // 24 MW illustrative IT capacity × 70% average load; WUE uses IT energy.
  const itMW = 24 * 0.7
  const hotPower =
    weather === 'heatwave'
      ? choices.cooling === 'dry'
        ? 1.18
        : choices.cooling === 'hybrid'
          ? 1.1
          : 1.06
      : 1
  const waterMultiplier =
    weather === 'heatwave' ? 1.3 : weather === 'drought' ? 1.12 : 1
  const water = Math.round(
    itMW * 24 * cooling.wue * waterMultiplier +
      choices.trees * (year === 0 ? 0.008 : 0.003),
  )
  const power =
    Math.round(((itMW * cooling.pue * hotPower * 8760) / 1000) * 10) / 10
  const shade = clamp(survivingTrees * growth * 1.3)
  const nature = clamp(
    18 +
      survivingTrees * growth * 0.65 +
      (choices.restoration === 'meadow'
        ? 40
        : choices.restoration === 'rain-garden'
          ? 32
          : 0) *
        recovery -
      site.trees * 4 -
      (site.water || site.parks ? 25 : 0),
  )
  const runoff = clamp(
    88 -
      (choices.restoration === 'rain-garden'
        ? 56
        : choices.restoration === 'meadow'
          ? 30
          : 0) *
        recovery -
      survivingTrees * growth * 0.25,
  )
  const community = clamp(
    28 +
      (choices.training ? 25 : 0) +
      (choices.access ? 20 : 0) +
      shade * 0.18 +
      (choices.restoration === 'none' ? 0 : 8 * recovery) -
      site.buildings * 12 -
      site.trees * 2 -
      (site.water || site.parks ? 20 : 0),
  )
  const blockers: string[] = []
  if (site.heritage)
    blockers.push(
      'The campus covers a documented memorial point. Preserve this place of remembrance; upgrades do not cancel the cultural loss.',
    )
  if (site.buildings)
    blockers.push(
      'The campus overlaps mapped buildings. Relocate before committing.',
    )
  if (site.water)
    blockers.push(
      'The campus intersects a mapped waterbody. Keep development out of the river corridor.',
    )
  if (site.parks)
    blockers.push(
      'The campus overlaps a mapped park or trail corridor. Preserve public access and relocate.',
    )
  if (remaining < 0)
    blockers.push('Your upgrades exceed the 100-credit game budget.')
  const goals = [
    {
      label:
        weather === 'storm'
          ? 'Runoff index ≤ 45'
          : weather === 'heatwave'
            ? 'Shade index ≥ 45'
            : 'Direct water ≤ 300 m³/day',
      passed:
        weather === 'storm'
          ? runoff <= 45
          : weather === 'heatwave'
            ? shade >= 45
            : water <= 300,
    },
    { label: 'Nature score ≥ 55', passed: nature >= 55 },
    { label: 'Local benefits ≥ 60', passed: community >= 60 },
    {
      label: 'No footprint conflicts + within budget',
      passed: blockers.length === 0,
    },
  ]
  const feedback: Consequence[] = []
  if (site.heritage)
    feedback.push({
      id: 'heritage',
      tone: 'warning',
      title: 'A memorial is in the footprint',
      detail:
        'This footprint covers the documented Heroes’ Grove WWI memorial point. Cooling, training and planting do not replace a community’s place of remembrance. The mapped point is not the monument’s surveyed extent.',
    })
  if (site.buildings)
    feedback.push({
      id: 'buildings',
      tone: 'warning',
      title: `${String(site.buildings)} mapped building overlap${site.buildings === 1 ? '' : 's'}`,
      detail:
        'Trees and efficient cooling cannot undo displacement. Try a different site.',
    })
  if (site.water || site.parks)
    feedback.push({
      id: 'corridor',
      tone: 'warning',
      title: 'Protect the river and public space',
      detail:
        'This footprint touches a mapped waterbody, park, or trail corridor. Move the campus; restoration elsewhere does not cancel this impact.',
    })
  if (site.trees)
    feedback.push({
      id: 'trees',
      tone: 'warning',
      title: `${String(site.trees)} street-tree record${site.trees === 1 ? '' : 's'} in the footprint`,
      detail:
        'New saplings do not immediately replace mature canopy. This inventory excludes many trees on private land.',
    })
  if (site.flood)
    feedback.push({
      id: 'flood',
      tone: 'warning',
      title: 'Mapped flood hazard',
      detail:
        'The flood map flags this spot. A rain garden helps with rainwater but does not remove flood exposure. Ask a planner what protection is needed.',
    })
  feedback.push({
    id: 'cooling',
    tone: choices.cooling === 'evaporative' ? 'warning' : 'info',
    title: cooling.title + ': a resource trade-off',
    detail: cooling.lesson,
  })
  if (choices.trees)
    feedback.push({
      id: 'growth',
      tone: 'good',
      title:
        year === 0
          ? 'Small trees, a long-term promise'
          : `${String(survivingTrees)} trees thriving in this game scenario`,
      detail:
        year === 0
          ? 'Shade begins small. Fast-forward to see canopy grow; planting and care use budget and water.'
          : 'Established trees add shade and habitat. Our survival and growth rates are game assumptions, not a tree-growth forecast.',
    })
  if (choices.restoration !== 'none')
    feedback.push({
      id: 'restoration',
      tone: 'good',
      title:
        choices.restoration === 'meadow'
          ? 'Land can recover'
          : 'Make room for the rain',
      detail:
        choices.restoration === 'meadow'
          ? 'Native plants and restored soil create habitat and reduce hard-surface runoff. Recovery and stewardship take time.'
          : 'A planted depression slows and filters runoff. Its real capacity depends on soil, rainfall, design, and maintenance.',
    })
  if (choices.training || choices.access)
    feedback.push({
      id: 'people',
      tone: 'good',
      title: 'Share the benefits',
      detail: choices.training
        ? 'Your fictional agreement funds 12 paid training places each year. The game counts access to skills separately from permanent jobs.'
        : 'A public walking space shares part of the landscape with neighbors. It is a proposed amenity, not an existing public right of way.',
    })
  return {
    spent,
    remaining,
    water,
    power,
    nature,
    community,
    runoff,
    shade,
    survivingTrees,
    apprenticeships: choices.training ? 12 : 0,
    goals,
    blockers,
    feedback,
  }
}
