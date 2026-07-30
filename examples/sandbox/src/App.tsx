import * as React from 'react'
import { focusX } from '@tanstack/charts/focus'
import { renderChartSvgWithResources } from '@tanstack/charts/svg/resources'
import type { ChartPoint } from '@tanstack/charts'
import { Chart } from '@tanstack/react-charts'
import {
  createDashboardData,
  severityColors,
  severities,
  type ErrorStackPoint,
  type ImpactPoint,
  type TimeRange,
} from './data'
import {
  createBudgetChart,
  createErrorVolumeChart,
  createHeatmapChart,
  createImpactChart,
  createServicesChart,
  createSeverityStackChart,
  createSparklineChart,
  createTriageChart,
} from './plots'

const ranges: readonly TimeRange[] = ['24h', '7d', '30d']
const metricColors = ['#ff625a', '#8579ff', '#45d49c', '#f2c66d']

export function App() {
  const [range, setRange] = React.useState<TimeRange>('24h')
  const [revision, setRevision] = React.useState(0)
  const [live, setLive] = React.useState(true)
  const [selectedIssue, setSelectedIssue] = React.useState<string | null>(null)
  const [focusedIssue, setFocusedIssue] = React.useState<ImpactPoint | null>(
    null,
  )
  const data = React.useMemo(
    () => createDashboardData(range, revision),
    [range, revision],
  )
  const definitions = React.useMemo(
    () => ({
      budget: createBudgetChart({ value: data.budget }),
      errorVolume: createErrorVolumeChart({
        stack: data.errorStack,
        totals: data.errorTotals,
        releases: data.releases,
        compactTime: range === '24h',
      }),
      heatmap: createHeatmapChart({ rows: data.heatmap }),
      services: createServicesChart({ rows: data.services }),
      severityStack: createSeverityStackChart({ rows: data.severityStack }),
      sparks: data.sparks.map((rows, index) =>
        createSparklineChart({
          rows,
          color: metricColors[index] ?? '#ff625a',
        }),
      ),
      triage: createTriageChart({ rows: data.triage }),
    }),
    [data, range],
  )
  const impactDefinition = React.useMemo(
    () =>
      createImpactChart({
        rows: data.impact,
        selectedId: selectedIssue,
      }),
    [data.impact, selectedIssue],
  )

  React.useEffect(() => {
    if (!live) return
    const interval = window.setInterval(
      () => setRevision((current) => current + 1),
      4_500,
    )
    return () => window.clearInterval(interval)
  }, [live])

  const metrics = [
    {
      label: 'Unhandled',
      value: compact(data.totalErrors),
      delta: '+12.4%',
      direction: 'up',
    },
    {
      label: 'Users',
      value: compact(data.impactedUsers),
      delta: '−8.1%',
      direction: 'down',
    },
    {
      label: 'Crash free',
      value: `${data.crashFree.toFixed(2)}%`,
      delta: '+0.06%',
      direction: 'down',
    },
    {
      label: 'p95',
      value: `${data.p95}ms`,
      delta: '+22ms',
      direction: 'up',
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
            <p className="breadcrumb">acme / storefront</p>
            <h1>Overview</h1>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className={`live-button ${live ? 'is-live' : ''}`}
              onClick={() => setLive((current) => !current)}
            >
              <span className="live-dot" />
              {live ? 'Live' : 'Paused'}
            </button>
            <button type="button" className="icon-button" aria-label="Search">
              <Icon name="search" />
            </button>
            <button
              type="button"
              className="icon-button notification"
              aria-label="Notifications"
            >
              <Icon name="bell" />
            </button>
            <div className="avatar" aria-label="Tanner Linsley">
              TL
            </div>
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
                  onClick={() => {
                    setRange(item)
                    setRevision((current) => current + 1)
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="toolbar-meta">
              <span className="environment">
                <span />
                production
              </span>
              <button
                type="button"
                className="refresh-button"
                onClick={() => setRevision((current) => current + 1)}
                aria-label="Refresh dashboard"
              >
                <Icon name="refresh" />
              </button>
            </div>
          </div>

          <section className="metric-grid" aria-label="Key metrics">
            {metrics.map((metric, index) => (
              <article className="metric-card" key={metric.label}>
                <div className="metric-copy">
                  <p>{metric.label}</p>
                  <strong>{metric.value}</strong>
                  <span className={metric.direction}>{metric.delta}</span>
                </div>
                <div className="sparkline">
                  <Chart
                    definition={definitions.sparks[index]!}
                    height={64}
                    initialWidth={150}
                    ariaLabel={`${metric.label} trend`}
                    keyboard={false}
                    animate={{ duration: 650, easing: 'ease-out' }}
                    renderSvg={renderChartSvgWithResources}
                  />
                </div>
              </article>
            ))}
          </section>

          <section className="primary-grid">
            <article className="card volume-card">
              <CardHeader
                eyebrow="Errors"
                value={compact(data.totalErrors)}
                suffix={
                  <span className="trend-badge hot">
                    <Icon name="trendUp" /> 12.4%
                  </span>
                }
              >
                <div className="legend">
                  {severities.map((severity) => (
                    <span key={severity}>
                      <i style={{ background: severityColors[severity] }} />
                      {severity}
                    </span>
                  ))}
                </div>
              </CardHeader>
              <div className="chart-wrap hero-chart">
                <Chart
                  definition={definitions.errorVolume}
                  height={318}
                  initialWidth={820}
                  ariaLabel="Error volume by severity"
                  ariaDescription="Stacked error events with release markers and alert threshold."
                  focus={focusX}
                  tooltip={{
                    className: 'obsidian-tooltip',
                    sticky: true,
                    formatGroup: formatErrorGroup,
                  }}
                  animate={{ duration: 720, easing: 'ease-out' }}
                  renderSvg={renderChartSvgWithResources}
                />
              </div>
            </article>

            <article className="card budget-card">
              <CardHeader eyebrow="Error budget" value="04d 18h">
                <span className="status-pill">on track</span>
              </CardHeader>
              <div className="budget-chart">
                <Chart
                  definition={definitions.budget}
                  height={232}
                  initialWidth={320}
                  ariaLabel={`${Math.round(data.budget)} percent error budget remaining`}
                  keyboard={false}
                  animate={{ duration: 800, easing: 'ease-out' }}
                />
              </div>
              <div className="budget-stats">
                <div>
                  <span>burn</span>
                  <strong>0.72×</strong>
                </div>
                <div>
                  <span>reset</span>
                  <strong>Aug 01</strong>
                </div>
                <div>
                  <span>slo</span>
                  <strong>99.9%</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="secondary-grid">
            <article className="card heat-card">
              <CardHeader eyebrow="Activity" value="7 × 24">
                <span className="subtle-label">UTC</span>
              </CardHeader>
              <div className="chart-wrap">
                <Chart
                  definition={definitions.heatmap}
                  height={228}
                  initialWidth={480}
                  ariaLabel="Error activity by weekday and hour"
                  tooltip={{
                    className: 'obsidian-tooltip',
                    format: (point) =>
                      `${point.datum.day} ${point.datum.hour}:00\n${point.datum.value} events`,
                  }}
                  animate={{ duration: 520, easing: 'ease-out' }}
                />
              </div>
            </article>

            <article className="card impact-card">
              <CardHeader
                eyebrow="Impact map"
                value={focusedIssue?.issue ?? '14 issues'}
              >
                <div className="quadrant-key">
                  <span>events →</span>
                  <span>users ↑</span>
                </div>
              </CardHeader>
              <div className="chart-wrap">
                <Chart
                  definition={impactDefinition}
                  height={228}
                  initialWidth={410}
                  ariaLabel="Issue event volume and affected users"
                  tooltip={{
                    className: 'obsidian-tooltip',
                    sticky: true,
                    format: (point) =>
                      `${point.datum.issue}\n${point.datum.events} events · ${point.datum.users} users`,
                  }}
                  onFocusChange={(point: ChartPoint<ImpactPoint> | null) =>
                    setFocusedIssue(point?.datum ?? null)
                  }
                  onSelect={(point: ChartPoint<ImpactPoint> | null) =>
                    setSelectedIssue((current) =>
                      current === point?.datum.id
                        ? null
                        : (point?.datum.id ?? null),
                    )
                  }
                  animate={{ duration: 620, easing: 'ease-out' }}
                />
              </div>
            </article>

            <article className="card services-card">
              <CardHeader eyebrow="Services" value="5">
                <span className="subtle-label">load / target</span>
              </CardHeader>
              <div className="chart-wrap">
                <Chart
                  definition={definitions.services}
                  height={228}
                  initialWidth={350}
                  ariaLabel="Service error load compared with target"
                  tooltip={{
                    className: 'obsidian-tooltip',
                    format: (point) =>
                      `${point.datum.service}\n${point.datum.value} load · ${point.datum.target} target`,
                  }}
                  animate={{ duration: 680, easing: 'ease-out' }}
                />
              </div>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="card severity-card">
              <CardHeader eyebrow="Service mix" value="severity">
                <div className="legend compact">
                  {severities.map((severity) => (
                    <span key={severity}>
                      <i style={{ background: severityColors[severity] }} />
                      {severity}
                    </span>
                  ))}
                </div>
              </CardHeader>
              <div className="chart-wrap">
                <Chart
                  definition={definitions.severityStack}
                  height={248}
                  initialWidth={720}
                  ariaLabel="Severity mix by service"
                  tooltip={{
                    className: 'obsidian-tooltip',
                    format: (point) =>
                      `${point.datum.service} · ${point.datum.severity}\n${point.datum.value} issues`,
                  }}
                  animate={{ duration: 720, easing: 'ease-out' }}
                />
              </div>
            </article>

            <article className="card triage-card">
              <CardHeader eyebrow="Triage" value="71%">
                <span className="status-pill green">resolved</span>
              </CardHeader>
              <div className="triage-chart">
                <Chart
                  definition={definitions.triage}
                  height={138}
                  initialWidth={500}
                  ariaLabel="Triage outcome unit chart"
                  tooltip={{
                    className: 'obsidian-tooltip',
                    format: (point) => point.datum.status,
                  }}
                  animate={{ duration: 560, easing: 'ease-out' }}
                />
              </div>
              <div className="triage-legend">
                <div>
                  <i className="green" />
                  <span>Resolved</span>
                  <strong>71</strong>
                </div>
                <div>
                  <i className="purple" />
                  <span>Muted</span>
                  <strong>13</strong>
                </div>
                <div>
                  <i className="red" />
                  <span>Open</span>
                  <strong>16</strong>
                </div>
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
    ['pulse', 'Issues'],
    ['users', 'Users'],
    ['releases', 'Releases'],
  ] as const
  return (
    <aside className="sidebar">
      <a className="brand" href="#" aria-label="Trace home">
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

function formatErrorGroup(
  points: readonly ChartPoint<ErrorStackPoint>[],
): string {
  const stackPoints = points.filter((point) => point.markId === 'severity-area')
  const first = stackPoints[0]
  if (!first) return ''
  const total = stackPoints.reduce((sum, point) => sum + point.datum.value, 0)
  return [
    first.datum.date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
    }),
    `Total  ${total.toLocaleString()}`,
    ...stackPoints.map(
      (point) =>
        `${point.datum.severity.padEnd(8)} ${point.datum.value.toLocaleString()}`,
    ),
  ].join('\n')
}

function compact(value: number): string {
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`
  return value.toLocaleString()
}
