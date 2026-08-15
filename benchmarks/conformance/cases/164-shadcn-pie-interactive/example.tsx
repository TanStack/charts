import { useMemo, useState } from 'react'
import { defineChart, type ChartPoint } from '@tanstack/charts'
import {
  focusGroupAngle,
  pie,
  polar,
  radialArc,
  radialText,
} from '@tanstack/charts/polar'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { scaleLinear } from 'd3-scale'
import {
  shadcnColors,
  type ShadcnBrowserDatum,
} from '@tanstack/charts-data/shadcn'
import './styles.css'
const interactivePieRows: readonly ShadcnBrowserDatum[] = [
  { browser: 'january', visitors: 186 },
  { browser: 'february', visitors: 305 },
  { browser: 'march', visitors: 237 },
  { browser: 'april', visitors: 173 },
  { browser: 'may', visitors: 209 },
]
export function createExampleChart(activeMonth = 'january') {
  const arcs = pie(interactivePieRows, {
    value: 'visitors',
    startAngle: Math.PI / 2,
    endAngle: (-Math.PI * 3) / 2,
  })
  const activeIndex = Math.max(
    0,
    interactivePieRows.findIndex((row) => row.browser === activeMonth),
  )
  const activeRow = interactivePieRows[activeIndex]!
  const active = arcs.filter((row) => row.browser === activeRow.browser)
  const activeColor = shadcnColors[activeIndex]!
  return defineChart(
    {
      marks: [
        polar({
          radiusRatio: 0.78,
          angle: { scale: scaleLinear().domain([0, Math.PI * 2]) },
          radius: { scale: scaleLinear().domain([0, 1]) },
          marks: [
            radialArc(arcs, {
              id: 'month-slices',
              key: 'browser',
              innerRadius: 60,
              color: 'browser',
              stroke: 'var(--background)',
              strokeWidth: 1,
            }),
            radialArc(active, {
              id: 'active-month',
              key: 'browser',
              innerRadius: 60,
              outerRadius: ({ radius }) => radius + 10,
              fill: activeColor,
              stroke: 'var(--background)',
              strokeWidth: 5,
            }),
            radialArc(active, {
              id: 'active-month-ring',
              key: 'browser',
              innerRadius: ({ radius }) => radius + 12,
              outerRadius: ({ radius }) => radius + 25,
              fill: activeColor,
              stroke: 'var(--background)',
              strokeWidth: 3,
            }),
            radialText(
              [
                {
                  id: 'total',
                  angle: 0,
                  radius: 0,
                  text: String(activeRow.visitors),
                },
              ],
              {
                id: 'active-total',
                angle: 'angle',
                radius: 'radius',
                key: 'id',
                text: 'text',
                dy: -5,
                fill: 'var(--foreground)',
                fontSize: 30,
                fontWeight: 700,
              },
            ),
            radialText(
              [{ id: 'label', angle: 0, radius: 0, text: 'Visitors' }],
              {
                id: 'active-label',
                angle: 'angle',
                radius: 'radius',
                key: 'id',
                text: 'text',
                dy: 20,
                fill: 'var(--muted-foreground)',
                fontSize: 12,
              },
            ),
          ],
        }),
      ],
      color: {
        domain: interactivePieRows.map((row) => row.browser),
        range: shadcnColors,
      },
      margin: 0,
    },
    {
      svgAnimation: false,
      focus: focusGroupAngle,
      tooltip: {
        use: tooltip,
        className: 'sc-chart-tooltip',
        anchor: 'group-center',
        placement: 'auto',
        sort: 'color-domain',
        content: (points) => shadcnTooltipContent(points),
      },
    },
  )
}
function shadcnTooltipContent<TDatum>(points: readonly ChartPoint<TDatum>[]) {
  const point = points.find((candidate) => browserMetric(candidate.datum))
  const metric = point && browserMetric(point.datum)
  return metric
    ? {
        title: titleCase(metric.browser),
        rows: [
          {
            label: 'Visitors',
            value: metric.visitors.toLocaleString('en-US'),
            color: point.color,
          },
        ],
      }
    : { rows: [] }
}
function browserMetric(datum: unknown) {
  if (!datum || typeof datum !== 'object') return undefined
  const browser = Reflect.get(datum, 'browser')
  const visitors = Reflect.get(datum, 'visitors')
  return typeof browser === 'string' &&
    typeof visitors === 'number' &&
    Number.isFinite(visitors)
    ? { browser, visitors }
    : undefined
}
function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
export const definition = createExampleChart()
const renderer = motion({
  initial: 'always',
  transition: { type: 'spring', stiffness: 170, damping: 18, mass: 1 },
})
export interface ExampleProps {
  width?: number
  height?: number
}
export default function Example({ width = 640, height = 600 }: ExampleProps) {
  const [activeMonth, setActiveMonth] = useState('january')
  const chartDefinition = useMemo(
    () => createExampleChart(activeMonth),
    [activeMonth],
  )
  const contentWidth = Math.max(1, width - 50)
  const chartWidth = Math.min(300, contentWidth)
  const chartHeight = chartWidth
  return (
    <div className="sc-example" style={{ width, height }}>
      <article className="sc-card sc-interactive-pie" style={{ width }}>
        <header className="sc-card-header">
          <div className="sc-card-heading">
            <h2>Pie Chart - Interactive</h2>
            <p>January - June 2024</p>
          </div>
          <div className="sc-card-action">
            <SelectControl
              value={activeMonth}
              onChange={setActiveMonth}
              options={interactivePieRows.map((row, index) => ({
                value: row.browser,
                label: titleCase(row.browser),
                swatch: shadcnColors[index],
              }))}
            />
          </div>
        </header>
        <div className="sc-card-content sc-centered">
          <div
            className="sc-chart"
            style={{ width: chartWidth, height: chartHeight }}
          >
            <RendererChart
              definition={chartDefinition}
              renderer={renderer}
              initialWidth={chartWidth}
              height={chartHeight}
              ariaLabel="Pie Chart - Interactive"
            />
          </div>
        </div>
      </article>
    </div>
  )
}
function SelectControl({
  value,
  options,
  onChange,
}: {
  value: string
  options: readonly {
    value: string
    label: string
    swatch?: string
  }[]
  onChange: (value: string) => void
}) {
  const selected = options.find((option) => option.value === value)
  return (
    <label className="sc-select-display">
      {selected?.swatch ? (
        <span
          className="sc-select-swatch"
          style={{ background: selected.swatch }}
        />
      ) : null}
      <select
        aria-label="Select a value"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="m6 9 6 6 6-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </label>
  )
}
