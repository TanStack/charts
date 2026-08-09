import {
  conformanceCases,
  getConformanceReferenceRenderer,
} from '../../../benchmarks/conformance/catalog'
import {
  loadTanStackImplementation,
  loadTanStackSources,
} from '../../../benchmarks/conformance/native-catalog'
import type {
  ConformanceCaseMeta,
  ConformanceHandle,
  ConformanceReferenceRenderer,
  ConformanceRenderer,
} from '../../../benchmarks/conformance/types'
import {
  catalogRenderers,
  isCatalogComparisonMode,
  withCatalogComparisonMode,
} from './catalog-mode'
import {
  createChartEmbedStatusMessage,
  parseChartEmbedHeight,
  parseChartEmbedRevision,
  parseChartEmbedTheme,
  readTrustedChartEmbedThemeCommand,
  resolveChartEmbedParentOrigin,
  type ChartEmbedStatus,
} from './embed-contract'
import {
  catalogRouteHref,
  parseCatalogRoute,
  type CatalogRoute,
} from './routes'
import { renderCatalogSourceView } from './source-view'
import './styles.css'

const app = requireApp()
const basePath = import.meta.env.BASE_URL
const chartHeight = 480
const casesById = new Map(conformanceCases.map((entry) => [entry.id, entry]))
const families = [
  ...new Set(conformanceCases.map((entry) => entry.family)),
].sort((left, right) => left.localeCompare(right))
const mounted = new Map<string, ConformanceHandle>()
const cleanup = new Set<() => void>()
let comparisonCatalogPromise:
  | Promise<typeof import('../../../benchmarks/conformance/comparison-catalog')>
  | undefined

let chartWidth = 640
let revision = 0
let dark = window.matchMedia('(prefers-color-scheme: dark)').matches
let search = ''
let family = 'all'
let routeGeneration = 0
let comparisonGeneration = 0

app.addEventListener('click', handleRouteLink)
window.addEventListener('popstate', () => void renderRoute())
applyTheme()
void renderRoute()

async function renderRoute() {
  const generation = ++routeGeneration
  comparisonGeneration += 1
  destroyMountedCharts()
  destroyCleanup()
  document.body.classList.remove('embed-mode')
  document.documentElement.classList.remove('embed-mode')
  applyTheme()

  const route = parseCatalogRoute(window.location.pathname, basePath)

  if (route.view === 'index') {
    renderCatalogIndex()
    return
  }

  if (route.view === 'all') {
    renderAllCases()
    await renderComparisonCases(generation)
    return
  }

  if (route.view === 'case') {
    const entry = casesById.get(route.caseId)
    if (!entry) {
      renderNotFound()
      return
    }
    renderCasePage(entry)
    await renderComparisonCases(generation, [entry])
    return
  }

  if (route.view === 'embed') {
    const entry = casesById.get(route.caseId)
    if (!entry) {
      renderNotFound(true)
      return
    }
    await renderEmbed(entry, generation)
    return
  }

  renderNotFound()
}

function renderCatalogIndex() {
  const comparisonMode = comparisonModeEnabled()
  setDocumentMeta(
    'TanStack Charts Catalog',
    comparisonMode
      ? 'Browse executable chart examples, conformance comparisons, source, and documentation-ready TanStack Charts proofs.'
      : 'Browse executable TanStack Charts examples, source, and documentation-ready proofs.',
  )

  app.innerHTML = `
    ${renderSiteHeader('catalog')}
    <header class="hero">
      <div>
        <p class="eyebrow">TanStack Charts · executable catalog</p>
        <h1>Proof, case by case.</h1>
        <p class="lede">
          ${
            comparisonMode
              ? 'Browse typed examples, inspect source, compare established references, and reference any TanStack chart from documentation.'
              : 'Browse typed examples, inspect source, and reference any TanStack chart from documentation.'
          }
        </p>
      </div>
      ${renderSummary()}
    </header>
    ${renderBrowseToolbar()}
    <main class="catalog">
      <div class="catalog-heading">
        <p id="result-count"></p>
        <a data-catalog-route href="${routeHref({ view: 'all' })}">
          ${comparisonMode ? 'Render every comparison' : 'Render every chart'}
        </a>
      </div>
      <div id="catalog-grid" class="catalog-grid"></div>
    </main>
  `

  bindBrowseControls(renderCatalogCards)
  renderCatalogCards()
}

function renderAllCases() {
  const comparisonMode = comparisonModeEnabled()
  setDocumentMeta(
    'All charts · TanStack Charts Catalog',
    comparisonMode
      ? 'Render the complete TanStack Charts conformance catalog alongside its source-library references.'
      : 'Render the complete TanStack Charts catalog with live source and controls.',
  )

  app.innerHTML = `
    ${renderSiteHeader('all')}
    <header class="hero hero-compact">
      <div>
        <p class="eyebrow">${comparisonMode ? 'Complete comparison surface' : 'Complete catalog'}</p>
        <h1>Every chart, one page.</h1>
        ${
          comparisonMode
            ? `<p class="lede">
                Same inputs and intent, with both renderers exposed for direct
                geometry, source, performance, and output comparison.
              </p>`
            : ''
        }
      </div>
      ${renderSummary()}
    </header>
    ${renderComparisonToolbar()}
    <main id="cases" class="cases"></main>
  `

  bindBrowseControls(() => void renderComparisonCases(routeGeneration))
  bindComparisonControls()
}

function renderCasePage(entry: ConformanceCaseMeta) {
  const index = conformanceCases.indexOf(entry)
  const previous = conformanceCases[index - 1]
  const next = conformanceCases[index + 1]
  const comparisonMode = comparisonModeEnabled()

  setDocumentMeta(
    `${entry.title} · TanStack Charts Catalog`,
    comparisonMode
      ? `${entry.intent} Compare the reference implementation with TanStack Charts, inspect source, or reference the chart in documentation.`
      : `${entry.intent} Inspect the source or reference the chart in documentation.`,
  )

  app.innerHTML = `
    ${renderSiteHeader()}
    <header class="detail-header">
      <div>
        <a class="back-link" data-catalog-route href="${routeHref({ view: 'index' })}">
          ← Catalog
        </a>
        <p class="eyebrow">${String(entry.order).padStart(2, '0')} · ${escapeHtml(entry.family)}</p>
        <h1>${escapeHtml(entry.title)}</h1>
        <p class="lede">${escapeHtml(entry.intent)}</p>
      </div>
      <nav class="case-pager" aria-label="Adjacent catalog cases">
        ${
          previous
            ? `<a data-catalog-route href="${routeHref({ view: 'case', caseId: previous.id })}">← Previous</a>`
            : '<span></span>'
        }
        ${
          next
            ? `<a data-catalog-route href="${routeHref({ view: 'case', caseId: next.id })}">Next →</a>`
            : '<span></span>'
        }
      </nav>
    </header>
    ${renderComparisonToolbar(false)}
    <main id="cases" class="cases cases-detail"></main>
  `

  bindComparisonControls()
}

async function renderEmbed(entry: ConformanceCaseMeta, generation: number) {
  document.body.classList.add('embed-mode')
  document.documentElement.classList.add('embed-mode')

  const params = new URLSearchParams(window.location.search)
  const height = parseChartEmbedHeight(params.get('height'))
  const embedRevision = parseChartEmbedRevision(params.get('revision'))
  let theme = parseChartEmbedTheme(params.get('theme'))
  const parentOrigin = resolveChartEmbedParentOrigin(document.referrer)
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const applyEmbedTheme = () => {
    const embedDark = theme === 'dark' || (theme !== 'light' && media.matches)
    document.documentElement.dataset.theme = embedDark ? 'dark' : 'light'
  }
  const handleMediaChange = () => {
    if (theme === 'system') applyEmbedTheme()
  }
  const handleParentMessage = (event: MessageEvent) => {
    const command = readTrustedChartEmbedThemeCommand(
      event,
      window.parent,
      parentOrigin,
      entry.id,
    )
    if (!command) return
    theme = command.theme
    applyEmbedTheme()
  }

  applyEmbedTheme()
  media.addEventListener('change', handleMediaChange)
  window.addEventListener('message', handleParentMessage)
  cleanup.add(() => media.removeEventListener('change', handleMediaChange))
  cleanup.add(() => window.removeEventListener('message', handleParentMessage))

  setDocumentMeta(`${entry.title} · TanStack Charts`, entry.intent, true)

  app.innerHTML = `
    <main
      class="embed-shell"
      data-case-id="${escapeHtml(entry.id)}"
      aria-label="${escapeHtml(entry.title)}"
    >
      <div
        class="chart embed-chart"
        id="${escapeHtml(entry.id)}-tanstack"
        style="height: ${height}px"
      ></div>
    </main>
  `

  await document.fonts?.ready
  if (generation !== routeGeneration) return

  const container = document.getElementById(`${entry.id}-tanstack`)
  if (!container) return

  try {
    const implementation = await loadTanStackImplementation(entry.id)
    if (generation !== routeGeneration) return
    if (!implementation) {
      throw new Error('This catalog case has no TanStack implementation yet.')
    }

    let width = measureEmbedWidth(container)
    const handle = implementation.mount(container, {
      width,
      height,
      revision: embedRevision,
      interactive: true,
    })
    mounted.set(`${entry.id}:tanstack`, handle)

    const updateWidth = (nextWidth: number) => {
      if (nextWidth === width || nextWidth < 1) return
      width = nextWidth
      handle.update({
        width,
        height,
        revision: embedRevision,
        interactive: true,
      })
      postEmbedMessage('resize', entry, height, parentOrigin)
    }

    const observer = new ResizeObserver(() => {
      updateWidth(measureEmbedWidth(container))
    })
    observer.observe(container)
    cleanup.add(() => observer.disconnect())

    requestAnimationFrame(() => {
      postEmbedMessage('ready', entry, height, parentOrigin)
    })
  } catch (error) {
    renderFailure(container, error)
    postEmbedMessage('error', entry, height, parentOrigin)
  }
}

function renderCatalogCards() {
  const entries = filterCases()
  const grid = document.querySelector<HTMLElement>('#catalog-grid')
  const count = document.querySelector<HTMLElement>('#result-count')
  if (!grid || !count) return

  count.textContent = `${entries.length} of ${conformanceCases.length} cases`
  grid.innerHTML = entries.length
    ? entries.map(renderCatalogCard).join('')
    : '<p class="empty">No catalog cases match those filters.</p>'
}

async function renderComparisonCases(
  route: number,
  explicitEntries?: ConformanceCaseMeta[],
) {
  const generation = ++comparisonGeneration
  destroyMountedCharts()
  const container = document.querySelector<HTMLElement>('#cases')
  if (!container) return

  const entries = explicitEntries ?? filterCases()
  container.innerHTML = entries.length
    ? entries.map(renderCaseCard).join('')
    : '<p class="empty">No catalog cases match those filters.</p>'

  await document.fonts?.ready
  if (
    generation !== comparisonGeneration ||
    route !== routeGeneration ||
    !container.isConnected
  ) {
    return
  }

  await Promise.all(entries.map((entry) => mountCase(entry, route, generation)))
}

function renderCatalogCard(entry: ConformanceCaseMeta): string {
  const comparisonMode = comparisonModeEnabled()
  const reference = comparisonMode
    ? getConformanceReferenceRenderer(entry)
    : undefined
  return `
    <article class="catalog-card">
      <header>
        <p class="case-index">${String(entry.order).padStart(2, '0')} · ${escapeHtml(entry.family)}</p>
        <span class="support support-${entry.support}">${entry.support}</span>
      </header>
      <h2>
        <a data-catalog-route href="${routeHref({ view: 'case', caseId: entry.id })}">
          ${escapeHtml(entry.title)}
        </a>
      </h2>
      <p>${escapeHtml(entry.intent)}</p>
      <ul class="features">
        ${entry.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}
      </ul>
      <footer ${comparisonMode ? '' : 'class="catalog-card-footer-native"'}>
        ${
          reference
            ? `<span>${escapeHtml(rendererLabel(reference))} reference</span>`
            : ''
        }
        <div>
          <a data-catalog-route href="${routeHref({ view: 'case', caseId: entry.id })}">
            View proof
          </a>
          <a href="${routeHref({ view: 'embed', caseId: entry.id })}" target="_blank">
            Isolated preview
          </a>
        </div>
      </footer>
    </article>
  `
}

function renderCaseCard(entry: ConformanceCaseMeta): string {
  const comparisonMode = comparisonModeEnabled()
  const referenceRenderer = getConformanceReferenceRenderer(entry)
  const docsDirective = `<!-- ::chart-example id=${entry.id} height=${chartHeight} -->`

  return `
    <article class="case" id="case-${escapeHtml(entry.id)}">
      <header class="case-header">
        <div>
          <p class="case-index">${String(entry.order).padStart(2, '0')} · ${escapeHtml(entry.family)}</p>
          <h2>
            <a data-catalog-route href="${routeHref({ view: 'case', caseId: entry.id })}">
              ${escapeHtml(entry.title)}
            </a>
          </h2>
          <p>${escapeHtml(entry.intent)}</p>
        </div>
        <span class="support support-${entry.support}">${entry.support}</span>
      </header>
      <ul class="features">
        ${entry.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}
      </ul>
      <div
        class="comparison ${comparisonMode ? 'comparison-debug' : 'comparison-native'}"
        style="--chart-width: ${chartWidth}px"
      >
        ${
          comparisonMode
            ? renderRendererPanel(
                entry,
                referenceRenderer,
                rendererLabel(referenceRenderer),
              )
            : ''
        }
        ${renderRendererPanel(entry, 'tanstack', 'TanStack Charts')}
      </div>
      <footer class="case-footer">
        <div class="case-links">
          ${
            comparisonMode
              ? `<a href="${escapeHtml(entry.source.url)}" target="_blank" rel="noreferrer">
                  Official reference · ${escapeHtml(entry.source.title)}
                </a>`
              : ''
          }
          <a href="${routeHref({ view: 'embed', caseId: entry.id })}" target="_blank">
            Isolated preview
          </a>
        </div>
        <div class="case-details">
          <details>
            <summary>Docs directive</summary>
            <pre><code>${escapeHtml(docsDirective)}</code></pre>
          </details>
          <details>
            <summary>Agent tasks</summary>
            <dl>
              <dt>Create</dt><dd>${escapeHtml(entry.ai.create)}</dd>
              <dt>Maintain</dt><dd>${escapeHtml(entry.ai.maintain)}</dd>
            </dl>
          </details>
        </div>
      </footer>
    </article>
  `
}

function renderRendererPanel(
  entry: ConformanceCaseMeta,
  renderer: ConformanceRenderer,
  label: string,
): string {
  return `
    <section class="renderer" data-renderer="${renderer}">
      <header>
        <h3>${escapeHtml(label)}</h3>
        <output id="${escapeHtml(entry.id)}-${renderer}-metrics">pending</output>
      </header>
      <div
        class="chart"
        id="${escapeHtml(entry.id)}-${renderer}"
        style="width: ${chartWidth}px; min-height: ${chartHeight}px"
      ></div>
      <details class="source">
        <summary>Source</summary>
        <div id="${escapeHtml(entry.id)}-${renderer}-source">loading…</div>
      </details>
    </section>
  `
}

async function mountCase(
  entry: ConformanceCaseMeta,
  route: number,
  comparison: number,
) {
  const referenceRenderer = getConformanceReferenceRenderer(entry)
  await Promise.all(
    catalogRenderers(referenceRenderer, comparisonModeEnabled()).map(
      (renderer) => mountRenderer(entry, renderer, route, comparison),
    ),
  )
}

async function mountRenderer(
  entry: ConformanceCaseMeta,
  renderer: ConformanceRenderer,
  route: number,
  comparison: number,
) {
  const key = `${entry.id}:${renderer}`
  const container = document.getElementById(`${entry.id}-${renderer}`)
  const metrics = document.getElementById(`${entry.id}-${renderer}-metrics`)
  const sourceElement = document.getElementById(
    `${entry.id}-${renderer}-source`,
  )
  if (!container) return

  try {
    const [implementation, source] =
      renderer === 'tanstack'
        ? await Promise.all([
            loadTanStackImplementation(entry.id),
            loadTanStackSources(entry.id),
          ])
        : await loadComparisonRenderer(entry.id, renderer)
    if (
      route !== routeGeneration ||
      comparison !== comparisonGeneration ||
      !container.isConnected
    ) {
      return
    }

    if (sourceElement) {
      sourceElement.innerHTML = renderCatalogSourceView(source)
    }
    if (!implementation) {
      container.innerHTML =
        '<p class="gap">Not implemented. This is a recorded capability gap.</p>'
      if (metrics) metrics.textContent = 'gap'
      return
    }

    const startedAt = performance.now()
    const handle = implementation.mount(container, {
      width: chartWidth,
      height: chartHeight,
      revision,
    })
    container.getBoundingClientRect()
    const duration = performance.now() - startedAt
    mounted.set(key, handle)
    if (metrics) {
      const elements = container.querySelectorAll('*').length
      const svgBytes = [...container.querySelectorAll('svg')].reduce(
        (total, svg) =>
          total + new TextEncoder().encode(svg.outerHTML).byteLength,
        0,
      )
      metrics.textContent = `${duration.toFixed(2)} ms · ${elements} nodes · ${formatBytes(svgBytes)} SVG`
    }
  } catch (error) {
    if (route !== routeGeneration || comparison !== comparisonGeneration) return
    renderFailure(container, error)
    if (metrics) metrics.textContent = 'error'
    console.error(`Failed to render ${entry.id} with ${renderer}`, error)
  }
}

async function loadComparisonRenderer(
  id: string,
  renderer: ConformanceReferenceRenderer,
) {
  const catalog = await loadComparisonCatalog()
  return Promise.all([
    catalog.loadComparisonImplementation(id, renderer),
    catalog.loadComparisonSources(id, renderer),
  ])
}

function loadComparisonCatalog() {
  if (!comparisonModeEnabled()) {
    throw new Error('Comparison renderers require ?compare=1.')
  }
  comparisonCatalogPromise ??=
    import('../../../benchmarks/conformance/comparison-catalog')
  return comparisonCatalogPromise
}

function renderSiteHeader(active?: 'catalog' | 'all'): string {
  return `
    <header class="site-header">
      <div class="site-header-brand">
        <a
          class="back-link"
          href="https://tanstack.com/"
          aria-label="Back to TanStack"
        >
          <span aria-hidden="true">←</span>
          <span class="back-link-label">TanStack</span>
        </a>
        <span class="site-header-separator" aria-hidden="true">/</span>
        <a class="wordmark" data-catalog-route href="${routeHref({ view: 'index' })}">
          Charts <span>Catalog</span>
        </a>
      </div>
      <nav aria-label="Catalog">
        <a
          data-catalog-route
          ${active === 'catalog' ? 'aria-current="page"' : ''}
          href="${routeHref({ view: 'index' })}"
        >Browse</a>
        <a
          data-catalog-route
          ${active === 'all' ? 'aria-current="page"' : ''}
          href="${routeHref({ view: 'all' })}"
        >All charts</a>
      </nav>
    </header>
  `
}

function renderSummary(): string {
  const native = conformanceCases.filter(
    (entry) => entry.support === 'native',
  ).length
  const composed = conformanceCases.filter(
    (entry) => entry.support === 'composed',
  ).length
  return `
    <dl class="summary">
      <div><dt>${conformanceCases.length}</dt><dd>cases</dd></div>
      <div><dt>${native}</dt><dd>native</dd></div>
      <div><dt>${composed}</dt><dd>composed</dd></div>
    </dl>
  `
}

function renderBrowseToolbar(): string {
  return `
    <section class="toolbar" aria-label="Catalog controls">
      <label class="filter-field">
        <span>Filter</span>
        <input
          id="search"
          type="search"
          value="${escapeHtml(search)}"
          placeholder="line, stack, facet…"
        />
      </label>
      <label>
        <span>Family</span>
        <select id="family">
          <option value="all">All families</option>
          ${families
            .map(
              (entry) =>
                `<option value="${escapeHtml(entry)}" ${entry === family ? 'selected' : ''}>${escapeHtml(entry)}</option>`,
            )
            .join('')}
        </select>
      </label>
      <button id="theme" type="button">${dark ? 'Light mode' : 'Dark mode'}</button>
    </section>
  `
}

function renderComparisonToolbar(includeFilters = true): string {
  return `
    <section
      class="toolbar"
      aria-label="${comparisonModeEnabled() ? 'Comparison controls' : 'Chart controls'}"
    >
      ${includeFilters ? renderToolbarFilters() : ''}
      <label>
        <span>Chart width</span>
        <select id="width">
          ${[320, 640, 960]
            .map(
              (width) =>
                `<option value="${width}" ${width === chartWidth ? 'selected' : ''}>${width}px</option>`,
            )
            .join('')}
        </select>
      </label>
      <button id="update" type="button">Update data · ${revision}</button>
      <button id="theme" type="button">${dark ? 'Light mode' : 'Dark mode'}</button>
    </section>
  `
}

function renderToolbarFilters(): string {
  return `
    <label class="filter-field">
      <span>Filter</span>
      <input
        id="search"
        type="search"
        value="${escapeHtml(search)}"
        placeholder="line, stack, facet…"
      />
    </label>
    <label>
      <span>Family</span>
      <select id="family">
        <option value="all">All families</option>
        ${families
          .map(
            (entry) =>
              `<option value="${escapeHtml(entry)}" ${entry === family ? 'selected' : ''}>${escapeHtml(entry)}</option>`,
          )
          .join('')}
      </select>
    </label>
  `
}

function bindBrowseControls(onChange: () => void) {
  const searchInput = document.querySelector<HTMLInputElement>('#search')
  const familySelect = document.querySelector<HTMLSelectElement>('#family')

  searchInput?.addEventListener('input', () => {
    search = searchInput.value.trim().toLowerCase()
    onChange()
  })
  familySelect?.addEventListener('change', () => {
    family = familySelect.value
    onChange()
  })
  bindThemeControl()
}

function bindComparisonControls() {
  const widthSelect = document.querySelector<HTMLSelectElement>('#width')
  const updateButton = document.querySelector<HTMLButtonElement>('#update')

  widthSelect?.addEventListener('change', () => {
    chartWidth = Number(widthSelect.value)
    void renderComparisonCases(routeGeneration, explicitRouteCases())
  })
  updateButton?.addEventListener('click', () => {
    revision += 1
    updateButton.textContent = `Update data · ${revision}`
    updateMountedCharts()
  })
  bindThemeControl()
}

function bindThemeControl() {
  const themeButton = document.querySelector<HTMLButtonElement>('#theme')
  themeButton?.addEventListener('click', () => {
    dark = !dark
    applyTheme()
    void renderRoute()
  })
}

function explicitRouteCases(): ConformanceCaseMeta[] | undefined {
  const route = parseCatalogRoute(window.location.pathname, basePath)
  if (route.view !== 'case') return undefined
  const entry = casesById.get(route.caseId)
  return entry ? [entry] : []
}

function filterCases(): ConformanceCaseMeta[] {
  return conformanceCases.filter((entry) => {
    if (family !== 'all' && entry.family !== family) return false
    if (!search) return true
    const text = [entry.title, entry.family, entry.intent, ...entry.features]
      .join(' ')
      .toLowerCase()
    return text.includes(search)
  })
}

function renderNotFound(embed = false) {
  setDocumentMeta(
    'Chart not found · TanStack Charts Catalog',
    'Chart not found.',
    true,
  )
  document.body.classList.toggle('embed-mode', embed)
  app.innerHTML = `
    ${embed ? '' : renderSiteHeader()}
    <main class="not-found">
      <p class="eyebrow">404</p>
      <h1>Chart not found.</h1>
      ${
        embed
          ? ''
          : `<a data-catalog-route href="${routeHref({ view: 'index' })}">Browse the catalog</a>`
      }
    </main>
  `
}

function handleRouteLink(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }

  const target = event.target
  if (!(target instanceof Element)) return
  const anchor = target.closest<HTMLAnchorElement>('a[data-catalog-route]')
  if (
    !anchor ||
    anchor.target === '_blank' ||
    anchor.hasAttribute('download')
  ) {
    return
  }

  const url = new URL(anchor.href)
  if (url.origin !== window.location.origin) return

  event.preventDefault()
  window.history.pushState({}, '', url)
  window.scrollTo({ top: 0 })
  void renderRoute()
}

function routeHref(
  route: Exclude<CatalogRoute, { view: 'not-found' }>,
): string {
  return withCatalogComparisonMode(
    catalogRouteHref(route, basePath),
    comparisonModeEnabled() && route.view !== 'embed',
  )
}

function comparisonModeEnabled(): boolean {
  return isCatalogComparisonMode(window.location.search)
}

function rendererLabel(renderer: ConformanceRenderer): string {
  if (renderer === 'observable-plot') return 'Observable Plot'
  if (renderer === 'recharts') return 'Recharts'
  if (renderer === 'echarts') return 'Apache ECharts'
  return 'TanStack Charts'
}

function updateMountedCharts() {
  for (const handle of mounted.values()) {
    handle.update({ width: chartWidth, height: chartHeight, revision })
  }
}

function destroyMountedCharts() {
  for (const handle of mounted.values()) handle.destroy()
  mounted.clear()
}

function destroyCleanup() {
  for (const dispose of cleanup) dispose()
  cleanup.clear()
}

function renderFailure(container: HTMLElement, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const failure = document.createElement('p')
  failure.className = 'gap'
  failure.textContent = `Renderer failed: ${message}`
  container.replaceChildren(failure)
}

function setDocumentMeta(title: string, description: string, noIndex = false) {
  document.title = title
  setMetaContent('description', description)
  setMetaContent('robots', noIndex ? 'noindex,follow' : 'index,follow')
  setPropertyContent('og:title', title)
  setPropertyContent('og:description', description)
  setPropertyContent('og:url', canonicalUrl())
  const canonical = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  )
  if (canonical) canonical.href = canonicalUrl()
}

function setMetaContent(name: string, content: string) {
  document
    .querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
    ?.setAttribute('content', content)
}

function setPropertyContent(property: string, content: string) {
  document
    .querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
    ?.setAttribute('content', content)
}

function canonicalUrl(): string {
  return `${window.location.origin}${window.location.pathname}`
}

function applyTheme() {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

function postEmbedMessage(
  status: ChartEmbedStatus,
  entry: ConformanceCaseMeta,
  height: number,
  parentOrigin: string | null,
) {
  if (window.parent === window || !parentOrigin) return
  window.parent.postMessage(
    createChartEmbedStatusMessage(status, entry.id, height),
    parentOrigin,
  )
}

function measureEmbedWidth(container: HTMLElement): number {
  return Math.max(1, Math.floor(container.getBoundingClientRect().width))
}

function formatBytes(bytes: number): string {
  return bytes < 1_024 ? `${bytes} B` : `${(bytes / 1_024).toFixed(1)} kB`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function requireApp(): HTMLDivElement {
  const element = document.querySelector<HTMLDivElement>('#app')
  if (!element) throw new Error('Missing conformance app root')
  return element
}
