import { useMemo, useRef } from 'react'
import { Chart } from '@tanstack/charts/react/core'
import { premiumKpisForRevision } from './model'
import type { CSSProperties } from 'react'
import type { PremiumKpiMetric } from './model'
import { areaY, d3Curve, defineChart, lineY } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'
import { curveMonotoneX } from 'd3-shape'
import type { PremiumKpiId } from './model'
const fullGap = 12

function KpiCard({
  metric,
  width,
  height,
  idPrefix,
  preview = false,
}: {
  readonly metric: PremiumKpiMetric
  readonly width: number
  readonly height: number
  readonly idPrefix?: string
  readonly preview?: boolean
}) {
  const definition = useMemo(() => premiumKpiDefinition(metric), [metric])
  const renderer = useMemo(() => createPremiumKpiRenderer(!preview), [preview])
  const compact = preview || width < 200 || height < 150
  const padding = compact ? 9 : 18
  const headerHeight = compact ? 44 : 72
  const chartWidth = Math.max(24, width - padding * 2)
  const chartHeight = Math.max(24, height - padding * 2 - headerHeight)

  return (
    <article
      data-premium-kpi={metric.id}
      data-conformance-view={metric.id}
      data-compact={compact || undefined}
      className="premium-kpi-card"
      style={
        {
          '--premium-kpi-card-width': `${width}px`,
          '--premium-kpi-card-height': `${height}px`,
        } as CSSProperties
      }
    >
      <header className="premium-kpi-header">
        <span className="premium-kpi-label">{metric.label}</span>
        <span
          className="premium-kpi-trend"
          aria-label={`${metric.trendDirection === 'up' ? 'Up' : 'Down'} ${metric.trend}`}
        >
          <span aria-hidden="true">
            {metric.trendDirection === 'up' ? '↑' : '↓'}
          </span>{' '}
          {metric.trend}
        </span>
        <strong className="premium-kpi-value">{metric.value}</strong>
      </header>
      <div className="premium-kpi-chart">
        <Chart
          idPrefix={idPrefix ? `${idPrefix}-${metric.id}` : undefined}
          definition={definition}
          renderer={renderer}
          width={chartWidth}
          height={chartHeight}
          ariaLabel={`${metric.label} trend, ending at ${metric.value}`}
        />
      </div>
    </article>
  )
}

function fullLayout(width: number, height: number) {
  const padding = 14
  const availableWidth = Math.max(1, width - padding * 2)
  const availableHeight = Math.max(1, height - padding * 2)
  const horizontal = width >= 680 || width / height >= 1.2

  return horizontal
    ? {
        columns: 'repeat(3, minmax(0, 1fr))',
        rows: 'minmax(0, 1fr)',
        cardWidth: Math.max(1, (availableWidth - fullGap * 2) / 3),
        cardHeight: availableHeight,
      }
    : {
        columns: 'minmax(0, 1fr)',
        rows: 'repeat(3, minmax(0, 1fr))',
        cardWidth: availableWidth,
        cardHeight: Math.max(1, (availableHeight - fullGap * 2) / 3),
      }
}

const premiumKpiStyles = `
.premium-kpi-shell {
  --premium-kpi-canvas: light-dark(#f5f6f8, #09090b);
  --premium-kpi-card: light-dark(rgba(255, 255, 255, 0.92), rgba(24, 24, 27, 0.9));
  --premium-kpi-foreground: light-dark(#18181b, #fafafa);
  --premium-kpi-muted: light-dark(#71717a, #a1a1aa);
  --premium-kpi-border: light-dark(rgba(24, 24, 27, 0.09), rgba(250, 250, 250, 0.1));
  --premium-kpi-shadow: light-dark(rgba(24, 24, 27, 0.07), rgba(0, 0, 0, 0.34));
  color-scheme: inherit;
  box-sizing: border-box;
  display: grid;
  place-items: stretch;
  padding: 14px;
  overflow: hidden;
  color: var(--premium-kpi-foreground);
  background: var(--premium-kpi-canvas);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.premium-kpi-grid {
  display: grid;
  min-width: 0;
  min-height: 0;
}

.premium-kpi-card {
  --premium-kpi-accent: #6d5dfc;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: var(--premium-kpi-card-width);
  height: var(--premium-kpi-card-height);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 18px;
  border: 1px solid var(--premium-kpi-border);
  border-radius: 18px;
  background: var(--premium-kpi-card);
  box-shadow: 0 14px 42px var(--premium-kpi-shadow);
}

.premium-kpi-card[data-premium-kpi="customers"] {
  --premium-kpi-accent: #0f91c7;
}

.premium-kpi-card[data-premium-kpi="churn"] {
  --premium-kpi-accent: #0c9b6c;
}

.premium-kpi-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  column-gap: 8px;
  flex: 0 0 72px;
}

.premium-kpi-label {
  overflow: hidden;
  color: var(--premium-kpi-muted);
  font-size: 12px;
  font-weight: 620;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.premium-kpi-value {
  grid-column: 1 / -1;
  margin-top: 7px;
  font-size: clamp(24px, 3.1vw, 36px);
  font-weight: 730;
  letter-spacing: -0.055em;
  line-height: 1;
}

.premium-kpi-trend {
  color: var(--premium-kpi-accent);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.premium-kpi-chart {
  display: grid;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  align-items: end;
}

.premium-kpi-preview {
  display: flex;
  gap: 5px;
  padding: 0;
  background: transparent;
}

.premium-kpi-card[data-compact] {
  padding: 9px;
  border-radius: 11px;
  box-shadow: 0 6px 18px var(--premium-kpi-shadow);
}

.premium-kpi-card[data-compact] .premium-kpi-header {
  flex-basis: 44px;
  column-gap: 4px;
}

.premium-kpi-card[data-compact] .premium-kpi-label {
  font-size: 7px;
}

.premium-kpi-card[data-compact] .premium-kpi-value {
  margin-top: 3px;
  font-size: 15px;
}

.premium-kpi-card[data-compact] .premium-kpi-trend {
  font-size: 7px;
}

.premium-kpi-preview-stack {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

`

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

const monotone = d3Curve(curveMonotoneX)

const accentFallbacks = {
  revenue: '#6d5dfc',
  customers: '#0f91c7',
  churn: '#0c9b6c',
} satisfies Record<PremiumKpiId, string>

export const premiumKpiSpring = {
  type: 'spring' as const,
  stiffness: 180,
  damping: 24,
  mass: 0.8,
}

export function premiumKpiDefinition(metric: PremiumKpiMetric) {
  const values = metric.rows.map((row) => row.value)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const padding = Math.max((maximum - minimum) * 0.16, 0.1)
  const baseline = minimum - padding
  const accent = `var(--premium-kpi-accent, ${accentFallbacks[metric.id]})`
  const line = lineY(metric.rows, {
    id: `${metric.id}-line`,
    x: 'period',
    y: 'value',
    key: 'id',
    stroke: accent,
    strokeWidth: 2.4,
    curve: monotone,
  })
  const marks =
    metric.surface === 'area'
      ? [
          areaY(metric.rows, {
            id: `${metric.id}-area`,
            x: 'period',
            y: 'value',
            y1: baseline,
            key: 'id',
            fill: `url(#${metric.id}-fill)`,
            fillOpacity: 1,
            curve: monotone,
          }),
          line,
        ]
      : [line]

  return defineChart(
    {
      guides: false,
      marks,
      gradients:
        metric.surface === 'area'
          ? [
              {
                id: `${metric.id}-fill`,
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 1,
                stops: [
                  {
                    offset: 0,
                    color: accent,
                    opacity: 0.26,
                  },
                  {
                    offset: 1,
                    color: accent,
                    opacity: 0,
                  },
                ],
              },
            ]
          : [],
      x: {
        scale: scalePoint<number>()
          .domain(metric.rows.map((row) => row.period))
          .padding(0.08),
        axis: false,
      },
      y: {
        scale: scaleLinear().domain([baseline, maximum + padding]),
        axis: false,
      },
      margin: { top: 4, right: 3, bottom: 3, left: 3 },
      clip: true,
      motion: { transition: premiumKpiSpring },
    },
    {
      focus: false,
      pointer: false,
      keyboard: false,
      tooltip: false,
      svgAnimation: false,
    },
  )
}

export function createPremiumKpiRenderer(initial = true) {
  return motion({
    initial,
    respectReducedMotion: true,
    transition: premiumKpiSpring,
  })
}

export default function PremiumKpiSparklines({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '122-premium-kpi-sparklines'
  const rootRef = useRef<HTMLElement>(null)

  const metrics = premiumKpisForRevision(input.revision)

  const layout = fullLayout(input.width, input.height)

  return (
    <section
      ref={rootRef}
      data-conformance-view="main"
      data-premium-kpi-shell=""
      aria-label="Business metrics"
      className="premium-kpi-shell"
      style={{ width: input.width, height: input.height }}
    >
      <style>{premiumKpiStyles}</style>
      <div
        className="premium-kpi-grid"
        style={{
          gridTemplateColumns: layout.columns,
          gridTemplateRows: layout.rows,
          gap: fullGap,
        }}
      >
        {metrics.map((metric) => (
          <KpiCard
            key={metric.id}
            metric={metric}
            width={layout.cardWidth}
            height={layout.cardHeight}
            idPrefix={idPrefix}
          />
        ))}
      </div>
    </section>
  )
}
