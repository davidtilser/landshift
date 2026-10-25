import {
  createButton,
  createButtonGroup,
  createDepthStack,
  createFocusSpecimen,
  createSurface,
  createTypeSample,
} from './index.ts'

const gameFont =
  "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

export function mountSystem(root: HTMLElement): void {
  const grid = document.createElement('div')
  grid.className = 'compare'
  grid.append(
    systemColumn(
      'Dark',
      'Panel sits above the page. Ink is --ls-fg. Focus is white.',
      'dark',
    ),
    systemColumn(
      'Light',
      'Panel sits above the page. Ink is --ls-menu-fg. Focus is black.',
      'light',
    ),
  )
  const layers = document.createElement('div')
  layers.className = 'compare'
  layers.append(
    layerColumn(
      'Dark layers',
      'System. Page, panel, then raised. Inset sits below the panel. The overlay sits on a scrim. Selected is not the primary fill. Status marks are not buttons.',
      'dark',
    ),
    layerColumn(
      'Light layers',
      'System. The page is under a near-paper panel with a white rim. Raised is paper. Inset is the well. Scrim is translucent. The same status roles, not action or muted.',
      'light',
    ),
  )
  root.append(grid, layers)
}

export function mountExploration(root: HTMLElement): void {
  const title = document.createElement('h2')
  title.textContent = 'Exploration'
  const lede = document.createElement('p')
  lede.className = 'lede'
  lede.textContent =
    'Earlier passes. These columns record the menus as they are now and a palette-only proposal. They are not competing choices. The system above is the one in use.'
  const grid = document.createElement('div')
  grid.className = 'compare'
  grid.append(existingColumn(), proposedColumn())
  root.append(title, lede, grid, referenceNotes(), tokenPlan())
}

function existingColumn(): HTMLDivElement {
  return column(
    'Existing',
    'Menu colors already use the palette, plus local mixes. Studio and polo colors are hardcoded.',
    [
      block(
        menuSpecimen(),
        'landing.css and ui.css. Panel, border, and muted text are local mixes. Primary fill is --ls-source-wordmark-bottom. Focus is --ls-focus.',
      ),
      block(
        studioSpecimen(),
        'src/game/style.css. No palette tokens. Canvas #e6e4d7, panel #fafbf6, ink #253b32, primary #3e6248, focus #c19053. Type is Inter.',
      ),
      block(
        poloSpecimen(),
        'src/game/polo/style.css. No palette tokens. Ink #21162f, action #b6ee00, focus #7226e8. Type follows the studio font.',
      ),
    ],
  )
}

function proposedColumn(): HTMLDivElement {
  return column(
    'Proposed',
    'The same components on the dark menu sheet and the light game sheet. Paper focus uses earth because sand fails on paper.',
    [
      block(
        proposedSpecimen('ground'),
        'Dark sheet uses the landing panel mixes. Action fill is the wordmark bottom source. Focus is --ls-focus. Type is Fredoka.',
      ),
      block(
        proposedSpecimen('paper'),
        'Light sheet is --ls-fg with --ls-menu-fg ink. Muted text is --ls-muted-on-paper. Focus is --ls-earth.',
      ),
    ],
  )
}

function layerColumn(
  title: string,
  note: string,
  tone: 'dark' | 'light',
): HTMLDivElement {
  return column(title, note, [createDepthStack(tone)])
}

function systemColumn(
  title: string,
  note: string,
  tone: 'dark' | 'light',
): HTMLDivElement {
  return column(title, note, [systemSpecimen(tone)])
}

function systemSpecimen(tone: 'dark' | 'light'): HTMLElement {
  return createSurface(tone, [
    createTypeSample({
      label: 'Region',
      title: 'Landshift',
      body: 'The quick brown fox jumps.',
    }),
    primaryStates(),
    createButtonGroup([
      createButton('Selected', 'selected'),
      createButton('Default', 'default'),
      createButton('Quiet', 'quiet'),
    ]),
    createFocusSpecimen(),
  ])
}

function primaryStates(): HTMLDivElement {
  const row = document.createElement('div')
  row.className = 'ls-primary-states'
  row.append(
    primaryState('Rest', ''),
    primaryState('Hover', 'ls-primary-hover'),
    primaryState('Pressed', 'ls-primary-press'),
  )
  return row
}

function primaryState(name: string, stateClass: string): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'ls-primary-state'
  const button = createButton('Primary', 'primary')
  if (stateClass) button.classList.add(stateClass)
  const caption = document.createElement('span')
  caption.textContent = name
  wrap.append(button, caption)
  return wrap
}

const un75Pdf =
  'https://www.un.org/sites/un2.un.org/files/2020/03/un75_logo_guidelines_oct_2019.pdf'

function referenceNotes(): HTMLDivElement {
  const notes = document.createElement('div')
  notes.className = 'compare-facts'
  notes.append(
    fact(
      'The colours approved for the UN75 logo are Pantone 540 C, R3 G41 B68, #022944; Pantone 2925 C, R0 G158 B219, #009EDB; and white, R255 G255 B255, #FFFFFF.',
      un75Pdf,
    ),
    fact(
      'Futura LT Pro Extra Bold Condensed, in all caps, is for taglines, slogans, and main headings. Bold Condensed is for subheadings. Medium Condensed is for third-level headings. That Extra Bold Condensed face is the main typeface for this visual identity, and it is not for body text. When Futura LT Pro is not available, Raleway Black in all caps is for Latin headings, and Barlow Regular in upper and lower case is for paragraphs.',
      un75Pdf,
    ),
    fact(
      'Roboto Condensed Bold is named for Russian headlines and subheadings. Noto Kufi Arabic Bold is for Arabic headlines, and Noto Sans CJK SC Black is for Chinese headlines.',
      un75Pdf,
    ),
    fact(
      'Unless authorized in writing, use of the UN75 logo should cease by 31 December 2020.',
      un75Pdf,
    ),
    fact(
      'The logo must not be given a drop shadow, a colour change, an opacity change, distortion, reassembly, or a font change. Clear space around the identifier is 0.5 inch. The arrow may be used on its own as a supporting graphic. For social media photos, a blue gradient of RGB (30, 123, 172) is recommended over about the top third of the image.',
      un75Pdf,
    ),
    judgment(
      'These notes do not set fills or type. The system uses Fredoka in all caps for titles and Roboto for body text and controls. Primary stays --ls-source-wordmark-bottom. Selected is a separate role. Focus is --ls-fg on the dark sheet and #000000 on the light sheet.',
    ),
  )
  return notes
}

function fact(text: string, url: string): HTMLParagraphElement {
  const element = document.createElement('p')
  element.className = 'compare-fact'
  element.append(text, ' ')
  const link = document.createElement('a')
  link.href = url
  link.textContent = url
  element.append(link)
  return element
}

function judgment(text: string): HTMLParagraphElement {
  const element = document.createElement('p')
  element.className = 'compare-judgment'
  const label = document.createElement('span')
  label.className = 'compare-judgment-label'
  label.textContent = 'Reference'
  element.append(label, text)
  return element
}

function proposedSpecimen(tone: 'ground' | 'paper'): HTMLElement {
  const surface = document.createElement('section')
  surface.className =
    tone === 'ground' ? 'ls-surface' : 'ls-surface ls-surface-paper'
  surface.append(
    createTypeSample(),
    createButtonGroup([
      createButton('Primary', 'primary'),
      createButton('Default', 'default'),
      createButton('Quiet', 'quiet'),
    ]),
    createFocusSpecimen(),
  )
  return surface
}

function menuSpecimen(): HTMLElement {
  const specimen = shell({
    background: 'color-mix(in srgb, var(--ls-bg) 86%, transparent)',
    color: 'var(--ls-fg)',
    border: '1px solid color-mix(in srgb, var(--ls-fg) 14%, transparent)',
    'border-radius': '16px',
    'font-family': 'var(--ls-font-ui)',
  })
  specimen.append(
    copyLine('specimen-label', 'Region', {
      color: 'color-mix(in srgb, var(--ls-fg) 70%, transparent)',
    }),
    copyLine('specimen-title', 'Menu title', { color: 'var(--ls-fg)' }),
    copyLine('specimen-body', 'Menu and interface text.', {
      color: 'var(--ls-fg)',
    }),
    actions(
      specimenButton('Primary', {
        background: 'var(--ls-source-wordmark-bottom)',
        color: 'var(--ls-bg)',
        border: '1px solid transparent',
        'border-radius': '999px',
        'font-weight': '600',
      }),
      specimenButton('Default', {
        background: 'transparent',
        color: 'var(--ls-fg)',
        border: '1px solid color-mix(in srgb, var(--ls-fg) 35%, transparent)',
        'border-radius': '999px',
      }),
      specimenButton('Quiet', {
        background: 'transparent',
        color: 'color-mix(in srgb, var(--ls-fg) 72%, transparent)',
        border: '1px solid transparent',
        'border-radius': '999px',
        'min-height': '36px',
      }),
      specimenFocus({
        color: 'var(--ls-fg)',
        outline: '2px solid var(--ls-focus)',
        'border-radius': '999px',
      }),
    ),
  )
  return specimen
}

function studioSpecimen(): HTMLElement {
  const specimen = shell({
    background: '#fafbf6',
    color: '#253b32',
    border: '1px solid #ffffff99',
    'border-radius': '13px',
    'font-family': gameFont,
    'font-size': '13px',
  })
  specimen.append(
    copyLine('specimen-label', 'Project', {
      color: '#6c7d63',
      'font-size': '8px',
      'font-weight': '650',
      'letter-spacing': '0.13em',
      'text-transform': 'none',
    }),
    copyLine('specimen-title', 'Studio title', {
      color: '#2c4436',
      'font-size': '40px',
      'font-weight': '480',
      'letter-spacing': '-1.9px',
    }),
    copyLine('specimen-body', 'Studio interface text.', {
      color: '#7b887b',
      'font-size': '12px',
    }),
    actions(
      specimenButton('Primary', {
        background: '#3e6248',
        color: '#f5f7ec',
        border: '0',
        'border-radius': '6px',
        'font-size': '11px',
      }),
      specimenButton('Default', {
        background: 'transparent',
        color: '#253b32',
        border: '1px solid #d4dbce',
        'border-radius': '6px',
        'font-size': '11px',
      }),
      specimenFocus({
        color: '#253b32',
        outline: '3px solid #c19053',
        'outline-offset': '4px',
        'border-radius': '6px',
        'font-size': '11px',
      }),
    ),
  )
  return specimen
}

function poloSpecimen(): HTMLElement {
  const specimen = shell({
    background: '#ffffff',
    color: '#21162f',
    border: '1px solid #e4d9f4',
    'border-radius': '24px',
    'font-family': gameFont,
  })
  specimen.append(
    copyLine('specimen-label', 'Place', {
      color: '#7b6198',
      'font-size': '12px',
      'font-weight': '750',
      'letter-spacing': '1.1px',
      'text-transform': 'none',
    }),
    copyLine('specimen-title', 'Polo title', {
      color: '#21162f',
      'font-size': '34px',
      'font-weight': '720',
      'letter-spacing': '-1px',
    }),
    copyLine('specimen-body', 'Polo interface text.', {
      color: '#6c6179',
      'font-size': '16px',
    }),
    actions(
      specimenButton('Primary', {
        background: '#b6ee00',
        color: '#21162f',
        border: '0',
        'border-radius': '12px',
        'font-size': '16px',
        'font-weight': '720',
      }),
      specimenButton('Default', {
        background: '#f5f0fc',
        color: '#5f497d',
        border: '1px solid #dfd5ed',
        'border-radius': '11px',
        'font-size': '13px',
      }),
      specimenButton('Quiet', {
        background: 'transparent',
        color: '#6c567f',
        border: '0',
        'border-radius': '12px',
        'font-size': '15px',
      }),
      specimenFocus({
        color: '#21162f',
        outline: '3px solid #7226e8',
        'border-radius': '12px',
      }),
    ),
  )
  return specimen
}

function column(
  title: string,
  note: string,
  blocks: readonly HTMLElement[],
): HTMLDivElement {
  const element = document.createElement('div')
  element.className = 'compare-column'
  const heading = document.createElement('h3')
  heading.textContent = title
  const copy = document.createElement('p')
  copy.className = 'compare-note'
  copy.textContent = note
  element.append(heading, copy, ...blocks)
  return element
}

function block(specimen: HTMLElement, text: string): HTMLDivElement {
  const element = document.createElement('div')
  element.className = 'specimen-block'
  const note = document.createElement('p')
  note.className = 'specimen-caption'
  note.textContent = text
  element.append(specimen, note)
  return element
}

function shell(declarations: Readonly<Record<string, string>>): HTMLElement {
  const element = document.createElement('article')
  element.className = 'specimen'
  paint(element, declarations)
  return element
}

function copyLine(
  className: string,
  text: string,
  declarations: Readonly<Record<string, string>>,
): HTMLParagraphElement {
  const element = document.createElement('p')
  element.className = className
  element.textContent = text
  paint(element, declarations)
  return element
}

function actions(...controls: readonly HTMLElement[]): HTMLDivElement {
  const element = document.createElement('div')
  element.className = 'specimen-actions'
  element.append(...controls)
  return element
}

function specimenButton(
  label: string,
  declarations: Readonly<Record<string, string>>,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'specimen-button'
  button.textContent = label
  paint(button, declarations)
  return button
}

function specimenFocus(
  declarations: Readonly<Record<string, string>>,
): HTMLSpanElement {
  const chip = document.createElement('span')
  chip.className = 'specimen-focus'
  chip.textContent = 'Focus'
  paint(chip, declarations)
  return chip
}

function paint(
  element: HTMLElement,
  declarations: Readonly<Record<string, string>>,
): void {
  for (const [name, value] of Object.entries(declarations)) {
    element.style.setProperty(name, value)
  }
}

const uswdsColorOverview =
  'https://designsystem.digital.gov/design-tokens/color/overview/'
const uswdsThemeTokens =
  'https://designsystem.digital.gov/design-tokens/color/theme-tokens/'
const tokenFormat = 'https://www.designtokens.org/TR/2025.10/format/'
const contrastMinimum =
  'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum'
const nonTextContrast =
  'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast'
const brandQuickGuide =
  'https://www.un.org/styleguide/pdf/UN_brand_identity_quick_guide_2020.pdf'

function tokenPlan(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'token-plan'
  const heading = document.createElement('h2')
  heading.textContent = 'Semantic token plan'
  section.append(
    heading,
    fact(
      'USWDS keeps the full color palette as system tokens and a smaller role-based set as theme tokens. Each theme token is drawn from a system color token. Base is the neutral, usually the text color.',
      uswdsColorOverview,
    ),
    fact(
      'USWDS official components use those theme tokens. A component calls the role, such as color("primary"), rather than a raw palette value.',
      uswdsThemeTokens,
    ),
    fact(
      'The Design Tokens format lets one token’s value reference another token. That alias is how a role can point at a source color, and the format lists semantic relationships as one use of aliases. Groups are arbitrary, and tools should not infer a token’s purpose from its group.',
      tokenFormat,
    ),
    fact(
      'Ordinary text needs a contrast ratio of at least 4.5:1 against its background. Large text needs at least 3:1. Large text is at least 18pt, or bold and at least 14pt. A computed ratio is not rounded up to the threshold.',
      contrastMinimum,
    ),
    fact(
      'A control’s visible boundary and its focus indicator need at least 3:1 against the adjacent color. The focused state has to keep that contrast with the color next to the indicator.',
      nonTextContrast,
    ),
    linkedFact(
      'The UN75 PDF approves #022944, #009EDB, and #FFFFFF for the UN75 logo, and says use of that logo should cease by 31 December 2020. The 2020 brand quick guide is a separate page. It names Roboto as the primary typeface and lists UN Blue #009edb, black #000, and white. It does not name Futura.',
      [un75Pdf, brandQuickGuide],
    ),
    judgment(
      'These notes do not set fills or type. The system uses page, panel, raised, inset, overlay, scrim, ink, muted, action, action label, selected, focus, title font, body font, and status roles. Status roles are not button fills.',
    ),
    planTable(),
  )
  return section
}

function linkedFact(
  text: string,
  urls: readonly string[],
): HTMLParagraphElement {
  const element = document.createElement('p')
  element.className = 'compare-fact'
  element.append(text)
  for (const url of urls) {
    element.append(' ')
    element.append(anchor(url))
  }
  return element
}

function anchor(url: string): HTMLAnchorElement {
  const link = document.createElement('a')
  link.href = url
  link.textContent = url
  return link
}

interface PlanRow {
  role: string
  current: string
  menus: string
  un75: string
  pairing: string
}

function planTable(): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'token-table-wrap'
  const table = document.createElement('table')
  table.className = 'token-table'
  const caption = document.createElement('caption')
  caption.append('UN75 values in this table are from ')
  caption.append(anchor(un75Pdf))
  const head = document.createElement('thead')
  const headRow = document.createElement('tr')
  for (const label of [
    'Role',
    'Current value',
    'Menus',
    'UN75 value',
    'System',
  ]) {
    const cell = document.createElement('th')
    cell.scope = 'col'
    cell.textContent = label
    if (label === 'System') cell.className = 'token-suggestion'
    headRow.append(cell)
  }
  head.append(headRow)
  const body = document.createElement('tbody')
  for (const row of planRows()) body.append(planRow(row))
  table.append(caption, head, body)
  wrap.append(table)
  return wrap
}

function planRow(row: PlanRow): HTMLTableRowElement {
  const element = document.createElement('tr')
  element.append(
    rowHeader(row.role),
    cell(row.current),
    cell(row.menus),
    cell(row.un75),
    cell(row.pairing, 'token-suggestion'),
  )
  return element
}

function rowHeader(text: string): HTMLTableCellElement {
  const element = document.createElement('th')
  element.scope = 'row'
  element.textContent = text
  return element
}

function cell(text: string, className?: string): HTMLTableCellElement {
  const element = document.createElement('td')
  element.textContent = text
  if (className) element.className = className
  return element
}

function planRows(): readonly PlanRow[] {
  return [
    {
      role: 'Surface',
      current:
        'Landing: panel mixes --ls-bg (#131718) at 86%. Studio: canvas #e6e4d7, panel #fafbf6. Polo: #ffffff.',
      menus: 'Landing, studio, polo',
      un75: 'The PDF does not name a UI surface. Logo colors include #FFFFFF and #022944.',
      pairing:
        'Page, panel, raised, inset, overlay, and scrim. --ls-role-surface follows the panel. Panel and raised sit above the page. Inset sits below the panel. Scrim is translucent.',
    },
    {
      role: 'Ink',
      current: 'Landing: --ls-fg #fcfcfc. Studio: #253b32. Polo: #21162f.',
      menus: 'Landing, studio, polo',
      un75: 'The PDF does not name a text color. #022944 and #FFFFFF are logo colors.',
      pairing:
        'Dark: --ls-role-ink is --ls-fg. Light: --ls-role-ink is --ls-menu-fg. Light muted is --ls-role-muted, --ls-muted-on-paper.',
    },
    {
      role: 'Title',
      current:
        'Landing: Fredoka (--ls-font-ui), 1.5rem, color --ls-fg. Studio: Inter, 40px, #2c4436. Polo: Inter, 34px, #21162f.',
      menus: 'Landing, studio, polo',
      un75: 'Futura LT Pro Extra Bold Condensed, all caps, for main headings. If that face is unavailable, Raleway Black, all caps, for Latin headings.',
      pairing: 'Title font is --ls-role-title-font, Fredoka, in all caps.',
    },
    {
      role: 'Body',
      current:
        'Landing: Fredoka, --ls-fg. Studio: Inter, #253b32, muted #7b887b. Polo: Inter, summary #6c6179.',
      menus: 'Landing, studio, polo',
      un75: 'Futura is not for body text. Barlow Regular, upper and lower case, is the paragraph face when Futura is unavailable.',
      pairing:
        'Body font is --ls-role-body-font, Roboto. It uses the sheet ink.',
    },
    {
      role: 'Action',
      current:
        'Landing primary: --ls-source-wordmark-bottom #6ad4ff, text --ls-bg #131718. Landing also has a transparent default and a quiet control. Studio primary: #3e6248, text #f5f7ec; default border #d4dbce. Polo primary: #b6ee00, text #21162f; default #f5f0fc / #5f497d; quiet #6c567f.',
      menus: 'Landing, studio, polo',
      un75: 'The PDF does not name a control fill. Logo colors include #009EDB and #022944.',
      pairing:
        'Both tones: --ls-role-action is --ls-source-wordmark-bottom. --ls-role-action-label is --ls-bg. --ls-role-selected is a mix of --ls-source-wordmark-offset, so a selected control is not the primary fill.',
    },
    {
      role: 'Focus',
      current: 'Landing: --ls-focus #fcfc54. Studio: #c19053. Polo: #7226e8.',
      menus: 'Landing, studio, polo',
      un75: 'The PDF does not name a focus color.',
      pairing:
        'Dark: --ls-role-focus is --ls-fg. Light: --ls-role-focus is #000000.',
    },
    {
      role: 'Status',
      current:
        'Good, caution, money, angry, live, water, and person fills (amber, green, blue, purple, planner, character, player) were separate colors.',
      menus: 'Studio, polo, community',
      un75: 'The PDF does not name status colors.',
      pairing:
        'Named status roles. Good uses forest. Caution, money, and amber share earth. Live uses wordmark glow. Water uses cover ocean. Angry uses alert. Community blue uses wordmark mid. Character and community purple share wordmark offset. Planner and player share leaf. They are not action or muted, and they are not button fills.',
    },
  ]
}
