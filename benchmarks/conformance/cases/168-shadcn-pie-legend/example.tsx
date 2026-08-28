import {
  colorLegend,
  colorLegendItems,
  defineChart,
  type ChartPoint,
} from '@tanstack/charts'
import { focusGroupAngle, pie, polar, radialArc } from '@tanstack/charts/polar'
import { RendererChart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { motion } from '@tanstack/charts/motion'
import { shadcnBrowsers, shadcnColors } from '@tanstack/charts-data/shadcn'
import './styles.css'
const browserNames = shadcnBrowsers.map((row) => row.browser)
const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

export function createExampleChart() {
  const arcs = pie(shadcnBrowsers, {
    value: 'visitors',
    startAngle: Math.PI / 2,
    endAngle: (-Math.PI * 3) / 2,
  })
  const separator = 1
  const marks = [
    radialArc(arcs, {
      id: 'browser-slices',
      key: 'browser',
      innerRadius: undefined,
      color: 'browser',
      stroke: 'var(--background)',
      strokeWidth: separator,
    }),
  ]
  return defineChart(
    {
      marks: [
        polar({
          radiusRatio: 0.78,
          scales: {
            angle: null,
            radius: null,
          },

          marks,
        }),
      ],
      scales: {
        x: null,
        y: null,
      },
      color: {
        domain: browserNames,
        range: shadcnColors,
        legend: colorLegend<string>({
          placement: 'bottom',
          items: colorLegendItems({
            justify: 'center',
            gap: 12,
            rowGap: 8,
            indicator: {
              shape: 'square',
              width: 12,
              height: 12,
              gap: 6,
            },
            label: {
              format: titleCase,
              fontSize: 12,
              fill: (_browser, { color }) => color,
            },
          }),
        }),
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
function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
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
  const contentWidth = Math.max(1, width - 50)
  const chartWidth = Math.min(250, contentWidth)
  const chartHeight = chartWidth
  return (
    <div className="sc-example" style={{ width, height }}>
      <article className="sc-card sc-default" style={{ width }}>
        <header className="sc-card-header">
          <div className="sc-card-heading">
            <h2>Pie Chart - Legend</h2>
            <p>January - June 2024</p>
          </div>
        </header>
        <div className="sc-card-content sc-centered">
          <div
            className="sc-chart"
            style={{ width: chartWidth, height: chartHeight }}
          >
            <RendererChart
              definition={definition}
              renderer={renderer}
              initialWidth={chartWidth}
              height={chartHeight}
              ariaLabel="Pie Chart - Legend"
            />
          </div>
          <ul aria-label="Browser legend" style={visuallyHidden}>
            {browserNames.map((browser) => (
              <li key={browser}>{titleCase(browser)}</li>
            ))}
          </ul>
        </div>
      </article>
    </div>
  )
}
