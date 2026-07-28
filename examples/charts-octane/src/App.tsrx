import { useMemo, useState } from 'octane'
import {
  createRankingData,
  createStatsHistoryInput,
  rankingChart,
  statsHistoryChart,
} from '@charts-poc/fixtures'
import type {
  StatsHistoryMode,
  StatsHistoryPoint,
} from '@charts-poc/fixtures'
import { focusX } from '@tanstack/charts/focus'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import { Chart } from '@tanstack/octane-charts'
import type { ChartPoint } from '@tanstack/octane-charts'

const historyModes = ['line', 'stacked', 'share', 'stream'] as const

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [historyMode, setHistoryMode] = useState<StatsHistoryMode>('line')
  const [historyZoomed, setHistoryZoomed] = useState(false)
  const [revision, setRevision] = useState(0)
  const [focusedPoints, setFocusedPoints] = useState<
    readonly ChartPoint<StatsHistoryPoint>[]
  >([])

  // Octane's compiler derives these memo dependencies from the closure.
  const historyInput = useMemo(() =>
    createStatsHistoryInput(historyMode, revision, historyZoomed),
  )
  const rankingData = useMemo(() => createRankingData(revision))

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
        <a class="brand brand--octane" href="https://github.com/octanejs/octane">
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
            Responsive, interactive, server-rendered charts in native Octane.
            No React compatibility layer. No second chart implementation.
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
          <span>26 weeks · 3 series · pointer + keyboard</span>
        </div>
        <div class="chart-stage__heading">
          <div>
            <p class="section-number">01 / production-shaped proof</p>
            <h2 id="history-title">Package velocity</h2>
          </div>
          <button
            class="text-action"
            type="button"
            onClick={() => setRevision((value) => value + 1)}
          >
            Shuffle live data <span aria-hidden="true">↗</span>
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
            {historyZoomed ? 'Show all' : 'Zoom 8w'}
          </button>
        </div>

        <div class="chart-stage__canvas">
          <Chart
            definition={statsHistoryChart}
            input={historyInput}
            height={410}
            initialWidth={1080}
            ariaLabel={`TanStack package velocity shown as a ${historyMode} chart`}
            ariaDescription="A live chart rendered by the native Octane adapter. Use the pointer or keyboard to inspect values."
            animate={{ duration: 500, easing: 'ease-out' }}
            focus={focusX}
            tooltip={{ formatGroup: formatHistoryGroup }}
            renderSvg={renderChartSvgWithResources}
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
              <span class="code-keyword">const</span> input ={' '}
              <span class="code-call">useMemo</span>(() ={`>`}
              {'\n  '}
              <span class="code-call">createStatsHistoryInput</span>(
              {'\n    '}mode, revision, zoomed
              {'\n  '})
              {'\n'})
              {'\n'}
              {`<`}
              <span class="code-component">Chart</span>
              {'\n  '}definition={'{statsHistoryChart}'}
              {'\n  '}input={'{input}'}
              {'\n  '}animate
              {'\n  '}focus={'{focusX}'}
              {'\n'}/{`>`}
            </code>
          </pre>
        </div>

        <div class="ranking-panel">
          <div class="ranking-panel__heading">
            <div>
              <span>Keyed reconciliation</span>
              <h3>Every update keeps its identity.</h3>
            </div>
            <button
              class="icon-action"
              type="button"
              onClick={() => setRevision((value) => value + 1)}
              aria-label="Update package ranking"
            >
              ↻
            </button>
          </div>
          <Chart
            definition={rankingChart}
            input={{
              data: rankingData,
              accent: 'var(--demo-accent, #ff6a3d)',
            }}
            height={320}
            initialWidth={600}
            ariaLabel="Animated TanStack package ranking"
            animate={{ duration: 500, easing: 'ease-in-out' }}
            tooltip={{
              format: (point) =>
                `${point.yValue}: ${point.xValue.toLocaleString()}`,
            }}
          />
        </div>
      </section>

      <footer class="footer">
        <span>Built with Octane 0.1.13 + @tanstack/octane-charts</span>
        <span>The same definition also runs in React and vanilla DOM.</span>
      </footer>
    </main>
  )
}

function formatHistoryGroup(
  points: readonly ChartPoint<StatsHistoryPoint>[],
) {
  const first = points[0]
  if (!first) return ''
  const heading =
    first.xValue instanceof Date
      ? first.xValue.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : String(first.xValue)
  return `${heading}\n${points
    .map(
      (point) =>
        `${point.groupLabel}: ${point.datum.downloads.toLocaleString()}`,
    )
    .join('\n')}`
}

function formatFocusReadout(
  points: readonly ChartPoint<StatsHistoryPoint>[],
) {
  const first = points[0]
  if (!first) return 'Move across the chart to inspect the live state bridge.'
  const date =
    first.xValue instanceof Date
      ? first.xValue.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : String(first.xValue)
  const values = points
    .map(
      (point) =>
        `${point.groupLabel} ${compactNumber.format(point.datum.downloads)}`,
    )
    .join(' · ')
  return `${date} — ${values}`
}

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
