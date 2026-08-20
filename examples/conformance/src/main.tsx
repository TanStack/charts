import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { createRoot } from 'react-dom/client'
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
  ConformanceInput,
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
import { CatalogSourceView } from './source-view'
import './styles.css'

const basePath = import.meta.env.BASE_URL
const chartHeight = 480
const casesById = new Map(conformanceCases.map((entry) => [entry.id, entry]))
const families = [
  ...new Set(conformanceCases.map((entry) => entry.family)),
].sort((left, right) => left.localeCompare(right))
let comparisonCatalogPromise:
  | Promise<typeof import('../../../benchmarks/conformance/comparison-catalog')>
  | undefined
const LazyChartJsonDemo = lazy(() =>
  import('./json-demo').then(({ ChartJsonDemo }) => ({
    default: ChartJsonDemo,
  })),
)

function CatalogApp() {
  const [location, setLocation] = useState(readCatalogLocation)
  const [chartWidth, setChartWidth] = useState(640)
  const [revision, setRevision] = useState(0)
  const [dark, setDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const [search, setSearch] = useState('')
  const [family, setFamily] = useState('all')
  const route = parseCatalogRoute(location.pathname, basePath)
  const comparisonMode = isCatalogComparisonMode(location.search)
  const entries = useMemo(() => filterCases(search, family), [family, search])

  useEffect(() => {
    const handlePopState = () => setLocation(readCatalogLocation())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  useEffect(() => {
    const embed = route.view === 'embed'
    document.body.classList.toggle('embed-mode', embed)
    document.documentElement.classList.toggle('embed-mode', embed)
    return () => {
      document.body.classList.remove('embed-mode')
      document.documentElement.classList.remove('embed-mode')
    }
  }, [route.view])

  const navigate = (href: string) => {
    window.history.pushState({}, '', href)
    window.scrollTo({ top: 0 })
    setLocation(readCatalogLocation())
  }
  const routeHref = (nextRoute: Exclude<CatalogRoute, { view: 'not-found' }>) =>
    withCatalogComparisonMode(
      catalogRouteHref(nextRoute, basePath),
      comparisonMode && nextRoute.view !== 'embed' && nextRoute.view !== 'json',
    )
  const link = (nextRoute: Exclude<CatalogRoute, { view: 'not-found' }>) => ({
    href: routeHref(nextRoute),
    navigate,
  })
  const sharedControls = {
    dark,
    family,
    search,
    setDark,
    setFamily,
    setSearch,
  }
  if (route.view === 'index') {
    return (
      <CatalogIndex
        comparisonMode={comparisonMode}
        entries={entries}
        link={link}
        controls={sharedControls}
      />
    )
  }

  if (route.view === 'all') {
    return (
      <AllCasesPage
        chartWidth={chartWidth}
        comparisonMode={comparisonMode}
        controls={sharedControls}
        entries={entries}
        link={link}
        revision={revision}
        setChartWidth={setChartWidth}
        update={() => setRevision((value) => value + 1)}
      />
    )
  }

  if (route.view === 'json') {
    return <JsonWorkbenchPage dark={dark} link={link} setDark={setDark} />
  }

  if (route.view === 'collection') {
    return route.collectionId === 'shadcn' ? (
      <ShadcnCollectionPage dark={dark} link={link} setDark={setDark} />
    ) : (
      <NotFound link={link} />
    )
  }

  if (route.view === 'case') {
    const entry = casesById.get(route.caseId)
    if (!entry) return <NotFound link={link} />
    return (
      <CasePage
        chartWidth={chartWidth}
        comparisonMode={comparisonMode}
        dark={dark}
        entry={entry}
        link={link}
        revision={revision}
        setChartWidth={setChartWidth}
        setDark={setDark}
        update={() => setRevision((value) => value + 1)}
      />
    )
  }

  if (route.view === 'embed') {
    const entry = casesById.get(route.caseId)
    return entry ? <EmbedPage entry={entry} /> : <NotFound embed link={link} />
  }

  return <NotFound link={link} />
}

function JsonWorkbenchPage({
  dark,
  link,
  setDark,
}: {
  dark: boolean
  link: RouteLinkFactory
  setDark: (value: boolean) => void
}) {
  useDocumentMeta(
    'Chart JSON workbench · TanStack Charts',
    'Edit, validate, and render the official TanStack Charts JSON interchange format.',
  )

  return (
    <>
      <SiteHeader active="json" link={link} />
      <main className="json-demo-page">
        <header className="json-demo-heading">
          <h1>Chart JSON workbench</h1>
          <button type="button" onClick={() => setDark(!dark)}>
            {dark ? 'Light mode' : 'Dark mode'}
          </button>
        </header>
        <Suspense fallback={<p>Loading workbench…</p>}>
          <LazyChartJsonDemo />
        </Suspense>
      </main>
    </>
  )
}

function ShadcnCollectionPage({
  dark,
  link,
  setDark,
}: {
  dark: boolean
  link: RouteLinkFactory
  setDark: (value: boolean) => void
}) {
  const allEntries = useMemo(() => collectionCases('shadcn'), [])
  const [search, setSearch] = useState('')
  const [family, setFamily] = useState('all')
  const [copied, setCopied] = useState(false)
  const collectionFamilies = useMemo(
    () =>
      [...new Set(allEntries.map((entry) => entry.family))].sort(
        (left, right) => left.localeCompare(right),
      ),
    [allEntries],
  )
  const entries = useMemo(
    () =>
      allEntries.filter((entry) => {
        if (family !== 'all' && entry.family !== family) return false
        if (!search) return true
        return [entry.title, entry.family, entry.intent, ...entry.features]
          .join(' ')
          .toLowerCase()
          .includes(search)
      }),
    [allEntries, family, search],
  )
  useDocumentMeta(
    'shadcn charts · TanStack Charts',
    'TanStack Charts implementations of the official shadcn chart catalog.',
  )

  useEffect(() => {
    document.body.classList.add('shadcn-catalog')
    return () => document.body.classList.remove('shadcn-catalog')
  }, [])

  return (
    <>
      <SiteHeader active="shadcn" link={link} />
      <main className="shadcn-gallery">
        <header className="shadcn-gallery-header">
          <div>
            <h1>shadcn charts</h1>
            <p>{allEntries.length} examples, rebuilt with TanStack Charts.</p>
          </div>
          <div className="shadcn-install">
            <code>npm install @tanstack/charts</code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard
                  .writeText('npm install @tanstack/charts')
                  .then(() => setCopied(true))
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </header>
        <section className="shadcn-gallery-controls" aria-label="Chart filters">
          <label>
            <span className="sr-only">Search charts</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value.toLowerCase())}
              placeholder="Search charts"
            />
          </label>
          <nav aria-label="Chart families">
            {['all', ...collectionFamilies].map((entry) => (
              <button
                aria-pressed={entry === family}
                key={entry}
                onClick={() => setFamily(entry)}
                type="button"
              >
                {entry === 'all' ? 'All' : titleCase(entry)}
              </button>
            ))}
          </nav>
          <button type="button" onClick={() => setDark(!dark)}>
            {dark ? 'Light mode' : 'Dark mode'}
          </button>
        </section>
        <div aria-live="polite">
          {entries.length ? (
            <>
              <p className="shadcn-result-count">
                {entries.length} chart{entries.length === 1 ? '' : 's'}
              </p>
              <div className="shadcn-chart-grid">
                {entries.map((entry) => (
                  <ShadcnCollectionCard
                    entry={entry}
                    key={entry.id}
                    link={link}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="empty">No charts match those filters.</p>
          )}
        </div>
      </main>
    </>
  )
}

function ShadcnCollectionCard({
  entry,
  link,
}: {
  entry: ConformanceCaseMeta
  link: RouteLinkFactory
}) {
  return (
    <article className="shadcn-chart-card">
      <ShadcnCollectionPreview entry={entry} />
      <footer>
        <nav aria-label={shadcnDisplayTitle(entry.title)}>
          <CatalogLink {...link({ view: 'case', caseId: entry.id })}>
            Code
          </CatalogLink>
          <a
            href={link({ view: 'embed', caseId: entry.id }).href}
            target="_blank"
          >
            Preview
          </a>
          <a href={entry.source.url} target="_blank" rel="noreferrer">
            Original
          </a>
        </nav>
      </footer>
    </article>
  )
}

function ShadcnCollectionPreview({ entry }: { entry: ConformanceCaseMeta }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const container = containerRef.current
    if (!container || visible) return
    const observer = new IntersectionObserver(
      ([observation]) => {
        if (!observation?.isIntersecting) return
        setVisible(true)
        observer.disconnect()
      },
      { rootMargin: '500px 0px' },
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible) return
    let active = true
    let handle: ConformanceHandle | undefined
    let resizeObserver: ResizeObserver | undefined
    let cardResizeObserver: ResizeObserver | undefined
    const mount = async () => {
      try {
        await document.fonts?.ready
        const implementation = await loadTanStackImplementation(entry.id)
        const container = containerRef.current
        if (!active || !implementation || !container) return
        container.replaceChildren()
        let width = Math.max(1, container.clientWidth)
        const height = caseChartHeight(entry)
        handle = implementation.mount(container, {
          width,
          height,
          revision: 0,
          interactive: true,
        })

        const card = container.querySelector<HTMLElement>('.sc-card')
        if (card) {
          const fitPreviewToCard = () => {
            const cardHeight = Math.ceil(card.getBoundingClientRect().height)
            if (cardHeight > 0) container.style.height = `${cardHeight}px`
          }
          fitPreviewToCard()
          cardResizeObserver = new ResizeObserver(fitPreviewToCard)
          cardResizeObserver.observe(card)
        }

        resizeObserver = new ResizeObserver(() => {
          const nextWidth = Math.max(1, container.clientWidth)
          if (nextWidth === width) return
          width = nextWidth
          handle?.update({
            width,
            height,
            revision: 0,
            interactive: true,
          })
        })
        resizeObserver.observe(container)
      } catch (reason) {
        if (!active) return
        setError(reason instanceof Error ? reason.message : String(reason))
      }
    }
    void mount()
    return () => {
      active = false
      cardResizeObserver?.disconnect()
      resizeObserver?.disconnect()
      handle?.destroy()
    }
  }, [entry, visible])

  return (
    <div
      className="shadcn-chart-preview"
      data-case-id={entry.id}
      ref={containerRef}
      style={{ height: caseChartHeight(entry) }}
    >
      <span>{error ? `Renderer failed: ${error}` : 'Loading chart…'}</span>
    </div>
  )
}

interface SharedControls {
  dark: boolean
  family: string
  search: string
  setDark: (value: boolean) => void
  setFamily: (value: string) => void
  setSearch: (value: string) => void
}

type RouteLinkFactory = (
  route: Exclude<CatalogRoute, { view: 'not-found' }>,
) => Pick<CatalogLinkProps, 'href' | 'navigate'>

function CatalogIndex({
  comparisonMode,
  controls,
  entries,
  link,
}: {
  comparisonMode: boolean
  controls: SharedControls
  entries: ConformanceCaseMeta[]
  link: RouteLinkFactory
}) {
  useDocumentMeta(
    'TanStack Charts Catalog',
    comparisonMode
      ? 'Browse executable chart examples, conformance comparisons, source, and documentation-ready TanStack Charts proofs.'
      : 'Browse executable TanStack Charts examples, source, and documentation-ready proofs.',
  )

  return (
    <>
      <SiteHeader active="catalog" link={link} />
      <header className="hero">
        <div>
          <h1>Chart catalog</h1>
          <p className="lede">
            {comparisonMode
              ? 'Browse typed examples, source, and reference comparisons.'
              : 'Browse typed examples and their source.'}
          </p>
        </div>
      </header>
      <BrowseToolbar controls={controls} />
      <main className="catalog">
        <div className="catalog-heading">
          <p>
            {entries.length} of {conformanceCases.length} cases
          </p>
          <CatalogLink {...link({ view: 'all' })}>
            {comparisonMode ? 'Render every comparison' : 'Render every chart'}
          </CatalogLink>
        </div>
        <div className="catalog-grid">
          {entries.length ? (
            entries.map((entry) => (
              <CatalogCard
                key={entry.id}
                comparisonMode={comparisonMode}
                entry={entry}
                link={link}
              />
            ))
          ) : (
            <p className="empty">No catalog cases match those filters.</p>
          )}
        </div>
      </main>
    </>
  )
}

function AllCasesPage({
  chartWidth,
  comparisonMode,
  controls,
  entries,
  link,
  revision,
  setChartWidth,
  update,
}: {
  chartWidth: number
  comparisonMode: boolean
  controls: SharedControls
  entries: ConformanceCaseMeta[]
  link: RouteLinkFactory
  revision: number
  setChartWidth: (value: number) => void
  update: () => void
}) {
  useDocumentMeta(
    'All charts · TanStack Charts Catalog',
    comparisonMode
      ? 'Render the complete TanStack Charts conformance catalog alongside its source-library references.'
      : 'Render the complete TanStack Charts catalog with live source and controls.',
  )

  return (
    <>
      <SiteHeader active="all" link={link} />
      <header className="hero hero-compact">
        <div>
          <h1>All charts</h1>
          {comparisonMode ? (
            <p className="lede">
              Each case uses the same inputs in both renderers.
            </p>
          ) : null}
        </div>
      </header>
      <ComparisonToolbar
        chartWidth={chartWidth}
        controls={controls}
        comparisonMode={comparisonMode}
        revision={revision}
        setChartWidth={setChartWidth}
        update={update}
      />
      <ComparisonCases
        chartWidth={chartWidth}
        comparisonMode={comparisonMode}
        dark={controls.dark}
        entries={entries}
        link={link}
        revision={revision}
      />
    </>
  )
}

function CasePage({
  chartWidth,
  comparisonMode,
  dark,
  entry,
  link,
  revision,
  setChartWidth,
  setDark,
  update,
}: {
  chartWidth: number
  comparisonMode: boolean
  dark: boolean
  entry: ConformanceCaseMeta
  link: RouteLinkFactory
  revision: number
  setChartWidth: (value: number) => void
  setDark: (value: boolean) => void
  update: () => void
}) {
  const siblings = entry.collections?.includes('shadcn')
    ? collectionCases('shadcn')
    : conformanceCases
  const index = siblings.indexOf(entry)
  const previous = siblings[index - 1]
  const next = siblings[index + 1]
  const backRoute = entry.collections?.includes('shadcn')
    ? ({ view: 'collection', collectionId: 'shadcn' } as const)
    : ({ view: 'index' } as const)
  const backLabel = entry.collections?.includes('shadcn')
    ? 'shadcn charts'
    : 'Catalog'
  useDocumentMeta(
    `${entry.title} · TanStack Charts Catalog`,
    comparisonMode
      ? `${entry.intent} Compare the reference implementation with TanStack Charts, inspect source, or reference the chart in documentation.`
      : `${entry.intent} Inspect the source or reference the chart in documentation.`,
  )

  return (
    <>
      <SiteHeader link={link} />
      <header className="detail-header">
        <div>
          <CatalogLink className="back-link" {...link(backRoute)}>
            ← {backLabel}
          </CatalogLink>
          <p className="case-index">
            {String(entry.order).padStart(2, '0')} · {entry.family}
          </p>
          <h1>{entry.title}</h1>
          <p className="lede">{entry.intent}</p>
        </div>
        <nav className="case-pager" aria-label="Adjacent catalog cases">
          {previous ? (
            <CatalogLink {...link({ view: 'case', caseId: previous.id })}>
              ← Previous
            </CatalogLink>
          ) : (
            <span />
          )}
          {next ? (
            <CatalogLink {...link({ view: 'case', caseId: next.id })}>
              Next →
            </CatalogLink>
          ) : (
            <span />
          )}
        </nav>
      </header>
      <ComparisonToolbar
        chartWidth={chartWidth}
        controls={{
          dark,
          family: 'all',
          search: '',
          setDark,
          setFamily: () => undefined,
          setSearch: () => undefined,
        }}
        comparisonMode={comparisonMode}
        includeFilters={false}
        revision={revision}
        setChartWidth={setChartWidth}
        update={update}
      />
      <ComparisonCases
        chartWidth={chartWidth}
        comparisonMode={comparisonMode}
        dark={dark}
        entries={[entry]}
        link={link}
        revision={revision}
        detail
      />
    </>
  )
}

function ComparisonCases({
  chartWidth,
  comparisonMode,
  dark,
  entries,
  link,
  revision,
  detail = false,
}: {
  chartWidth: number
  comparisonMode: boolean
  dark: boolean
  entries: ConformanceCaseMeta[]
  link: RouteLinkFactory
  revision: number
  detail?: boolean
}) {
  return (
    <main className={`cases${detail ? ' cases-detail' : ''}`}>
      {entries.length ? (
        entries.map((entry) => (
          <CaseCard
            chartWidth={chartWidth}
            comparisonMode={comparisonMode}
            dark={dark}
            entry={entry}
            key={entry.id}
            link={link}
            revision={revision}
          />
        ))
      ) : (
        <p className="empty">No catalog cases match those filters.</p>
      )}
    </main>
  )
}

function CatalogCard({
  comparisonMode,
  entry,
  link,
}: {
  comparisonMode: boolean
  entry: ConformanceCaseMeta
  link: RouteLinkFactory
}) {
  const reference = comparisonMode
    ? getConformanceReferenceRenderer(entry)
    : undefined
  return (
    <article className="catalog-card">
      <header>
        <p className="case-index">
          {String(entry.order).padStart(2, '0')} · {entry.family}
        </p>
        <span className={`support support-${entry.support}`}>
          {entry.support}
        </span>
      </header>
      <h2>
        <CatalogLink {...link({ view: 'case', caseId: entry.id })}>
          {entry.title}
        </CatalogLink>
      </h2>
      <p>{entry.intent}</p>
      <FeatureList entry={entry} />
      <footer
        className={comparisonMode ? undefined : 'catalog-card-footer-native'}
      >
        {reference ? <span>{rendererLabel(reference)} reference</span> : null}
        <div>
          <CatalogLink {...link({ view: 'case', caseId: entry.id })}>
            View proof
          </CatalogLink>
          <a
            href={link({ view: 'embed', caseId: entry.id }).href}
            target="_blank"
          >
            Isolated preview
          </a>
        </div>
      </footer>
    </article>
  )
}

function CaseCard({
  chartWidth,
  comparisonMode,
  dark,
  entry,
  link,
  revision,
}: {
  chartWidth: number
  comparisonMode: boolean
  dark: boolean
  entry: ConformanceCaseMeta
  link: RouteLinkFactory
  revision: number
}) {
  const referenceRenderer = getConformanceReferenceRenderer(entry)
  const renderers = catalogRenderers(referenceRenderer, comparisonMode)
  const height = caseChartHeight(entry)
  const docsDirective = `<!-- ::chart-example id=${entry.id} height=${height} -->`

  return (
    <article className="case" id={`case-${entry.id}`}>
      <header className="case-header">
        <div>
          <p className="case-index">
            {String(entry.order).padStart(2, '0')} · {entry.family}
          </p>
          <h2>
            <CatalogLink {...link({ view: 'case', caseId: entry.id })}>
              {entry.title}
            </CatalogLink>
          </h2>
          <p>{entry.intent}</p>
        </div>
        <span className={`support support-${entry.support}`}>
          {entry.support}
        </span>
      </header>
      <FeatureList entry={entry} />
      <div
        className={`comparison ${comparisonMode ? 'comparison-debug' : 'comparison-native'}`}
        style={{ '--chart-width': `${chartWidth}px` } as React.CSSProperties}
      >
        {renderers.map((renderer) => (
          <RendererPanel
            chartWidth={chartWidth}
            entry={entry}
            key={`${renderer}:${dark}`}
            renderer={renderer}
            revision={revision}
          />
        ))}
      </div>
      <footer className="case-footer">
        <div className="case-links">
          {comparisonMode ? (
            <a href={entry.source.url} target="_blank" rel="noreferrer">
              Official reference · {entry.source.title}
            </a>
          ) : null}
          <a
            href={link({ view: 'embed', caseId: entry.id }).href}
            target="_blank"
          >
            Isolated preview
          </a>
        </div>
        <div className="case-details">
          <details>
            <summary>Docs directive</summary>
            <pre>
              <code>{docsDirective}</code>
            </pre>
          </details>
          <details>
            <summary>Agent tasks</summary>
            <dl>
              <dt>Create</dt>
              <dd>{entry.ai.create}</dd>
              <dt>Maintain</dt>
              <dd>{entry.ai.maintain}</dd>
            </dl>
          </details>
        </div>
      </footer>
    </article>
  )
}

function RendererPanel({
  chartWidth,
  entry,
  renderer,
  revision,
}: {
  chartWidth: number
  entry: ConformanceCaseMeta
  renderer: ConformanceRenderer
  revision: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<ConformanceHandle>(null)
  const height = caseChartHeight(entry)
  const inputRef = useRef<ConformanceInput>({
    width: chartWidth,
    height,
    revision,
  })
  const [metric, setMetric] = useState('pending')
  const [source, setSource] = useState<Awaited<
    ReturnType<typeof loadTanStackSources>
  > | null>(null)
  const [state, setState] = useState<'pending' | 'ready' | 'gap' | 'error'>(
    'pending',
  )
  const [error, setError] = useState('')
  inputRef.current = { width: chartWidth, height, revision }

  useEffect(() => {
    let active = true
    let mountedHandle: ConformanceHandle | undefined
    const mount = async () => {
      setState('pending')
      setMetric('pending')
      setError('')
      try {
        await document.fonts?.ready
        const [implementation, loadedSource] =
          renderer === 'tanstack'
            ? await Promise.all([
                loadTanStackImplementation(entry.id),
                loadTanStackSources(entry.id),
              ])
            : await loadComparisonRenderer(entry.id, renderer)
        if (!active || !containerRef.current) return
        setSource(loadedSource)
        if (!implementation) {
          setState('gap')
          setMetric('gap')
          return
        }

        const container = containerRef.current
        const startedAt = performance.now()
        mountedHandle = implementation.mount(container, inputRef.current)
        handleRef.current = mountedHandle
        container.getBoundingClientRect()
        const duration = performance.now() - startedAt
        const elements = container.querySelectorAll('*').length
        const svgBytes = [...container.querySelectorAll('svg')].reduce(
          (total, svg) =>
            total + new TextEncoder().encode(svg.outerHTML).byteLength,
          0,
        )
        setMetric(
          `${duration.toFixed(2)} ms · ${elements} nodes · ${formatBytes(svgBytes)} SVG`,
        )
        setState('ready')
      } catch (reason) {
        if (!active) return
        const message =
          reason instanceof Error ? reason.message : String(reason)
        setError(`Renderer failed: ${message}`)
        setMetric('error')
        setState('error')
        console.error(`Failed to render ${entry.id} with ${renderer}`, reason)
      }
    }
    void mount()
    return () => {
      active = false
      handleRef.current = null
      mountedHandle?.destroy()
    }
  }, [entry.id, renderer])

  useEffect(() => {
    handleRef.current?.update(inputRef.current)
  }, [chartWidth, revision])

  return (
    <section className="renderer" data-renderer={renderer}>
      <header>
        <h3>{rendererLabel(renderer)}</h3>
        <output>{metric}</output>
      </header>
      {state === 'gap' ? (
        <div className="chart" style={{ width: chartWidth, minHeight: height }}>
          <p className="gap">
            Not implemented. This is a recorded capability gap.
          </p>
        </div>
      ) : state === 'error' ? (
        <div className="chart" style={{ width: chartWidth, minHeight: height }}>
          <p className="gap">{error}</p>
        </div>
      ) : (
        <div
          className="chart"
          ref={containerRef}
          style={{ width: chartWidth, minHeight: height }}
        />
      )}
      <details className="source">
        <summary>Source</summary>
        <div>
          {source ? <CatalogSourceView closure={source} /> : 'loading…'}
        </div>
      </details>
    </section>
  )
}

function EmbedPage({ entry }: { entry: ConformanceCaseMeta }) {
  const params = new URLSearchParams(window.location.search)
  const requestedHeight = params.get('height')
  const height =
    requestedHeight === null
      ? caseChartHeight(entry)
      : parseChartEmbedHeight(requestedHeight)
  const revision = parseChartEmbedRevision(params.get('revision'))
  const preview = params.get('preview') === '1'
  const parentOrigin = resolveChartEmbedParentOrigin(document.referrer)
  const [theme, setTheme] = useState(() =>
    parseChartEmbedTheme(params.get('theme')),
  )
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  useDocumentMeta(`${entry.title} · TanStack Charts`, entry.intent, true)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setSystemDark(media.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const command = readTrustedChartEmbedThemeCommand(
        event,
        window.parent,
        parentOrigin,
        entry.id,
      )
      if (command) setTheme(command.theme)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [entry.id, parentOrigin])

  useEffect(() => {
    const dark = theme === 'dark' || (theme === 'system' && systemDark)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [systemDark, theme])

  useEffect(() => {
    let active = true
    let handle: ConformanceHandle | undefined
    let observer: ResizeObserver | undefined
    let frame = 0
    const mount = async () => {
      try {
        await document.fonts?.ready
        const container = containerRef.current
        if (!active || !container) return
        const implementation = await loadTanStackImplementation(entry.id)
        if (!active || !container) return
        if (!implementation) {
          throw new Error(
            'This catalog case has no TanStack implementation yet.',
          )
        }
        let width = measureEmbedWidth(container)
        const mountImplementation =
          preview && implementation.catalogCase
            ? implementation.catalogCase.mount
            : implementation.mount
        handle = mountImplementation(container, {
          width,
          height,
          revision,
          interactive: !preview,
          preview,
        })
        observer = new ResizeObserver(() => {
          const nextWidth = measureEmbedWidth(container)
          if (nextWidth === width || nextWidth < 1) return
          width = nextWidth
          handle?.update({
            width,
            height,
            revision,
            interactive: !preview,
            preview,
          })
          postEmbedMessage('resize', entry, height, parentOrigin)
        })
        observer.observe(container)
        frame = requestAnimationFrame(() => {
          postEmbedMessage('ready', entry, height, parentOrigin)
        })
      } catch (reason) {
        if (!active) return
        const message =
          reason instanceof Error ? reason.message : String(reason)
        setError(`Renderer failed: ${message}`)
        postEmbedMessage('error', entry, height, parentOrigin)
      }
    }
    void mount()
    return () => {
      active = false
      cancelAnimationFrame(frame)
      observer?.disconnect()
      handle?.destroy()
    }
  }, [entry, height, parentOrigin, preview, revision])

  return (
    <main
      className="embed-shell"
      data-case-id={entry.id}
      aria-label={entry.title}
    >
      {error ? (
        <div className="chart embed-chart" style={{ height }}>
          <p className="gap">{error}</p>
        </div>
      ) : (
        <div
          className="chart embed-chart"
          id={`${entry.id}-tanstack`}
          ref={containerRef}
          style={{ height }}
        />
      )}
    </main>
  )
}

function SiteHeader({
  active,
  link,
}: {
  active?: 'catalog' | 'all' | 'json' | 'shadcn'
  link: RouteLinkFactory
}) {
  return (
    <header className="site-header">
      <div className="site-header-brand">
        <a
          className="back-link"
          href="https://tanstack.com/"
          aria-label="Back to TanStack"
        >
          <span aria-hidden="true">←</span>
          <span className="back-link-label">TanStack</span>
        </a>
        <span className="site-header-separator" aria-hidden="true">
          /
        </span>
        <CatalogLink className="wordmark" {...link({ view: 'index' })}>
          Charts <span>Catalog</span>
        </CatalogLink>
      </div>
      <nav aria-label="Catalog">
        <CatalogLink
          aria-current={active === 'catalog' ? 'page' : undefined}
          {...link({ view: 'index' })}
        >
          Browse
        </CatalogLink>
        <CatalogLink
          aria-current={active === 'all' ? 'page' : undefined}
          {...link({ view: 'all' })}
        >
          All charts
        </CatalogLink>
        <CatalogLink
          aria-current={active === 'shadcn' ? 'page' : undefined}
          {...link({ view: 'collection', collectionId: 'shadcn' })}
        >
          shadcn
        </CatalogLink>
        <CatalogLink
          aria-current={active === 'json' ? 'page' : undefined}
          {...link({ view: 'json' })}
        >
          Chart JSON
        </CatalogLink>
      </nav>
    </header>
  )
}

function BrowseToolbar({ controls }: { controls: SharedControls }) {
  return (
    <section className="toolbar" aria-label="Catalog controls">
      <ToolbarFilters controls={controls} />
      <ThemeButton controls={controls} />
    </section>
  )
}

function ComparisonToolbar({
  chartWidth,
  comparisonMode,
  controls,
  includeFilters = true,
  revision,
  setChartWidth,
  update,
}: {
  chartWidth: number
  comparisonMode: boolean
  controls: SharedControls
  includeFilters?: boolean
  revision: number
  setChartWidth: (value: number) => void
  update: () => void
}) {
  return (
    <section
      className="toolbar"
      aria-label={comparisonMode ? 'Comparison controls' : 'Chart controls'}
    >
      {includeFilters ? <ToolbarFilters controls={controls} /> : null}
      <label>
        <span>Chart width</span>
        <select
          value={chartWidth}
          onChange={(event) => setChartWidth(Number(event.currentTarget.value))}
        >
          {[320, 640, 960].map((width) => (
            <option key={width} value={width}>
              {width}px
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={update}>
        Update data · {revision}
      </button>
      <ThemeButton controls={controls} />
    </section>
  )
}

function ToolbarFilters({ controls }: { controls: SharedControls }) {
  return (
    <>
      <label className="filter-field">
        <span>Filter</span>
        <input
          type="search"
          value={controls.search}
          placeholder="line, stack, facet…"
          onChange={(event) =>
            controls.setSearch(event.currentTarget.value.trim().toLowerCase())
          }
        />
      </label>
      <label>
        <span>Family</span>
        <select
          value={controls.family}
          onChange={(event) => controls.setFamily(event.currentTarget.value)}
        >
          <option value="all">All families</option>
          {families.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

function ThemeButton({ controls }: { controls: SharedControls }) {
  return (
    <button type="button" onClick={() => controls.setDark(!controls.dark)}>
      {controls.dark ? 'Light mode' : 'Dark mode'}
    </button>
  )
}

function FeatureList({ entry }: { entry: ConformanceCaseMeta }) {
  return (
    <ul className="features">
      {entry.features.map((feature) => (
        <li key={feature}>{feature}</li>
      ))}
    </ul>
  )
}

interface CatalogLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  navigate: (href: string) => void
  children: ReactNode
}

function CatalogLink({
  children,
  href,
  navigate,
  onClick,
  ...props
}: CatalogLinkProps) {
  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target === '_blank' ||
      props.download
    ) {
      return
    }
    const url = new URL(href, window.location.href)
    if (url.origin !== window.location.origin) return
    event.preventDefault()
    navigate(url.href)
  }
  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}

function NotFound({
  embed = false,
  link,
}: {
  embed?: boolean
  link: RouteLinkFactory
}) {
  useDocumentMeta(
    'Chart not found · TanStack Charts Catalog',
    'Chart not found.',
    true,
  )
  return (
    <>
      {embed ? null : <SiteHeader link={link} />}
      <main className="not-found">
        <h1>Chart not found.</h1>
        {embed ? null : (
          <CatalogLink {...link({ view: 'index' })}>
            Browse the catalog
          </CatalogLink>
        )}
      </main>
    </>
  )
}

function filterCases(search: string, family: string): ConformanceCaseMeta[] {
  return conformanceCases.filter((entry) => {
    if (family !== 'all' && entry.family !== family) return false
    if (!search) return true
    const text = [entry.title, entry.family, entry.intent, ...entry.features]
      .join(' ')
      .toLowerCase()
    return text.includes(search)
  })
}

function collectionCases(collectionId: string): ConformanceCaseMeta[] {
  const familyOrder = [
    'dashboard',
    'area',
    'bar',
    'line',
    'pie',
    'radar',
    'radial',
    'tooltip',
  ]
  return conformanceCases
    .filter((entry) => entry.collections?.includes(collectionId))
    .sort(
      (left, right) =>
        familyOrder.indexOf(left.family) - familyOrder.indexOf(right.family) ||
        left.source.url.localeCompare(right.source.url),
    )
}

function shadcnDisplayTitle(title: string): string {
  const display = title.replace(/^shadcn\s+/iu, '')
  return display.charAt(0).toUpperCase() + display.slice(1)
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function caseChartHeight(entry: ConformanceCaseMeta): number {
  return entry.height ?? chartHeight
}

function readCatalogLocation() {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
  }
}

async function loadComparisonRenderer(
  id: string,
  renderer: ConformanceReferenceRenderer,
) {
  comparisonCatalogPromise ??=
    import('../../../benchmarks/conformance/comparison-catalog')
  const catalog = await comparisonCatalogPromise
  return Promise.all([
    catalog.loadComparisonImplementation(id, renderer),
    catalog.loadComparisonSources(id, renderer),
  ])
}

function rendererLabel(renderer: ConformanceRenderer): string {
  if (renderer === 'observable-plot') return 'Observable Plot'
  if (renderer === 'recharts') return 'Recharts'
  if (renderer === 'echarts') return 'Apache ECharts'
  return 'TanStack Charts'
}

function useDocumentMeta(title: string, description: string, noIndex = false) {
  useEffect(() => {
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
  }, [description, noIndex, title])
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

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Missing conformance app root')
createRoot(app).render(<CatalogApp />)
