import {
  conformanceCases,
  getConformanceReferenceRenderer,
  loadConformanceImplementation,
  loadConformanceSource,
} from '../../../benchmarks/conformance/catalog'
import type {
  ConformanceCaseMeta,
  ConformanceHandle,
  ConformanceRenderer,
} from '../../../benchmarks/conformance/types'
import {
  catalogRouteHref,
  parseCatalogRoute,
  type CatalogRoute,
} from './routes'
import './styles.css'

const app = requireApp()
const basePath = import.meta.env.BASE_URL
const chartHeight = 360
const casesById = new Map(conformanceCases.map((entry) => [entry.id, entry]))
const families = [
  ...new Set(conformanceCases.map((entry) => entry.family)),
].sort((left, right) => left.localeCompare(right))
const mounted = new Map<string, ConformanceHandle>()
const cleanup = new Set<() => void>()

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
  setDocumentMeta(
    'TanStack Charts Catalog',
    'Browse executable chart examples, conformance comparisons, source, and embeddable TanStack Charts proofs.',
  )

  app.innerHTML = `
    ${renderSiteHeader('catalog')}
    <header class="hero">
      <div>
        <p class="eyebrow">TanStack Charts · executable catalog</p>
        <h1>Proof, case by case.</h1>
        <p class="lede">
          Browse typed examples, inspect source, compare established references,
          and embed any TanStack chart directly into documentation.
        </p>
      </div>
      ${renderSummary()}
    </header>
    ${renderBrowseToolbar()}
    <main class="catalog">
      <div class="catalog-heading">
        <p id="result-count"></p>
        <a data-catalog-route href="${routeHref({ view: 'all' })}">
          Render every comparison
        </a>
      </div>
      <div id="catalog-grid" class="catalog-grid"></div>
    </main>
  `

  bindBrowseControls(renderCatalogCards)
  renderCatalogCards()
}

function renderAllCases() {
  setDocumentMeta(
    'All charts · TanStack Charts Catalog',
    'Render the complete TanStack Charts conformance catalog alongside its source-library references.',
  )

  app.innerHTML = `
    ${renderSiteHeader('all')}
    <header class="hero hero-compact">
      <div>
        <p class="eyebrow">Complete comparison surface</p>
        <h1>Every chart, one page.</h1>
        <p class="lede">
          Same inputs and intent, with both renderers exposed for direct
          geometry, source, performance, and output comparison.
        </p>
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

  setDocumentMeta(
    `${entry.title} · TanStack Charts Catalog`,
    `${entry.intent} Compare the reference implementation with TanStack Charts, inspect source, or embed the chart.`,
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

  const params = new URLSearchParams(window.location.search)
  const height = boundedNumber(params.get('height'), chartHeight, 120, 1_200)
  const embedRevision = boundedNumber(params.get('revision'), 0, 0, 10_000)
  const theme = params.get('theme') ?? 'system'
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const applyEmbedTheme = () => {
    const embedDark = theme === 'dark' || (theme !== 'light' && media.matches)
    document.documentElement.dataset.theme = embedDark ? 'dark' : 'light'
  }

  applyEmbedTheme()
  if (theme === 'system') {
    media.addEventListener('change', applyEmbedTheme)
    cleanup.add(() => media.removeEventListener('change', applyEmbedTheme))
  }

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
    const implementation = await loadConformanceImplementation(
      entry.id,
      'tanstack',
    )
    if (generation !== routeGeneration) return
    if (!implementation) {
      throw new Error('This catalog case has no TanStack implementation yet.')
    }

    let width = measureEmbedWidth(container)
    const handle = implementation.mount(container, {
      width,
      height,
      revision: embedRevision,
    })
    mounted.set(`${entry.id}:tanstack`, handle)

    const updateWidth = (nextWidth: number) => {
      if (nextWidth === width || nextWidth < 1) return
      width = nextWidth
      handle.update({ width, height, revision: embedRevision })
      postEmbedMessage('resize', entry, height)
    }

    const observer = new ResizeObserver(() => {
      updateWidth(measureEmbedWidth(container))
    })
    observer.observe(container)
    cleanup.add(() => observer.disconnect())

    requestAnimationFrame(() => {
      postEmbedMessage('ready', entry, height)
    })
  } catch (error) {
    renderFailure(container, error)
    postEmbedMessage('error', entry, height)
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
  const reference = getConformanceReferenceRenderer(entry)
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
      <footer>
        <span>${escapeHtml(rendererLabel(reference))} reference</span>
        <div>
          <a data-catalog-route href="${routeHref({ view: 'case', caseId: entry.id })}">
            View proof
          </a>
          <a href="${routeHref({ view: 'embed', caseId: entry.id })}" target="_blank">
            Embed
          </a>
        </div>
      </footer>
    </article>
  `
}

function renderCaseCard(entry: ConformanceCaseMeta): string {
  const referenceRenderer = getConformanceReferenceRenderer(entry)
  const embedUrl = new URL(
    routeHref({ view: 'embed', caseId: entry.id }),
    window.location.origin,
  ).href
  const embedCode = `<iframe src="${embedUrl}?theme=system&height=${chartHeight}" title="${entry.title}" loading="lazy" style="width:100%;height:${chartHeight}px;border:0"></iframe>`

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
      <div class="comparison" style="--chart-width: ${chartWidth}px">
        ${renderRendererPanel(entry, referenceRenderer, rendererLabel(referenceRenderer))}
        ${renderRendererPanel(entry, 'tanstack', 'TanStack Charts')}
      </div>
      <footer class="case-footer">
        <div class="case-links">
          <a href="${escapeHtml(entry.source.url)}" target="_blank" rel="noreferrer">
            Official reference · ${escapeHtml(entry.source.title)}
          </a>
          <a href="${routeHref({ view: 'embed', caseId: entry.id })}" target="_blank">
            Chrome-free embed
          </a>
        </div>
        <div class="case-details">
          <details>
            <summary>Embed code</summary>
            <pre><code>${escapeHtml(embedCode)}</code></pre>
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
        <pre><code id="${escapeHtml(entry.id)}-${renderer}-source">loading…</code></pre>
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
    ([referenceRenderer, 'tanstack'] as const).map((renderer) =>
      mountRenderer(entry, renderer, route, comparison),
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
    const [implementation, source] = await Promise.all([
      loadConformanceImplementation(entry.id, renderer),
      loadConformanceSource(entry.id, renderer),
    ])
    if (
      route !== routeGeneration ||
      comparison !== comparisonGeneration ||
      !container.isConnected
    ) {
      return
    }

    if (sourceElement) {
      sourceElement.textContent = source ?? 'No implementation yet.'
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

function renderSiteHeader(active?: 'catalog' | 'all'): string {
  return `
    <header class="site-header">
      <a class="wordmark" data-catalog-route href="${routeHref({ view: 'index' })}">
        TanStack Charts <span>Catalog</span>
      </a>
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
    <section class="toolbar" aria-label="Comparison controls">
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
  return catalogRouteHref(route, basePath)
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
  status: 'ready' | 'resize' | 'error',
  entry: ConformanceCaseMeta,
  height: number,
) {
  if (window.parent === window) return
  window.parent.postMessage(
    {
      type: `tanstack-charts:embed:${status}`,
      caseId: entry.id,
      height,
    },
    '*',
  )
}

function measureEmbedWidth(container: HTMLElement): number {
  return Math.max(1, Math.floor(container.getBoundingClientRect().width))
}

function boundedNumber(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(maximum, Math.max(minimum, Math.round(number)))
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
