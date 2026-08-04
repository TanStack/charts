import * as React from 'react'
import { areaY, defineChart, dot, lineY, ruleY } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/react-charts/core'
import { scaleLinear, scaleUtc } from 'd3-scale'

const tickMs = 800
const streamOverscan = 12
const historySize = 150 + streamOverscan
const horizons = [
  { label: '30s', samples: 38 },
  { label: '1m', samples: 75 },
  { label: '2m', samples: 150 },
] as const

interface LiveSample {
  readonly id: number
  readonly at: Date
  readonly market: number
  readonly latency: number
  readonly requests: number
}

type LiveMetricKey = 'market' | 'latency' | 'requests'

interface LiveMetric {
  readonly key: LiveMetricKey
  readonly label: string
  readonly color: string
  readonly domain?: readonly [number, number]
  readonly reference?: number
  readonly referenceLabel?: string
  readonly format: (value: number) => string
}

const metrics: readonly LiveMetric[] = [
  {
    key: 'market',
    label: 'Market probability',
    color: '#8b5cf6',
    domain: [40, 65],
    reference: 50,
    referenceLabel: '50% baseline',
    format: (value) => `${value.toFixed(1)}%`,
  },
  {
    key: 'latency',
    label: 'API latency · dynamic y-range',
    color: '#f97316',
    reference: 180,
    referenceLabel: '180 ms threshold',
    format: (value) => `${Math.round(value)} ms`,
  },
  {
    key: 'requests',
    label: 'Request rate',
    color: '#10b981',
    domain: [700, 1_900],
    format: (value) => `${Math.round(value).toLocaleString()} req/s`,
  },
]

export function LiveCharts() {
  const [history, setHistory] = React.useState(createInitialHistory)
  const [frozenHistory, setFrozenHistory] = React.useState<
    readonly LiveSample[] | null
  >(null)
  const [horizon, setHorizon] = React.useState(75)

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setHistory((current) => {
        const previous = current.at(-1)
        if (!previous) return createInitialHistory()
        return [...current, createNextSample(previous)].slice(-historySize)
      })
    }, tickMs)
    return () => window.clearInterval(timer)
  }, [])

  const paused = frozenHistory !== null
  const visibleHistory = (frozenHistory ?? history).slice(
    -(horizon + streamOverscan),
  )

  return (
    <section className="chart-card chart-card--feature live-showcase">
      <div className="chart-card__header live-showcase__header">
        <div>
          <h2>Live signals</h2>
          <p className="chart-card__meta">Synthetic feed · 800 ms updates</p>
        </div>
        <button
          className="chart-action"
          type="button"
          onClick={() =>
            setFrozenHistory((current) => (current ? null : history))
          }
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="chart-controls" aria-label="Live chart time horizon">
        {horizons.map((option) => (
          <button
            className="chart-control"
            data-active={horizon === option.samples || undefined}
            type="button"
            key={option.samples}
            onClick={() => setHorizon(option.samples)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="live-metrics">
        {metrics.map((metric) => (
          <LiveMetricChart
            key={metric.key}
            metric={metric}
            rows={visibleHistory}
          />
        ))}
      </div>
    </section>
  )
}

function LiveMetricChart({
  metric,
  rows,
}: {
  metric: LiveMetric
  rows: readonly LiveSample[]
}) {
  const renderer = React.useMemo(
    () =>
      motion<LiveSample, Date, number>({
        initial: false,
        transition: {
          type: 'tween',
          duration: tickMs,
          easing: 'linear',
        },
      }),
    [],
  )
  const definition = React.useMemo(
    () => createLiveDefinition(rows, metric),
    [metric, rows],
  )
  const latest = rows.at(-1)
  const prior = rows.at(-2)
  const latestValue = latest?.[metric.key] ?? 0
  const delta = latestValue - (prior?.[metric.key] ?? latestValue)
  const trend = delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat'

  return (
    <article
      className="live-metric"
      style={{ '--live-color': metric.color } as React.CSSProperties}
    >
      <div className="live-metric__header">
        <h3>{metric.label}</h3>
        <div className="live-metric__reading">
          <strong>{metric.format(latestValue)}</strong>
          <span data-trend={trend} aria-label={`${trend} on the latest tick`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        </div>
      </div>
      <Chart
        definition={definition}
        renderer={renderer}
        height={230}
        initialWidth={360}
        ariaLabel={`${metric.label} over the selected live time horizon`}
        ariaDescription={
          metric.referenceLabel
            ? `Includes a ${metric.referenceLabel}.`
            : undefined
        }
      />
    </article>
  )
}

function createLiveDefinition(rows: readonly LiveSample[], metric: LiveMetric) {
  const latest = rows.at(-1)
  const first = rows[streamOverscan] ?? rows[0]
  const [floor, ceiling] = resolveMetricDomain(rows, metric)
  const endpoint = latest ? [latest] : []

  return defineChart({
    motion: {
      path: {
        update: 'rolling',
        x: 'shift',
        y: 'reproject',
        fallback: 'snap',
      },
      transition: {
        type: 'tween',
        duration: tickMs,
        easing: 'linear',
      },
    },
    tooltip: {
      use: tooltip,
      placement: ['top', 'right', 'left'],
      format: (point) =>
        `${formatTickTime(point.datum.at)} · ${metric.format(point.datum[metric.key])}`,
    },
    marks: [
      areaY(rows, {
        id: `${metric.key} area`,
        x: 'at',
        y1: 0,
        y2: metric.key,
        key: 'id',
        fill: metric.color,
        fillOpacity: 0.12,
      }),
      ...(metric.reference === undefined
        ? []
        : [
            ruleY([metric.reference], {
              id: `${metric.key} reference`,
              stroke: metric.color,
              strokeOpacity: 0.35,
              strokeDasharray: '4 5',
            }),
          ]),
      lineY(rows, {
        id: `${metric.key} line`,
        x: 'at',
        y: metric.key,
        key: 'id',
        stroke: metric.color,
        strokeWidth: 2.5,
      }),
      dot(endpoint, {
        id: `${metric.key} endpoint halo`,
        x: 'at',
        y: metric.key,
        key: () => 'latest',
        r: 7,
        fill: metric.color,
        fillOpacity: 0.18,
      }),
      dot(endpoint, {
        id: `${metric.key} endpoint`,
        x: 'at',
        y: metric.key,
        key: () => 'latest',
        r: 3.5,
        fill: metric.color,
        stroke: 'var(--ts-chart-background, #fff)',
        strokeWidth: 2,
      }),
    ],
    x: {
      scale:
        first && latest ? scaleUtc().domain([first.at, latest.at]) : scaleUtc,
      axis: {
        line: false,
        ticks: { count: 3, format: formatTickTime, size: 0, padding: 8 },
        tickLabels: { thin: { priority: 'ends', minGap: 20 } },
      },
    },
    y: {
      scale: scaleLinear().domain([floor, ceiling]),
      grid: true,
      axis: {
        line: false,
        ticks: {
          count: 4,
          format: (value) => compactNumber.format(value),
          size: 0,
          padding: 8,
        },
        tickLabels: { thin: { priority: 'ends', minGap: 14 } },
      },
    },
    margin: { top: 4, right: 8, bottom: 25, left: 38 },
    clip: true,
  })
}

function resolveMetricDomain(
  rows: readonly LiveSample[],
  metric: LiveMetric,
): readonly [number, number] {
  if (metric.domain) return metric.domain

  const visibleRows = rows.slice(streamOverscan)
  const values = visibleRows.map((row) => row[metric.key])
  if (metric.reference !== undefined) values.push(metric.reference)

  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return [0, 1]

  const padding = Math.max((maximum - minimum) * 0.12, 1)
  return [Math.floor(minimum - padding), Math.ceil(maximum + padding)]
}

function createInitialHistory(): readonly LiveSample[] {
  const now = Date.now()
  const rows: LiveSample[] = []

  for (let index = 0; index < historySize; index += 1) {
    const previous = rows.at(-1)
    const at = new Date(now - (historySize - index - 1) * tickMs)
    rows.push(
      previous
        ? createNextSample(previous, at, index)
        : {
            id: at.getTime(),
            at,
            market: 52,
            latency: 116,
            requests: 1_280,
          },
    )
  }

  return rows
}

function createNextSample(
  previous: LiveSample,
  at = new Date(previous.at.getTime() + tickMs),
  seed = previous.id / tickMs,
): LiveSample {
  const wave = Math.sin(seed * 0.71) + Math.sin(seed * 0.19) * 0.45
  const jitter = Math.random() - 0.5
  const latencySpike = Math.random() > 0.94 ? 42 + Math.random() * 55 : 0

  return {
    id: at.getTime(),
    at,
    market: clamp(
      previous.market +
        wave * 0.34 +
        jitter * 1.25 +
        (52 - previous.market) * 0.025,
      42,
      64,
    ),
    latency: clamp(
      previous.latency +
        jitter * 16 +
        (116 - previous.latency) * 0.16 +
        latencySpike,
      72,
      260,
    ),
    requests: clamp(
      previous.requests +
        wave * 34 +
        jitter * 110 +
        (1_280 - previous.requests) * 0.08,
      760,
      1_820,
    ),
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function formatTickTime(value: Date) {
  return value.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
