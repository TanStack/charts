import * as React from 'react'
import {
  downloadAreaChart,
  downloadsChart,
  createIndustryHistoryChart,
  createPenguinChart,
  createRankingChart,
  horsepowerChart,
  industryWindowCount,
  industryWindowLabel,
  type BarOrientation,
  type DownloadsRow,
  type HorsepowerBin,
  type IndustryHistoryMode,
  type IndustriesRow,
  type PenguinCount,
} from './charts'
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart, type ChartPoint } from '@tanstack/react-charts'

const interactiveDownloadsChart = defineChart(downloadsChart, {
  tooltip: {
    use: tooltip,
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
const interactiveHorsepowerChart = defineChart(horsepowerChart, {
  tooltip: {
    use: tooltip,
    format: (point) =>
      `${point.datum.x0?.toFixed(0)}–${point.datum.x1?.toFixed(0)} hp · ${point.datum.length} cars`,
  },
})
const interactiveDownloadAreaChart = defineChart(downloadAreaChart, {
  tooltip,
})

export function App() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light')
  const [download, setDownload] =
    React.useState<ChartPoint<DownloadsRow> | null>(null)
  const [areaDownload, setAreaDownload] =
    React.useState<ChartPoint<DownloadsRow> | null>(null)
  const [horsepower, setHorsepower] =
    React.useState<ChartPoint<HorsepowerBin> | null>(null)
  const [rankingRound, setRankingRound] = React.useState(0)
  const [industryWindow, setIndustryWindow] = React.useState(0)
  const [historyMode, setHistoryMode] =
    React.useState<IndustryHistoryMode>('line')
  const [historyZoomed, setHistoryZoomed] = React.useState(false)
  const [barOrientation, setBarOrientation] =
    React.useState<BarOrientation>('vertical')
  const [barsStacked, setBarsStacked] = React.useState(false)
  const rankingMetric: 'power (hp)' | 'economy (mpg)' =
    rankingRound % 2 === 0 ? 'power (hp)' : 'economy (mpg)'
  const rankingDefinition = React.useMemo(
    () =>
      defineChart(
        createRankingChart(rankingMetric, 'var(--ts-chart-4, #8b5cf6)'),
        {
          animate: { duration: 420, easing: 'ease-in-out' },
          tooltip: {
            use: tooltip,
            format: (point) =>
              `${point.yValue}: ${point.xValue.toLocaleString()}`,
          },
        },
      ),
    [rankingMetric],
  )
  const industryHistoryDefinition = React.useMemo(
    () =>
      defineChart(
        createIndustryHistoryChart(historyMode, industryWindow, historyZoomed),
        {
          animate: { duration: 500, easing: 'ease-out' },
          focus: 'group-x',
          tooltip: { use: tooltip, formatGroup: formatIndustryGroup },
        },
      ),
    [historyMode, historyZoomed, industryWindow],
  )
  const penguinDefinition = React.useMemo(
    () =>
      defineChart(createPenguinChart(barOrientation, barsStacked), {
        animate: { duration: 500, easing: 'ease-out' },
        focus: barOrientation === 'vertical' ? 'group-x' : 'group-y',
        tooltip: { use: tooltip, format: formatPenguinPoint },
      }),
    [barOrientation, barsStacked],
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
          <h1>TanStack Charts with React</h1>
          <p className="demo__lede">
            React owns state and lifecycle. The charts read pinned Observable
            datasets with their original fields.
          </p>
        </div>
        <button className="theme-toggle" type="button" onClick={toggleTheme}>
          Use {theme === 'light' ? 'dark' : 'light'} mode
        </button>
      </header>

      <div className="demo__grid">
        <section className="chart-card chart-card--feature">
          <div className="chart-card__header">
            <div>
              <h2>Unemployment by industry</h2>
              <p className="chart-card__meta">
                {industryWindowLabel(industryWindow)} · BLS monthly estimates
              </p>
            </div>
            <button
              className="chart-action"
              type="button"
              onClick={() =>
                setIndustryWindow(
                  (windowIndex) => (windowIndex + 1) % industryWindowCount,
                )
              }
            >
              Next period
            </button>
          </div>
          <div
            className="chart-controls"
            aria-label="Industry history chart options"
          >
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
          <Chart
            definition={industryHistoryDefinition}
            height={410}
            initialWidth={1040}
            ariaLabel={`Monthly unemployment for three industries shown as a ${historyMode} chart`}
          />
        </section>

        <section className="chart-card chart-card--feature">
          <div className="chart-card__header">
            <div>
              <h2>Palmer penguins by species and sex</h2>
              <p className="chart-card__meta">
                Counts are aggregated from the original penguin observations.
              </p>
            </div>
            <span className="chart-card__badge">344 observations</span>
          </div>
          <div className="chart-controls" aria-label="Penguin chart options">
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
            definition={penguinDefinition}
            height={430}
            initialWidth={1040}
            ariaLabel={`${barsStacked ? 'Stacked' : 'Grouped'} ${barOrientation} penguin counts by species and sex`}
          />
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <div>
              <h2>@observablehq/cars downloads</h2>
              <p className="chart-card__meta">
                {download
                  ? `${formatDate(download.xValue)}: ${download.yValue.toLocaleString()}`
                  : 'Move over a point to inspect it.'}
              </p>
            </div>
            <span className="chart-card__badge">npm download snapshot</span>
          </div>
          <Chart
            definition={interactiveDownloadsChart}
            height={330}
            initialWidth={760}
            ariaLabel="Daily @observablehq/cars downloads"
            onFocusChange={setDownload}
          />
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <div>
              <h2>Automobile horsepower</h2>
              <p className="chart-card__meta">
                {horsepower
                  ? `${horsepower.datum.x0?.toFixed(0)}–${horsepower.datum.x1?.toFixed(0)} hp: ${horsepower.datum.length} cars`
                  : 'D3 bins the 1983 ASA automobile rows.'}
              </p>
            </div>
            <span className="chart-card__badge">bin · rect</span>
          </div>
          <Chart
            definition={interactiveHorsepowerChart}
            height={320}
            initialWidth={760}
            ariaLabel="Automobile horsepower distribution"
            onFocusChange={setHorsepower}
          />
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <div>
              <h2>Downloads area</h2>
              <p className="chart-card__meta">
                {areaDownload
                  ? `${formatDate(areaDownload.xValue)}: ${areaDownload.yValue.toLocaleString()}`
                  : 'The same raw download rows feed an area and line.'}
              </p>
            </div>
            <span className="chart-card__badge">area · line</span>
          </div>
          <Chart
            definition={interactiveDownloadAreaChart}
            height={320}
            initialWidth={760}
            ariaLabel="Daily @observablehq/cars downloads area"
            onFocusChange={setAreaDownload}
          />
        </section>

        <section className="chart-card">
          <div className="chart-card__header">
            <div>
              <h2>Automobile ranking</h2>
              <p className="chart-card__meta">
                Ranked by{' '}
                {rankingMetric === 'power (hp)'
                  ? 'power (hp)'
                  : 'fuel economy (mpg)'}
                .
              </p>
            </div>
            <button
              className="chart-action"
              type="button"
              onClick={() => setRankingRound((round) => round + 1)}
            >
              Change metric
            </button>
          </div>
          <Chart
            definition={rankingDefinition}
            height={360}
            initialWidth={760}
            ariaLabel="Automobiles ranked by power or fuel economy"
            ariaDescription="A horizontal ranking that reorders the same automobile rows when its metric changes."
          />
        </section>
      </div>
    </main>
  )
}

function formatDate(value: string | number | Date) {
  return value instanceof Date
    ? value.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : String(value)
}

function formatIndustryGroup(points: readonly ChartPoint<IndustriesRow>[]) {
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

function formatPenguinPoint(point: ChartPoint<PenguinCount>) {
  return `${point.datum.species} · ${point.datum.sex.toLowerCase()}: ${point.datum.penguins} penguins`
}
