import { useMemo, useState } from 'octane'
import {
  createIndustryHistoryChart,
  createRankingChart,
  industryWindowCount,
  industryWindowLabel,
} from './charts'
import type { IndustriesRow, IndustryHistoryMode } from './charts'
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/charts/octane'
import type { ChartPoint } from '@tanstack/charts/octane'

const historyModes = ['line', 'stacked', 'share', 'stream'] as const

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [historyMode, setHistoryMode] = useState<IndustryHistoryMode>('line')
  const [historyZoomed, setHistoryZoomed] = useState(false)
  const [industryWindow, setIndustryWindow] = useState(0)
  const [rankingMetric, setRankingMetric] = useState<
    'power (hp)' | 'economy (mpg)'
  >('power (hp)')
  const [focusedPoints, setFocusedPoints] = useState<
    readonly ChartPoint<IndustriesRow>[]
  >([])

  // Octane's compiler derives these memo dependencies from the closure.
  const historyDefinition = useMemo(() =>
    defineChart(
      createIndustryHistoryChart(historyMode, industryWindow, historyZoomed),
      {
        animate: { duration: 500, easing: 'ease-out' },
        focus: 'group-x',
        tooltip: { use: tooltip, formatGroup: formatHistoryGroup },
      },
    ),
  )
  const rankingDefinition = useMemo(() =>
    defineChart(
      createRankingChart(rankingMetric, 'var(--demo-accent, #ff6a3d)'),
      {
        animate: { duration: 500, easing: 'ease-in-out' },
        tooltip: {
          use: tooltip,
          format: (point) =>
            `${point.yValue}: ${point.xValue.toLocaleString()}`,
        },
      },
    ),
  )

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)
  }

  return (
    <main class="demo-shell">
      <nav class="topbar" aria-label="Demo navigation">
        <a class="brand brand--tanstack" href="https://tanstack.com">
          <span class="brand__mark" aria-hidden="true">
            TS
          </span>
          <span>
            TanStack
            <strong>Charts</strong>
          </span>
        </a>
        <span class="topbar__join" aria-hidden="true">
          ×
        </span>
        <a
          class="brand brand--octane"
          href="https://github.com/octanejs/octane"
        >
          <span class="brand__mark" aria-hidden="true">
            O
          </span>
          <span>
            Octane
            <strong>0.1.13 · alpha</strong>
          </span>
        </a>
        <button
          class="theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={`Use ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          <span aria-hidden="true">{theme === 'light' ? '●' : '○'}</span>
          {theme}
        </button>
      </nav>

      <header class="hero">
        <div class="hero__copy">
          <p class="eyebrow">
            Native .tsrx adapter
            <span>compiled UI · framework-neutral charts</span>
          </p>
          <h1>
            TanStack Charts
            <span>× Octane</span>
          </h1>
          <p class="hero__lede">
            Responsive, interactive, server-rendered charts in native Octane. No
            React compatibility layer. No second chart implementation.
          </p>
        </div>
        <dl class="hero__proof">
          <div>
            <dt>Source</dt>
            <dd>.tsrx</dd>
          </div>
          <div>
            <dt>Runtime</dt>
            <dd>native</dd>
          </div>
          <div>
            <dt>Output</dt>
            <dd>SVG + SSR</dd>
          </div>
        </dl>
      </header>

      <section class="chart-stage" aria-labelledby="history-title">
        <div class="chart-stage__rail">
          <span>
            <i aria-hidden="true" />
            Live Octane state
          </span>
          <span>30 months · 3 industries · pointer + keyboard</span>
        </div>
        <div class="chart-stage__heading">
          <div>
            <p class="section-number">BLS monthly estimates</p>
            <h2 id="history-title">Unemployment by industry</h2>
            <p class="chart-stage__period">
              {industryWindowLabel(industryWindow)}
            </p>
          </div>
          <button
            class="text-action"
            type="button"
            onClick={() =>
              setIndustryWindow(
                (windowIndex) => (windowIndex + 1) % industryWindowCount,
              )
            }
          >
            Next period <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div class="chart-stage__controls" aria-label="History chart options">
          <div class="segmented-control">
            {historyModes.map((mode) => (
              <button
                type="button"
                data-active={historyMode === mode || undefined}
                aria-pressed={historyMode === mode}
                onClick={() => setHistoryMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            class="zoom-control"
            type="button"
            data-active={historyZoomed || undefined}
            aria-pressed={historyZoomed}
            onClick={() => setHistoryZoomed((value) => !value)}
          >
            {historyZoomed ? 'Show all' : 'Zoom 10m'}
          </button>
        </div>

        <div class="chart-stage__canvas">
          <Chart
            definition={historyDefinition}
            height={410}
            initialWidth={1080}
            ariaLabel={`Monthly unemployment for three industries shown as a ${historyMode} chart`}
            ariaDescription="Bureau of Labor Statistics estimates from the Observable industries dataset. Use the pointer or keyboard to compare industries."
            onFocusGroupChange={(points) => setFocusedPoints(points)}
          />
        </div>

        <div class="chart-stage__readout" aria-live="polite">
          <span>Focus readout</span>
          <strong>{formatFocusReadout(focusedPoints)}</strong>
        </div>
      </section>

      <section class="ownership" aria-label="Runtime ownership">
        <div>
          <span>Octane owns</span>
          <p>compiled components · state · effects · delegated events</p>
        </div>
        <div>
          <span>Charts owns</span>
          <p>typed grammar · scenes · responsive host · interaction</p>
        </div>
        <div>
          <span>D3 owns</span>
          <p>scales · curves · transforms · spatial math</p>
        </div>
      </section>

      <section class="native-proof" aria-labelledby="native-title">
        <div class="native-proof__copy">
          <p class="section-number">02 / native by construction</p>
          <h2 id="native-title">State in. Scene out. No translation layer.</h2>
          <p>
            The Octane adapter only binds TanStack Charts to Octane’s lifecycle.
            Definitions, sizing, accessibility, focus, animation, and SVG stay
            framework-neutral.
          </p>
          <ul>
            <li>Compiler-derived memo dependencies</li>
            <li>Responsive container measurement</li>
            <li>SSR and hydration parity</li>
            <li>Stable keyed updates</li>
          </ul>
        </div>

        <div class="source-panel" aria-label="Octane source example">
          <div class="source-panel__bar">
            <span>App.tsrx</span>
            <span>dependencies inferred by compiler</span>
          </div>
          <pre>
            <code>
              <span class="code-keyword">const</span> definition ={' '}
              <span class="code-call">useMemo</span>(() ={`>`}
              {'\n  '}
              <span class="code-call">createIndustryHistoryChart</span>(
              {'\n    '}mode, windowIndex, zoomed
              {'\n  '}){'\n'}){'\n'}
              {`<`}
              <span class="code-component">Chart</span>
              {'\n  '}definition={'{definition}'}
              {'\n  '}onFocusGroupChange={'{setFocusedPoints}'}
              {'\n'}/{`>`}
            </code>
          </pre>
        </div>

        <div class="ranking-panel">
          <div class="ranking-panel__heading">
            <div>
              <span>Keyed reconciliation</span>
              <h3>
                Cars ranked by{' '}
                {rankingMetric === 'power (hp)' ? 'power' : 'fuel economy'}.
              </h3>
            </div>
            <button
              class="icon-action"
              type="button"
              onClick={() =>
                setRankingMetric((metric) =>
                  metric === 'power (hp)' ? 'economy (mpg)' : 'power (hp)',
                )
              }
              aria-label="Change automobile ranking metric"
            >
              ↻
            </button>
          </div>
          <Chart
            definition={rankingDefinition}
            height={320}
            initialWidth={600}
            ariaLabel="Animated automobile ranking"
          />
        </div>
      </section>

      <footer class="footer">
        <span>Built with Octane 0.1.13 + @tanstack/charts/octane</span>
        <span>The same definition also runs in React and vanilla DOM.</span>
      </footer>
    </main>
  )
}

function formatHistoryGroup(points: readonly ChartPoint<IndustriesRow>[]) {
  const first = points[0]
  if (!first) return ''
  const heading =
    first.xValue instanceof Date
      ? first.xValue.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : String(first.xValue)
  return `${heading}\n${points
    .map(
      (point) =>
        `${point.datum.industry}: ${point.datum.unemployed.toLocaleString()} thousand`,
    )
    .join('\n')}`
}

function formatFocusReadout(points: readonly ChartPoint<IndustriesRow>[]) {
  const first = points[0]
  if (!first) return 'Move across the chart to inspect the live state bridge.'
  const date =
    first.xValue instanceof Date
      ? first.xValue.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        })
      : String(first.xValue)
  const values = points
    .map(
      (point) =>
        `${point.datum.industry} ${compactNumber.format(point.datum.unemployed * 1_000)}`,
    )
    .join(' · ')
  return `${date} — ${values}`
}

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
