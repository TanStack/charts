import * as React from 'react'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import { defineChart, type ChartPoint } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/react-charts'
import {
  createDashboardData,
  industryColors,
  industryNames,
  responseColors,
  surveyResponses,
  type DashboardData,
  type IndustryStackPoint,
  type TimeRange,
} from './transforms'
import type { PenguinsRow } from '@charts-poc/demo-data/penguins'
import {
  createAgreementChart,
  createCarEconomyChart,
  createIndustryChart,
  createPenguinChart,
  createRatingsHeatmap,
  createSparklineChart,
  createSurveyStackChart,
  createSurveyWaffleChart,
  penguinKey,
} from './plots'

const ranges: readonly TimeRange[] = ['1y', '3y', 'all']
const metricColors = ['#ff625a', '#8579ff', '#45d49c', '#f2c66d']

export function App() {
  const [range, setRange] = React.useState<TimeRange>('3y')
  const [selectedPenguin, setSelectedPenguin] = React.useState<string | null>(
    null,
  )
  const [focusedPenguin, setFocusedPenguin] =
    React.useState<PenguinsRow | null>(null)
  const data = React.useMemo(() => createDashboardData(range), [range])
  const definitions = React.useMemo(
    () => ({
      agreement: defineChart(
        createAgreementChart({ value: data.agreementPercent }),
        {
          keyboard: false,
          animate: { duration: 800, easing: 'ease-out' },
        },
      ),
      industries: defineChart(
        createIndustryChart({
          rows: data.industries,
          compactTime: range === '1y',
        }),
        {
          focus: 'group-x',
          tooltip: {
            use: tooltip,
            className: 'obsidian-tooltip',
            sticky: true,
            formatGroup: formatIndustryGroup,
          },
          animate: { duration: 720, easing: 'ease-out' },
        },
      ),
      ratings: defineChart(createRatingsHeatmap({ rows: data.simpsons }), {
        tooltip: {
          use: tooltip,
          className: 'obsidian-tooltip',
          format: (point) =>
            `S${point.datum.season} E${point.datum.number_in_season} · ${point.datum.title}\nIMDb ${point.datum.imdb_rating?.toFixed(1)}`,
        },
        animate: { duration: 520, easing: 'ease-out' },
      }),
      cars: defineChart(createCarEconomyChart({ rows: data.carEconomy }), {
        tooltip: {
          use: tooltip,
          className: 'obsidian-tooltip',
          format: (point) =>
            `${point.datum.cylinders} cylinders\n${point.datum.economy.toFixed(1)} mpg mean`,
        },
        animate: { duration: 680, easing: 'ease-out' },
      }),
      surveyStack: defineChart(
        createSurveyStackChart({ rows: data.surveyStack }),
        {
          tooltip: {
            use: tooltip,
            className: 'obsidian-tooltip',
            format: (point) =>
              `${point.datum.Question} · ${point.datum.Response}\n${point.datum.count} responses`,
          },
          animate: { duration: 720, easing: 'ease-out' },
        },
      ),
      surveyWaffle: defineChart(
        createSurveyWaffleChart({ rows: data.surveyCells }),
        {
          tooltip: {
            use: tooltip,
            className: 'obsidian-tooltip',
            format: (point) =>
              `${point.datum.Question} · ${point.datum.Response}`,
          },
          animate: { duration: 560, easing: 'ease-out' },
        },
      ),
      sparks: {
        aapl: defineChart(
          createSparklineChart({
            rows: data.aapl,
            date: (row) => row.Date,
            value: (row) => row.Close,
            color: metricColors[0]!,
          }),
          {
            keyboard: false,
            animate: { duration: 650, easing: 'ease-out' },
          },
        ),
        travelers: defineChart(
          createSparklineChart({
            rows: data.travelers,
            date: (row) => row.date,
            value: (row) => row.current,
            color: metricColors[1]!,
          }),
          {
            keyboard: false,
            animate: { duration: 650, easing: 'ease-out' },
          },
        ),
        temperature: defineChart(
          createSparklineChart({
            rows: data.sfTemperatures,
            date: (row) => row.date,
            value: (row) => row.high,
            color: metricColors[2]!,
          }),
          {
            keyboard: false,
            animate: { duration: 650, easing: 'ease-out' },
          },
        ),
        wind: defineChart(
          createSparklineChart({
            rows: data.weather,
            date: (row) => row.date,
            value: (row) => row.wind,
            color: metricColors[3]!,
          }),
          {
            keyboard: false,
            animate: { duration: 650, easing: 'ease-out' },
          },
        ),
      },
    }),
    [data, range],
  )
  const penguinDefinition = React.useMemo(
    () =>
      defineChart(
        createPenguinChart({
          rows: data.penguins,
          selectedKey: selectedPenguin,
        }),
        {
          tooltip: {
            use: tooltip,
            className: 'obsidian-tooltip',
            sticky: true,
            format: (point) =>
              `${point.datum.species} · ${point.datum.island}\n${point.datum.culmen_length_mm} × ${point.datum.culmen_depth_mm} mm · ${point.datum.body_mass_g} g`,
          },
          animate: { duration: 620, easing: 'ease-out' },
        },
      ),
    [data.penguins, selectedPenguin],
  )

  const latestApple = data.aapl.at(-1)
  const previousApple = data.aapl.at(-2)
  const latestTravelers = data.travelers.at(-1)
  const latestTemperature = data.sfTemperatures.at(-1)
  const previousTemperature = data.sfTemperatures.at(-2)
  const latestWeather = data.weather.at(-1)
  const previousWeather = data.weather.at(-2)
  const metrics = [
    {
      label: 'AAPL close',
      value: latestApple ? `$${latestApple.Close.toFixed(2)}` : '—',
      delta: percentChange(latestApple?.Close, previousApple?.Close),
      definition: definitions.sparks.aapl,
      ariaLabel: 'Apple daily closing price',
    },
    {
      label: 'TSA travelers',
      value: compact(latestTravelers?.current ?? 0),
      delta: percentChange(
        latestTravelers?.current,
        latestTravelers?.previous,
        'year over year',
      ),
      definition: definitions.sparks.travelers,
      ariaLabel: 'TSA traveler throughput',
    },
    {
      label: 'SF high',
      value: latestTemperature ? `${latestTemperature.high.toFixed(1)}°` : '—',
      delta: numericChange(
        latestTemperature?.high,
        previousTemperature?.high,
        '°',
      ),
      definition: definitions.sparks.temperature,
      ariaLabel: 'San Francisco daily high temperature',
    },
    {
      label: 'Seattle wind',
      value: latestWeather ? `${latestWeather.wind.toFixed(1)} mph` : '—',
      delta: numericChange(latestWeather?.wind, previousWeather?.wind, ' mph'),
      definition: definitions.sparks.wind,
      ariaLabel: 'Seattle daily wind speed',
    },
  ] as const

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <BrandMark />
          </div>
          <div>
            <p className="breadcrumb">Observable datasets / pinned snapshots</p>
            <h1>Data overview</h1>
          </div>
          <div className="topbar-actions">
            <span className="environment">
              <span />9 source datasets
            </span>
          </div>
        </header>

        <div className="dashboard">
          <div className="dashboard-toolbar">
            <div className="range-tabs" aria-label="Time range">
              {ranges.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={range === item ? 'active' : undefined}
                  onClick={() => setRange(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="toolbar-meta">
              <span className="environment">
                <span />
                latest {range === 'all' ? 'available history' : range}
              </span>
            </div>
          </div>

          <section className="metric-grid" aria-label="Source metrics">
            {metrics.map((metric) => (
              <article className="metric-card" key={metric.label}>
                <div className="metric-copy">
                  <p>{metric.label}</p>
                  <strong>{metric.value}</strong>
                  <span className={metric.delta.direction}>
                    {metric.delta.text}
                  </span>
                </div>
                <div className="sparkline">
                  <Chart
                    definition={metric.definition}
                    height={64}
                    initialWidth={150}
                    ariaLabel={metric.ariaLabel}
                    renderSvg={renderChartSvgWithResources}
                  />
                </div>
              </article>
            ))}
          </section>

          <section className="primary-grid">
            <article className="card volume-card">
              <CardHeader
                eyebrow="Industry unemployment"
                value={`${data.latestUnemployment.toLocaleString()}k`}
              >
                <div className="legend">
                  {industryNames.map((industry) => (
                    <span key={industry}>
                      <i style={{ background: industryColors[industry] }} />
                      {industry}
                    </span>
                  ))}
                </div>
              </CardHeader>
              <div className="chart-wrap hero-chart">
                <Chart
                  definition={definitions.industries}
                  height={318}
                  initialWidth={820}
                  ariaLabel="U.S. unemployment by industry"
                  ariaDescription="Bureau of Labor Statistics unemployment counts for manufacturing, construction, and finance."
                  renderSvg={renderChartSvgWithResources}
                />
              </div>
            </article>

            <article className="card budget-card">
              <CardHeader
                eyebrow="Survey Q1 agreement"
                value={`${Math.round(data.agreementPercent)}%`}
              >
                <span className="subtle-label">Eitan Lees</span>
              </CardHeader>
              <div className="budget-chart">
                <Chart
                  definition={definitions.agreement}
                  height={232}
                  initialWidth={320}
                  ariaLabel={`${Math.round(data.agreementPercent)} percent agree or strongly agree with survey question one`}
                />
              </div>
              <div className="budget-stats">
                <div>
                  <span>agree</span>
                  <strong>{responseCount(data, 'Agree')}</strong>
                </div>
                <div>
                  <span>strongly</span>
                  <strong>{responseCount(data, 'Strongly Agree')}</strong>
                </div>
                <div>
                  <span>neutral</span>
                  <strong>{responseCount(data, 'Neutral')}</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="secondary-grid">
            <article className="card heat-card">
              <CardHeader eyebrow="Simpsons IMDb ratings" value="25 seasons">
                <span className="subtle-label">IMDb</span>
              </CardHeader>
              <div className="chart-wrap">
                <Chart
                  definition={definitions.ratings}
                  height={228}
                  initialWidth={480}
                  ariaLabel="The Simpsons episode IMDb ratings by season"
                />
              </div>
            </article>

            <article className="card impact-card">
              <CardHeader
                eyebrow="Palmer penguin bills"
                value={
                  focusedPenguin?.species ?? `${data.penguins.length} birds`
                }
              >
                <div className="quadrant-key">
                  <span>length →</span>
                  <span>depth ↑</span>
                </div>
              </CardHeader>
              <div className="chart-wrap">
                <Chart
                  definition={penguinDefinition}
                  height={228}
                  initialWidth={410}
                  ariaLabel="Penguin bill length and depth by species and body mass"
                  onFocusChange={(point: ChartPoint<PenguinsRow> | null) =>
                    setFocusedPenguin(point?.datum ?? null)
                  }
                  onSelect={(point: ChartPoint<PenguinsRow> | null) =>
                    setSelectedPenguin((current) =>
                      current ===
                      (point?.datum ? penguinKey(point.datum) : null)
                        ? null
                        : point?.datum
                          ? penguinKey(point.datum)
                          : null,
                    )
                  }
                />
              </div>
            </article>

            <article className="card services-card">
              <CardHeader eyebrow="Fuel economy" value="3 cylinder groups">
                <span className="subtle-label">ASA 1983</span>
              </CardHeader>
              <div className="chart-wrap">
                <Chart
                  definition={definitions.cars}
                  height={228}
                  initialWidth={350}
                  ariaLabel="Mean car fuel economy by cylinder count"
                />
              </div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="card severity-card">
              <CardHeader eyebrow="Survey responses" value="5 questions">
                <div className="legend compact">
                  {surveyResponses.map((response) => (
                    <span key={response}>
                      <i style={{ background: responseColors[response] }} />
                      {response}
                    </span>
                  ))}
                </div>
              </CardHeader>
              <div className="chart-wrap">
                <Chart
                  definition={definitions.surveyStack}
                  height={248}
                  initialWidth={720}
                  ariaLabel="Likert response distribution for five survey questions"
                />
              </div>
            </article>

            <article className="card triage-card">
              <CardHeader
                eyebrow="Survey question 1"
                value={`${Math.round(data.agreementPercent)}% agree`}
              >
                <span className="subtle-label">
                  {data.surveyCells.length} responses
                </span>
              </CardHeader>
              <div className="triage-chart">
                <Chart
                  definition={definitions.surveyWaffle}
                  height={138}
                  initialWidth={500}
                  ariaLabel={`${data.surveyCells.length} responses to survey question one`}
                />
              </div>
              <div className="triage-legend">
                {data.surveyResponseCounts.map((row) => (
                  <div key={row.Response}>
                    <i
                      style={{
                        background:
                          responseColors[
                            row.Response as keyof typeof responseColors
                          ],
                      }}
                    />
                    <span>{row.Response}</span>
                    <strong>{row.count}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </div>
      </main>
    </div>
  )
}

function CardHeader({
  eyebrow,
  value,
  suffix,
  children,
}: {
  eyebrow: string
  value: string
  suffix?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="card-header">
      <div>
        <p>{eyebrow}</p>
        <div className="card-value">
          <strong>{value}</strong>
          {suffix}
        </div>
      </div>
      {children}
    </header>
  )
}

function Sidebar() {
  const navigation = [
    ['overview', 'Overview'],
    ['pulse', 'Time series'],
    ['users', 'Distributions'],
    ['releases', 'Survey'],
  ] as const
  return (
    <aside className="sidebar">
      <a className="brand" href="#" aria-label="Data overview">
        <BrandMark />
      </a>
      <nav aria-label="Primary">
        {navigation.map(([icon, label], index) => (
          <a
            href="#"
            key={label}
            className={index === 0 ? 'active' : undefined}
            aria-label={label}
          >
            <Icon name={icon} />
          </a>
        ))}
      </nav>
      <nav className="sidebar-bottom" aria-label="Secondary">
        <a href="#" aria-label="Documentation">
          <Icon name="help" />
        </a>
        <a href="#" aria-label="Settings">
          <Icon name="settings" />
        </a>
      </nav>
    </aside>
  )
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 8.5 15.8 3 26 8.5v5.2L15.8 8.2 6 13.7V8.5Z" />
      <path d="m6 17.8 9.8-5.4L26 17.8V23l-10.2-5.5L6 23v-5.2Z" />
      <path d="m6 27.1 9.8-5.4L26 27.1 15.8 32 6 27.1Z" />
    </svg>
  )
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    pulse: <path d="M2 13h4l2.5-7 4 13 3-9 2 3H22" />,
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3.5 20c.5-4 2.4-6 5.5-6s5 2 5.5 6M14 15c3.8-.5 5.8 1.2 6.5 4.5" />
      </>
    ),
    releases: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M8 3v4M16 3v4M4 9h16M8 13h3M8 16h6" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    bell: (
      <>
        <path d="M6 17h12l-1.5-2v-5a4.5 4.5 0 0 0-9 0v5L6 17Z" />
        <path d="M10 20h4" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 8V3l-2 2a8 8 0 1 0 1.4 10" />
        <path d="M20 3h-5" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.7 9a2.6 2.6 0 1 1 3.8 2.3c-1 .5-1.5 1.2-1.5 2.2M12 17.5v.2" />
      </>
    ),
    trendUp: <path d="m3 16 6-6 4 4 7-8M15 6h5v5" />,
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function formatIndustryGroup(
  points: readonly ChartPoint<IndustryStackPoint>[],
): string {
  const stackPoints = points.filter((point) => point.markId === 'industry-area')
  const first = stackPoints[0]
  if (!first) return ''
  const total = stackPoints.reduce(
    (sum, point) => sum + point.datum.unemployed,
    0,
  )
  return [
    first.datum.date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }),
    `Total  ${total.toLocaleString()} thousand`,
    ...stackPoints.map(
      (point) =>
        `${point.datum.industry.padEnd(14)} ${point.datum.unemployed.toLocaleString()}`,
    ),
  ].join('\n')
}

function percentChange(
  current: number | undefined,
  previous: number | undefined,
  label = 'previous observation',
): { readonly text: string; readonly direction: 'up' | 'down' } {
  if (current === undefined || previous === undefined || previous === 0) {
    return { text: 'No comparison', direction: 'down' }
  }
  const change = ((current - previous) / previous) * 100
  return {
    text: `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(1)}% ${label}`,
    direction: change >= 0 ? 'up' : 'down',
  }
}

function numericChange(
  current: number | undefined,
  previous: number | undefined,
  suffix: string,
): { readonly text: string; readonly direction: 'up' | 'down' } {
  if (current === undefined || previous === undefined) {
    return { text: 'No comparison', direction: 'down' }
  }
  const change = current - previous
  return {
    text: `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(1)}${suffix} previous`,
    direction: change >= 0 ? 'up' : 'down',
  }
}

function responseCount(data: DashboardData, response: string): number {
  return (
    data.surveyResponseCounts.find((row) => row.Response === response)?.count ??
    0
  )
}

function compact(value: number): string {
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`
  return value.toLocaleString()
}
