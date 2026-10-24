import type { LandingState, LandingStore } from '../../app/state.ts'
import {
  findRegion,
  isBrowsable,
  isSelectable,
  leafRegions,
  regions,
  type Region,
} from '../../regions/regions.ts'
import { mountCreditsPanel } from '../../ui/creditsPanel.ts'
import { OVERVIEW, type LandingGlobe } from './landingGlobe.ts'
import '../../ui/ui.css'
import './landing.css'

const HEADLINE = 'Landshift: how our Earth is changing'
const CTA_LABEL = "Learn what's happening in this area"
const LOAD_FAILED_MESSAGE = 'The game could not load.'

let mountCount = 0

export interface LandingOptions {
  /** Caller-owned globe host; landing moves it into the globe cell and never replaces its contents. */
  globeHost: HTMLElement
  globe: LandingGlobe
  /** Called on `startGame`; the caller swaps in the game or dispatches `handoffFailed`. */
  onHandoff: (regionId: string) => void
}

interface TreeNode {
  region: Region
  parent: TreeNode | null
  item: HTMLLIElement
  row: HTMLDivElement
  /** Present only for browsable containers. */
  group: HTMLUListElement | null
  children: TreeNode[]
}

interface RegionTreeOptions {
  idPrefix: string
  labelledBy: string
  /** Ids of expanded containers; the tree updates it so expansion survives re-rendering. */
  expanded: Set<string>
  onHover: (regionId: string | null) => void
  onSelect: (regionId: string) => void
}

interface RegionTree {
  element: HTMLUListElement
  /** Focuses `regionId`, revealing it, or the current roving item when `null` or unknown. */
  focus(regionId: string | null): void
  setHovered(regionId: string | null): void
}

function requireRegion(id: string): Region {
  const region = findRegion(id)
  if (!region) throw new Error(`Unknown region: ${id}`)
  return region
}

function browsableIds(list: readonly Region[]): string[] {
  return list.flatMap((region) =>
    isBrowsable(region) ? [region.id, ...browsableIds(region.children)] : [],
  )
}

function createButton(
  label: string,
  className: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  button.textContent = label
  button.addEventListener('click', onClick)
  return button
}

function createBackButton(onClick: () => void): HTMLButtonElement {
  const button = createButton('Back', 'ui-button ui-button-quiet', onClick)
  const arrow = document.createElement('span')
  arrow.setAttribute('aria-hidden', 'true')
  arrow.textContent = '←'
  button.prepend(arrow)
  button.classList.add('landing-back')
  return button
}

function createTitle(text: string, className: string): HTMLHeadingElement {
  const title = document.createElement('h1')
  title.className = className
  title.textContent = text
  return title
}

function createRegionTree(options: RegionTreeOptions): RegionTree {
  const nodesByItem = new Map<Element, TreeNode>()
  const nodesById = new Map<string, TreeNode>()

  const element = document.createElement('ul')
  element.className = 'landing-tree'
  element.setAttribute('role', 'tree')
  element.setAttribute('aria-labelledby', options.labelledBy)

  function isExpanded(node: TreeNode): boolean {
    return node.group !== null && options.expanded.has(node.region.id)
  }

  function setExpanded(node: TreeNode, expanded: boolean): void {
    if (!node.group) return
    node.item.setAttribute('aria-expanded', String(expanded))
    node.group.hidden = !expanded
    if (expanded) {
      options.expanded.add(node.region.id)
    } else {
      options.expanded.delete(node.region.id)
    }
  }

  function buildNode(region: Region, parent: TreeNode | null): TreeNode {
    const item = document.createElement('li')
    item.className = 'landing-tree-item'
    item.setAttribute('role', 'treeitem')
    item.tabIndex = -1

    const icon = document.createElement('span')
    icon.className = 'landing-tree-icon'
    icon.setAttribute('aria-hidden', 'true')

    const label = document.createElement('span')
    label.className = 'landing-tree-label'
    label.id = `${options.idPrefix}-${region.id}-label`
    label.textContent = region.label
    item.setAttribute('aria-labelledby', label.id)

    const row = document.createElement('div')
    row.className = 'landing-tree-row'
    row.append(icon, label)
    item.append(row)

    if (!region.enabled) {
      const badge = document.createElement('span')
      badge.className = 'landing-tree-badge'
      badge.id = `${options.idPrefix}-${region.id}-status`
      badge.textContent = 'Coming soon'
      row.append(badge)
      item.setAttribute('aria-disabled', 'true')
      item.setAttribute('aria-describedby', badge.id)
    }
    if (isSelectable(region)) item.classList.add('is-selectable')

    const group = isBrowsable(region) ? document.createElement('ul') : null
    const node: TreeNode = { region, parent, item, row, group, children: [] }
    if (group) {
      group.className = 'landing-tree-group'
      group.setAttribute('role', 'group')
      for (const child of region.children) {
        const childNode = buildNode(child, node)
        node.children.push(childNode)
        group.append(childNode.item)
      }
      item.append(group)
      setExpanded(node, options.expanded.has(region.id))
    }

    nodesByItem.set(item, node)
    nodesById.set(region.id, node)
    return node
  }

  const roots = regions.map((region) => buildNode(region, null))
  element.append(...roots.map((node) => node.item))

  let active = roots[0]
  if (active) active.item.tabIndex = 0
  let hovered: TreeNode | undefined

  function visibleNodes(): TreeNode[] {
    const visible: TreeNode[] = []
    const visit = (nodes: readonly TreeNode[]): void => {
      for (const node of nodes) {
        visible.push(node)
        if (isExpanded(node)) visit(node.children)
      }
    }
    visit(roots)
    return visible
  }

  function setActive(node: TreeNode): void {
    if (active) active.item.tabIndex = -1
    active = node
    node.item.tabIndex = 0
  }

  function focusNode(node: TreeNode | null | undefined): void {
    if (!node) return
    for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
      setExpanded(ancestor, true)
    }
    setActive(node)
    node.item.focus()
  }

  function nodeFor(target: EventTarget | null): TreeNode | undefined {
    if (!(target instanceof Element)) return undefined
    const item = target.closest('[role="treeitem"]')
    return item ? nodesByItem.get(item) : undefined
  }

  // Group padding sits inside the parent item, so only the item itself or its row counts as a hit.
  function hitNodeFor(target: EventTarget | null): TreeNode | undefined {
    if (!(target instanceof Element)) return undefined
    return (
      nodesByItem.get(target) ?? nodeFor(target.closest('.landing-tree-row'))
    )
  }

  function activate(node: TreeNode): void {
    if (!node.region.enabled) return
    if (node.group) {
      setExpanded(node, !isExpanded(node))
    } else if (isSelectable(node.region)) {
      options.onSelect(node.region.id)
    }
  }

  element.addEventListener('keydown', (event) => {
    const node = nodeFor(event.target)
    if (!node || event.altKey || event.ctrlKey || event.metaKey) return
    const visible = visibleNodes()
    const index = visible.indexOf(node)
    switch (event.key) {
      case 'ArrowDown':
        focusNode(visible[index + 1])
        break
      case 'ArrowUp':
        focusNode(visible[index - 1])
        break
      case 'ArrowRight':
        if (node.group && !isExpanded(node)) {
          setExpanded(node, true)
        } else if (isExpanded(node)) {
          focusNode(node.children[0])
        }
        break
      case 'ArrowLeft':
        if (isExpanded(node)) {
          setExpanded(node, false)
        } else {
          focusNode(node.parent)
        }
        break
      case 'Home':
        focusNode(visible[0])
        break
      case 'End':
        focusNode(visible.at(-1))
        break
      case 'Enter':
      case ' ':
        if (!event.repeat) activate(node)
        break
      default:
        return
    }
    event.preventDefault()
  })

  element.addEventListener('click', (event) => {
    const node = hitNodeFor(event.target)
    if (node) activate(node)
  })

  element.addEventListener('focusin', (event) => {
    const node = nodeFor(event.target)
    if (!node) return
    setActive(node)
    options.onHover(node.region.id)
  })

  element.addEventListener('focusout', (event) => {
    if (
      event.relatedTarget instanceof Node &&
      element.contains(event.relatedTarget)
    ) {
      return
    }
    options.onHover(null)
  })

  element.addEventListener('pointerover', (event) => {
    const node = hitNodeFor(event.target)
    if (node) options.onHover(node.region.id)
  })

  element.addEventListener('pointerleave', () => {
    options.onHover(nodeFor(document.activeElement)?.region.id ?? null)
  })

  return {
    element,
    focus(regionId: string | null): void {
      const target = regionId === null ? undefined : nodesById.get(regionId)
      focusNode(target ?? active)
    },
    setHovered(regionId: string | null): void {
      hovered?.row.classList.remove('is-hovered')
      hovered = regionId === null ? undefined : nodesById.get(regionId)
      hovered?.row.classList.add('is-hovered')
    },
  }
}

/**
 * Renders the landing screen into `root`, moves `options.globeHost` into its globe cell,
 * and keeps both in sync with `store`. Returns a cleanup function.
 */
export function mountLanding(
  root: HTMLElement,
  store: LandingStore,
  options: LandingOptions,
): () => void {
  const { globe } = options
  mountCount += 1
  const idPrefix = `landing-${String(mountCount)}`
  const expanded = new Set(browsableIds(regions))

  const globeCell = document.createElement('div')
  globeCell.className = 'landing-globe'
  globeCell.append(options.globeHost)

  const creditsSlot = document.createElement('div')
  creditsSlot.className = 'landing-credits'

  const panel = document.createElement('main')
  panel.className = 'landing-panel'

  // Persistent so screen readers register it before any message is written.
  const alertRegion = document.createElement('div')
  alertRegion.className = 'ui-visually-hidden'
  alertRegion.setAttribute('role', 'alert')

  const container = document.createElement('div')
  container.className = 'landing'
  container.append(globeCell, creditsSlot, panel, alertRegion)
  root.replaceChildren(container)

  const removeCredits = mountCreditsPanel(creditsSlot)

  globe.setMarkers(
    leafRegions.map((region) => ({
      id: region.id,
      lat: region.center.lat,
      lng: region.center.lng,
      label: region.label,
      enabled: region.enabled,
    })),
  )

  const removeMarkerListener = globe.onMarkerClick((regionId) => {
    store.dispatch({ type: 'selectRegion', regionId })
  })

  let current: LandingState | null = null
  let tree: RegionTree | null = null
  let pausedByLanding = false
  let disposed = false
  let cameraAtOverview = true
  let overviewFlight: Promise<void> = Promise.resolve()

  function flyToOverview(): void {
    cameraAtOverview = true
    overviewFlight = globe.flyTo(OVERVIEW)
  }

  function showView(...children: HTMLElement[]): void {
    const view = document.createElement('div')
    view.className = 'landing-view'
    view.append(...children)
    panel.replaceChildren(view)
  }

  function back(): void {
    store.dispatch({ type: 'back' })
  }

  function setPaused(paused: boolean): void {
    if (paused === pausedByLanding) return
    pausedByLanding = paused
    if (paused) {
      globe.pause()
    } else {
      globe.resume()
    }
  }

  function showIdle(
    state: Extract<LandingState, { screen: 'idle' }>,
    previous: LandingState | null,
  ): void {
    const explore = createButton(
      'Explore',
      'ui-button ui-button-primary',
      () => {
        store.dispatch({ type: 'explore' })
      },
    )
    showView(createTitle(HEADLINE, 'landing-headline'), explore)
    globe.highlightMarker(null)
    if (!previous) return
    explore.focus()
    if (!cameraAtOverview) flyToOverview()
    void overviewFlight.then(() => {
      // Identity check: a later return to idle creates a new state object and owns rotation.
      if (!disposed && store.get() === state) globe.setAutoRotate(true)
    })
  }

  function showExplore(
    state: Extract<LandingState, { screen: 'explore' }>,
    previous: LandingState | null,
  ): void {
    const title = createTitle('Choose a region', 'landing-title')
    title.id = `${idPrefix}-regions-title`
    const regionTree = createRegionTree({
      idPrefix,
      labelledBy: title.id,
      expanded,
      onHover: (regionId) => {
        store.dispatch({ type: 'hoverRegion', regionId })
      },
      onSelect: (regionId) => {
        store.dispatch({ type: 'selectRegion', regionId })
      },
    })
    tree = regionTree
    regionTree.setHovered(state.hoveredRegionId)
    showView(createBackButton(back), title, regionTree.element)
    globe.highlightMarker(state.hoveredRegionId)
    if (!previous) return
    if (previous.screen === 'regionFocused') {
      flyToOverview()
      regionTree.focus(previous.regionId)
    } else {
      regionTree.focus(null)
    }
  }

  function showRegion(
    state: Extract<LandingState, { screen: 'regionFocused' }>,
    previous: LandingState | null,
  ): void {
    const region = requireRegion(state.regionId)
    const loadFailed = previous?.screen === 'handoff'

    const title = createTitle(region.label, 'landing-title')
    title.tabIndex = -1
    const summary = document.createElement('p')
    summary.className = 'landing-summary'
    summary.textContent = `Cities, farms, and wild land in ${region.label} are competing for the same soil and water, and the choices made now will shape it for decades.`
    const cta = createButton(CTA_LABEL, 'ui-button ui-button-primary', () => {
      store.dispatch({ type: 'startGame' })
    })
    globe.highlightMarker(region.id)

    if (!loadFailed) {
      showView(createBackButton(back), title, summary, cta)
      cameraAtOverview = false
      void globe.flyTo({ ...region.center, altitude: region.altitude })
      if (previous) title.focus()
      return
    }

    const message = document.createElement('p')
    message.className = 'landing-error'
    message.textContent = LOAD_FAILED_MESSAGE
    const retry = createButton(
      'Try again',
      'ui-button ui-button-primary',
      () => {
        store.dispatch({ type: 'startGame' })
      },
    )
    const reload = createButton('Reload', 'ui-button', () => {
      window.location.reload()
    })
    showView(createBackButton(back), title, summary, message, retry, reload)
    alertRegion.textContent = LOAD_FAILED_MESSAGE
    retry.focus()
  }

  function showHandoff(
    state: Extract<LandingState, { screen: 'handoff' }>,
  ): void {
    const status = document.createElement('p')
    status.className = 'landing-status'
    status.tabIndex = -1
    status.textContent = 'Loading the game…'
    showView(
      createTitle(requireRegion(state.regionId).label, 'landing-title'),
      status,
    )
    status.focus()
    try {
      options.onHandoff(state.regionId)
    } catch (error: unknown) {
      console.error('Game handoff failed', error)
      store.dispatch({ type: 'handoffFailed' })
    }
  }

  function render(next: LandingState): void {
    const previous = current
    current = next

    if (previous?.screen === 'explore' && next.screen === 'explore') {
      tree?.setHovered(next.hoveredRegionId)
      globe.highlightMarker(next.hoveredRegionId)
      return
    }

    tree = null
    alertRegion.textContent = ''
    setPaused(next.screen === 'handoff')
    switch (next.screen) {
      case 'idle':
        showIdle(next, previous)
        break
      case 'explore':
        showExplore(next, previous)
        break
      case 'regionFocused':
        showRegion(next, previous)
        break
      case 'handoff':
        showHandoff(next)
        break
    }
  }

  const unsubscribe = store.subscribe(render)
  render(store.get())

  return () => {
    if (disposed) return
    disposed = true
    unsubscribe()
    removeMarkerListener()
    removeCredits()
    globe.setMarkers([])
    globe.highlightMarker(null)
    // Teardown during handoff means the caller has taken the globe over.
    if (pausedByLanding && store.get().screen !== 'handoff') globe.resume()
    container.remove()
  }
}
