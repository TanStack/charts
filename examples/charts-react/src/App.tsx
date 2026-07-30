import * as React from 'react'
import {
  activityChart,
  createRankingChart,
  createStatsHistoryInput,
  createStatsHistoryChart,
  createStatsLatestInput,
  createStatsLatestChart,
  createRankingData,
  downloadsChart,
  latencyChart,
  type BinDatum,
  type DownloadPoint,
  type StatsBarOrientation,
  type StatsHistoryMode,
} from '@charts-poc/fixtures'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import { defineChart } from '@tanstack/charts'
import { Chart, type ChartPoint } from '@tanstack/react-charts'

const interactiveDownloadsChart = defineChart(downloadsChart, {
  tooltip: {
    placement: ['top', 'right', 'left', 'bottom'],
    items: [
      {
        channel: 'y',
        label: 'Downloads',
        text: (point) => point.yValue.toLocaleString(),
      },
      'x',
    ],
  },
})
const interactiveLatencyChart = defineChart(latencyChart, {
  tooltip: {
    format: (point) =>
      `${point.datum.x1.toFixed(0)}–${point.datum.x2.toFixed(0)} ms · ${point.yValue} requests`,
  },
})
const interactiveActivityChart = defineChart(activityChart, { tooltip: true })

export function App() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light')
  const [download, setDownload] =
    React.useState<ChartPoint<DownloadPoint> | null>(null)
  const [activity, setActivity] = React.useState<ChartPoint<number> | null>(
    null,
  )
  const [latency, setLatency] = React.useState<ChartPoint<
    BinDatum<number>
  > | null>(null)
  const [rankingRound, setRankingRound] = React.useState(0)
  const [statsRound, setStatsRound] = React.useState(0)
  const [historyMode, setHistoryMode] = React.useState<StatsHistoryMode>('line')
  const [historyZoomed, setHistoryZoomed] = React.useState(false)
  const [barOrientation, setBarOrientation] =
    React.useState<StatsBarOrientation>('vertical')
  const [barsStacked, setBarsStacked] = React.useState(false)
  const rankingDefinition = React.useMemo(
    () =>
      defineChart(
        createRankingChart({
          data: createRankingData(rankingRound),
          accent: 'var(--ts-chart-4, #8b5cf6)',
        }),
        {
          animate: { duration: 420, easing: 'ease-in-out' },
          tooltip: {
            format: (point) =>
              `${point.yValue}: ${point.xValue.toLocaleString()}`,
          },
        },
      ),
    [rankingRound],
  )
  const statsHistoryDefinition = React.useMemo(
    () =>
      defineChart(
        createStatsHistoryChart(
          createStatsHistoryInput(historyMode, statsRound, historyZoomed),
        ),
        {
          animate: { duration: 500, easing: 'ease-out' },
          focus: 'group-x',
          tooltip: { formatGroup: formatStatsGroup },
        },
      ),
    [historyMode, historyZoomed, statsRound],
  )
  const statsLatestDefinition = React.useMemo(
    () =>
      defineChart(
        createStatsLatestChart(
          createStatsLatestInput(barOrientation, barsStacked, statsRound),
        ),
        {
          animate: { duration: 500, easing: 'ease-out' },
          focus: barOrientation === 'vertical' ? 'group-x' : 'group-y',
          tooltip: { format: formatStatsPoint },
        },
      ),
    [barOrientation, barsStacked, statsRound],
  )

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)
  }

  return (
    <main className="demo">
      <header className="demo__header">
        <div>
          <p className="demo__eyebrow">TanStack Charts native spike</p>
          <h1>Arbitrary data. One tiny grammar.</h1>
          <p className="demo__lede">
            Plot-style marks and channels compile into a renderer-neutral scene.
            React only owns the host lifecycle.
          </p>
        </div>
        <button className="theme-toggle" type="button" onClick={toggleTheme}>
          Use {theme === 'light' ? 'dark' : 'light'} mode
        </button>
      </header>

      <div className="demo__grid">
        <section className="chart-card chart-card--parity">
          <div className="chart-card__header">
            <div>
              <h2>TanStack Stats · history parity</h2>
              <p className="chart-card__meta">
                Partial periods, interval areas, stream baselines, grouped
                pointer focus, gradients, and clipped zoom.
              </p>
            </div>
            <button
              className="chart-action"
              type="button"
              onClick={() => setStatsRound((round) => round + 1)}
            >
              Update data
            </button>
          </div>
          <div className="chart-controls" aria-label="History chart options">
            {(['line', 'stacked', 'share', 'stream'] as const).map((mode) => (
              <button
                className="chart-control"
                data-active={historyMode === mode || undefined}
                type="button"
                key={mode}
                onClick={() => setHistoryMode(mode)}
              >
                {mode}
              </button>
            ))}
            <button
              className="chart-control"
              data-active={historyZoomed || undefined}
              type="button"
              onClick={() => setHistoryZoomed((zoomed) => !zoomed)}
            >
              zoom
            </button>
          </div>
          <div className="stats-legend" aria-label="Series">
            <span>
              <i style={{ background: '#ef4444' }} />
              Query
            </span>
            <span>
              <i style={{ background: '#22c55e' }} />
              Router
            </span>
            <span>
              <i style={{ background: '#3b82f6' }} />
              Table
            </span>
          </div>
          <Chart
            definition={statsHistoryDefinition}
            height={410}
            initialWidth={1040}
            ariaLabel={`TanStack Stats ${historyMode} history parity chart`}
            renderSvg={renderChartSvgWithResources}
          />
        </section>

        <section className="chart-card chart-card--parity">
          <div className="chart-card__header">
            <div>
              <h2>TanStack Stats · latest parity</h2>
              <p className="chart-card__meta">
                Grouped and interval-stacked bars retain identity through
                sorting, orientation, and value updates.
              </p>
            </div>
            <span className="chart-card__badge">real migration gate</span>
          </div>
          <div className="chart-controls" aria-label="Latest chart options">
            <button
              className="chart-control"
              data-active={!barsStacked || undefined}
              type="button"
              onClick={() => setBarsStacked(false)}
            >
              grouped
            </button>
            <button
              className="chart-control"
              data-active={barsStacked || undefined}
              type="button"
              onClick={() => setBarsStacked(true)}
            >
              stacked
            </button>
            <button
              className="chart-control"
              data-active={barOrientation === 'vertical' || undefined}
              type="button"
              onClick={() => setBarOrientation('vertical')}
            >
              vertical
            </button>
            <button
              className="chart-control"
              data-active={barOrientation === 'horizontal' || undefined}
              type="button"
              onClick={() => setBarOrientation('horizontal')}
            >
              horizontal
            </button>
          </div>
          <Chart
            definition={statsLatestDefinition}
            height={430}
            initialWidth={1040}
            ariaLabel={`TanStack Stats ${barsStacked ? 'stacked' : 'grouped'} ${barOrientation} latest chart`}
            renderSvg={renderChartSvgWithResources}
          />
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <div>
              <h2>Package momentum</h2>
              <p className="chart-card__meta">
                {download
                  ? `${download.groupLabel}: ${download.yValue.toLocaleString()}`
                  : 'Move over a point to inspect it.'}
              </p>
            </div>
            <span className="chart-card__badge">one mark · three groups</span>
          </div>
          <Chart
            definition={interactiveDownloadsChart}
            height={330}
            initialWidth={760}
            ariaLabel="TanStack package download trends"
            onFocusChange={setDownload}
          />
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <div>
              <h2>Request latency</h2>
              <p className="chart-card__meta">
                {latency
                  ? `${latency.datum.x1.toFixed(0)}–${latency.datum.x2.toFixed(0)} ms: ${latency.yValue} requests`
                  : 'A pure bin transform feeds an ordinary rect mark.'}
              </p>
            </div>
            <span className="chart-card__badge">bin · rect</span>
          </div>
          <Chart
            definition={interactiveLatencyChart}
            height={320}
            initialWidth={760}
            ariaLabel="Request latency distribution"
            onFocusChange={setLatency}
          />
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <div>
              <h2>Release activity</h2>
              <p className="chart-card__meta">
                {activity
                  ? `Release ${activity.xValue}: ${activity.yValue}`
                  : 'A raw number array needs no data model.'}
              </p>
            </div>
            <span className="chart-card__badge">
              number[] · implicit channels
            </span>
          </div>
          <Chart
            definition={interactiveActivityChart}
            height={320}
            initialWidth={760}
            ariaLabel="Release activity trend"
            onFocusChange={setActivity}
          />
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <div>
              <h2>Package ranking</h2>
              <p className="chart-card__meta">
                Stable keys reconcile and animate every reordered bar.
              </p>
            </div>
            <button
              className="chart-action"
              type="button"
              onClick={() => setRankingRound((round) => round + 1)}
            >
              Update data
            </button>
          </div>
          <Chart
            definition={rankingDefinition}
            height={360}
            initialWidth={760}
            ariaLabel="TanStack package momentum ranking"
            ariaDescription="A horizontal ranking that reorders when its data changes."
          />
        </section>
      </div>
    </main>
  )
}

function formatStatsGroup(
  points: readonly {
    groupLabel: string
    xValue: string | number | Date
    yValue: string | number | Date
    datum: unknown
  }[],
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
  return `${heading}\n${points.map(formatStatsPoint).join('\n')}`
}

function formatStatsPoint(point: {
  groupLabel: string
  yValue: string | number | Date
  datum: unknown
}) {
  const datum = point.datum
  if (datum != null && typeof datum === 'object') {
    if ('label' in datum && typeof datum.label === 'string') return datum.label
    if ('downloads' in datum && typeof datum.downloads === 'number') {
      return `${point.groupLabel}: ${datum.downloads.toLocaleString()}`
    }
  }
  return `${point.groupLabel}: ${String(point.yValue)}`
}
