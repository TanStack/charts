import { useEffect, useMemo, useState } from 'react'
import {
  dashboardTableRows,
  filterDashboardData,
  formatDashboardDate,
  type DashboardDatum,
  type DashboardRange,
} from './data'
import { shadcnDashboardStyles } from './styles'
import type { ComponentType, ReactNode, SVGProps } from 'react'

export interface DashboardSize {
  width: number
  height: number
}

export interface DashboardChartProps {
  data: readonly DashboardDatum[]
  input: DashboardSize
}

export function dashboardChartWidth(width: number): number {
  if (width <= 480) return Math.max(1, width - 50)
  if (width < 768) return Math.max(1, width - 82)
  return Math.max(1, width - 354)
}

export function dashboardTickValues(
  data: readonly DashboardDatum[],
  width: number,
): readonly string[] {
  if (data.length < 2) return data.map((datum) => datum.date)

  const labels = data.map((datum) => formatDashboardDate(datum.date))
  const context =
    typeof document === 'undefined' ||
    typeof CanvasRenderingContext2D === 'undefined'
      ? null
      : document.createElement('canvas').getContext('2d')
  if (context) {
    context.font =
      '12px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  }
  const measure = (label: string) =>
    context?.measureText(label).width ?? label.length * 6.1
  const start = 5
  const axisLength = Math.max(1, width - 10)
  let end = start + axisLength
  const visible: string[] = []

  for (let index = data.length - 1; index >= 0; index -= 1) {
    const size = measure(labels[index]!)
    const coordinate = start + (axisLength * index) / (data.length - 1)
    const tickCoordinate =
      index === data.length - 1
        ? Math.min(coordinate, end - size / 2)
        : coordinate
    if (
      tickCoordinate - size / 2 >= start &&
      tickCoordinate + size / 2 <= end
    ) {
      visible.push(data[index]!.date)
      end = tickCoordinate - size / 2 - 32
    }
  }

  return visible.reverse()
}

interface DashboardProps {
  ChartRenderer: ComponentType<DashboardChartProps>
  input: DashboardSize
}

const ranges: readonly { value: DashboardRange; label: string }[] = [
  { value: '90d', label: 'Last 3 months' },
  { value: '30d', label: 'Last 30 days' },
  { value: '7d', label: 'Last 7 days' },
]

const statCards = [
  {
    label: 'Total Revenue',
    value: '$1,250.00',
    change: '+12.5%',
    trend: 'Trending up this month',
    detail: 'Visitors for the last 6 months',
    direction: 'up' as const,
  },
  {
    label: 'New Customers',
    value: '1,234',
    change: '-20%',
    trend: 'Down 20% this period',
    detail: 'Acquisition needs attention',
    direction: 'down' as const,
  },
  {
    label: 'Active Accounts',
    value: '45,678',
    change: '+12.5%',
    trend: 'Strong user retention',
    detail: 'Engagement exceed targets',
    direction: 'up' as const,
  },
  {
    label: 'Growth Rate',
    value: '4.5%',
    change: '+4.5%',
    trend: 'Steady performance increase',
    detail: 'Meets growth projections',
    direction: 'up' as const,
  },
]

const mainNavigation = [
  ['Dashboard', 'dashboard'],
  ['Lifecycle', 'list'],
  ['Analytics', 'analytics'],
  ['Projects', 'folder'],
  ['Team', 'users'],
] as const

const documentNavigation = [
  ['Data Library', 'database'],
  ['Reports', 'report'],
  ['Word Assistant', 'word'],
] as const

const secondaryNavigation = [
  ['Settings', 'settings'],
  ['Get Help', 'help'],
  ['Search', 'search'],
] as const

export function ShadcnDashboard({ ChartRenderer, input }: DashboardProps) {
  const [range, setRange] = useState<DashboardRange>(
    input.width < 768 ? '7d' : '90d',
  )
  const chartData = useMemo(() => filterDashboardData(range), [range])

  useEffect(() => {
    if (input.width < 768) setRange('7d')
  }, [input.width])

  return (
    <div
      className="shadcn-dashboard"
      data-conformance-view="main"
      data-range={range}
      role="region"
      aria-label="shadcn dashboard example"
      style={{ width: input.width, height: input.height }}
    >
      <style>{shadcnDashboardStyles}</style>
      <div className="sd-viewport">
        <DashboardSidebar />
        <main className="sd-main">
          <div className="sd-main-scroll">
            <DashboardHeader />
            <div className="sd-content">
              <section className="sd-cards" aria-label="Key metrics">
                {statCards.map((card) => (
                  <StatCard key={card.label} {...card} />
                ))}
              </section>
              <section className="sd-card sd-chart-card">
                <header className="sd-chart-header">
                  <h2 className="sd-chart-title">Total Visitors</h2>
                  <p className="sd-chart-description">
                    Total for the last 3 months
                  </p>
                  <div
                    className="sd-range-buttons"
                    role="group"
                    aria-label="Chart time range"
                  >
                    {ranges.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className="sd-range-button"
                        data-active={range === option.value}
                        data-range-value={option.value}
                        aria-pressed={range === option.value}
                        onClick={() => setRange(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <select
                    className="sd-range-select"
                    aria-label="Select a time range"
                    value={range}
                    onChange={(event) =>
                      setRange(event.currentTarget.value as DashboardRange)
                    }
                  >
                    {ranges.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </header>
                <div className="sd-chart-stage">
                  <ChartRenderer data={chartData} input={input} />
                </div>
              </section>
              <DashboardTable />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function DashboardSidebar() {
  return (
    <aside className="sd-sidebar" aria-label="Sidebar">
      <div className="sd-sidebar-inner">
        <div className="sd-brand">
          <Icon name="brand" className="sd-brand-mark" />
          <span className="sd-brand-name">Acme Inc.</span>
        </div>
        <nav className="sd-nav" aria-label="Dashboard">
          <div className="sd-nav-group">
            <div className="sd-nav-label">Home</div>
            {mainNavigation.map(([label, icon], index) => (
              <NavItem
                key={label}
                label={label}
                icon={icon}
                active={index === 0}
              />
            ))}
          </div>
          <div className="sd-nav-group">
            <div className="sd-nav-label">Documents</div>
            {documentNavigation.map(([label, icon]) => (
              <NavItem key={label} label={label} icon={icon} more />
            ))}
            <NavItem label="More" icon="more" />
          </div>
          <div className="sd-nav-group sd-nav-bottom">
            {secondaryNavigation.map(([label, icon]) => (
              <NavItem key={label} label={label} icon={icon} />
            ))}
          </div>
        </nav>
        <div className="sd-user">
          <span className="sd-avatar">CN</span>
          <span className="sd-user-copy">
            <strong>shadcn</strong>
            <span>m@example.com</span>
          </span>
          <Icon name="more-vertical" className="sd-nav-more" />
        </div>
      </div>
    </aside>
  )
}

function DashboardHeader() {
  return (
    <header className="sd-header">
      <button
        className="sd-icon-button sd-menu-button"
        type="button"
        aria-label="Toggle menu"
      >
        <Icon name="menu" />
      </button>
      <span className="sd-separator" aria-hidden="true" />
      <h1>Documents</h1>
      <button className="sd-quick-create" type="button">
        <Icon name="plus" />
        Quick Create
      </button>
    </header>
  )
}

function NavItem({
  label,
  icon,
  active = false,
  more = false,
}: {
  label: string
  icon: IconName
  active?: boolean
  more?: boolean
}) {
  return (
    <button
      className="sd-nav-item"
      type="button"
      data-active={active}
      aria-current={active ? 'page' : undefined}
    >
      <Icon name={icon} />
      <span>{label}</span>
      {more ? <Icon name="more" className="sd-nav-more" /> : null}
    </button>
  )
}

function StatCard({
  label,
  value,
  change,
  trend,
  detail,
  direction,
}: (typeof statCards)[number]) {
  return (
    <article className="sd-card sd-stat-card">
      <div className="sd-stat-head">
        <span className="sd-stat-label">{label}</span>
        <span className="sd-badge">
          <Icon name={direction === 'up' ? 'trend-up' : 'trend-down'} />
          {change}
        </span>
        <p className="sd-stat-value">{value}</p>
      </div>
      <div className="sd-stat-foot">
        <span className="sd-stat-trend">
          {trend}
          <Icon name={direction === 'up' ? 'trend-up' : 'trend-down'} />
        </span>
        <span className="sd-stat-detail">{detail}</span>
      </div>
    </article>
  )
}

function DashboardTable() {
  return (
    <section className="sd-table-section" aria-label="Document sections">
      <div className="sd-toolbar">
        <div className="sd-tabs" role="tablist" aria-label="Document view">
          <button
            className="sd-tab"
            type="button"
            role="tab"
            data-active="true"
          >
            Outline
          </button>
          <button className="sd-tab" type="button" role="tab">
            Past Performance <span className="sd-badge">3</span>
          </button>
          <button className="sd-tab" type="button" role="tab">
            Key Personnel <span className="sd-badge">2</span>
          </button>
          <button className="sd-tab" type="button" role="tab">
            Focus Documents
          </button>
        </div>
        <div className="sd-toolbar-actions">
          <button className="sd-button" type="button">
            <Icon name="columns" />
            <span>Customize Columns</span>
            <Icon name="chevron-down" />
          </button>
          <button className="sd-button" type="button">
            <Icon name="plus" />
            <span>Add Section</span>
          </button>
        </div>
      </div>
      <div className="sd-table-wrap">
        <div className="sd-table-scroll">
          <table className="sd-table">
            <thead>
              <tr>
                <th aria-label="Reorder" />
                <th>
                  <input
                    className="sd-checkbox"
                    type="checkbox"
                    aria-label="Select all"
                  />
                </th>
                <th>Header</th>
                <th>Section Type</th>
                <th>Status</th>
                <th>Target</th>
                <th>Limit</th>
                <th>Reviewer</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {dashboardTableRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="sd-grip" aria-hidden="true">
                      ⋮⋮
                    </span>
                  </td>
                  <td>
                    <input
                      className="sd-checkbox"
                      type="checkbox"
                      aria-label={`Select ${row.header}`}
                    />
                  </td>
                  <td>
                    <a className="sd-table-link" href="#">
                      {row.header}
                    </a>
                  </td>
                  <td>
                    <span className="sd-badge">{row.type}</span>
                  </td>
                  <td>
                    <span
                      className="sd-badge sd-status"
                      data-done={row.status === 'Done'}
                    >
                      <span className="sd-status-dot" />
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <input
                      className="sd-number-input"
                      aria-label={`${row.header} target`}
                      defaultValue={row.target}
                    />
                  </td>
                  <td>
                    <input
                      className="sd-number-input"
                      aria-label={`${row.header} limit`}
                      defaultValue={row.limit}
                    />
                  </td>
                  <td>{row.reviewer}</td>
                  <td>
                    <button
                      className="sd-icon-button"
                      type="button"
                      aria-label={`Open ${row.header} menu`}
                    >
                      <Icon name="more-vertical" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="sd-table-footer">
        <span>0 of 68 row(s) selected.</span>
        <span className="sd-pagination">
          <span>Rows per page</span>
          <button className="sd-button" type="button">
            10 <Icon name="chevron-down" />
          </button>
          <span>Page 1 of 7</span>
          <button
            className="sd-icon-button"
            type="button"
            aria-label="Previous page"
          >
            <Icon name="chevron-left" />
          </button>
          <button
            className="sd-icon-button"
            type="button"
            aria-label="Next page"
          >
            <Icon name="chevron-right" />
          </button>
        </span>
      </div>
    </section>
  )
}

type IconName =
  | 'analytics'
  | 'brand'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevrons'
  | 'columns'
  | 'dashboard'
  | 'database'
  | 'folder'
  | 'help'
  | 'list'
  | 'menu'
  | 'more'
  | 'more-vertical'
  | 'plus'
  | 'report'
  | 'search'
  | 'settings'
  | 'trend-down'
  | 'trend-up'
  | 'users'
  | 'word'

function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  )
}

const iconPaths: Record<IconName, ReactNode> = {
  brand: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M8 9h8v6H8z" />
    </>
  ),
  menu: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M9 5v14" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
    </>
  ),
  folder: <path d="M3 6h7l2 2h9v11H3z" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-4 2-6 6-6s6 2 6 6M16 5a3 3 0 010 6M17 14c2.7.3 4 2.3 4 5" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  report: (
    <>
      <path d="M5 3h14v18H5zM9 7h6M9 11h6M9 15h4" />
    </>
  ),
  word: (
    <>
      <path d="M5 3h10l4 4v14H5zM15 3v5h4" />
      <path d="M8 11l1.5 6 2.5-4 2.5 4 1.5-6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.5 1a7 7 0 00-1.7-1L14.3 3h-4.6l-.4 3a7 7 0 00-1.7 1L5 6 3 9.4 5.1 11a7 7 0 000 2L3 14.6 5 18l2.6-1a7 7 0 001.7 1l.4 3h4.6l.4-3a7 7 0 001.7-1l2.5 1 2-3.4-2-1.6a7 7 0 00.1-1z" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.7 2.7 0 115 1.5c-.8 1.2-2.5 1.4-2.5 3M12 17h.01" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  'more-vertical': (
    <>
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  chevrons: <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" />,
  'trend-up': <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  'trend-down': <path d="M3 7l6 6 4-4 8 8M15 17h6v-6" />,
  columns: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16M15 4v16" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  'chevron-down': <path d="M7 9l5 5 5-5" />,
  'chevron-left': <path d="M15 6l-6 6 6 6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
}
