import { Chart } from '@tanstack/charts/react/tooltip'
import { industries } from '@tanstack/charts-data/industries'
import { colorLegend, defineChart, dot, lineY } from '@tanstack/charts'
import { focusGuideX } from '@tanstack/charts/focus/guide'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { axisPointerColors } from './colors'
import { axisPointerDateKey } from './model'
import { axisPointerData, axisPointerIndustries } from './selection'
import type { ChartTooltipOptions } from '@tanstack/charts'
import type { AxisPointerDatum } from './selection'

export const exampleAriaLabel = 'Snapped axis pointer with grouped tooltip'

const month = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})

const monthYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const axisPointerTooltip: ChartTooltipOptions<AxisPointerDatum> = {
  className: 'conformance-tooltip-grouped',
  sticky: false,
  anchor: { x: 'value', y: 'plot-top' },
  placement: ['bottom-right', 'bottom-left', 'right', 'left'],
  offset: 10,
  sort: 'color-domain',
  items: [
    {
      channel: 'x',
      label: '',
      text: (point) => monthYear.format(point.datum.date),
    },
    {
      channel: 'y',
      text: (point) => point.datum.unemployed.toLocaleString('en-US'),
    },
    { channel: 'group', label: 'Industry' },
  ],
}

export function createExampleChart(input: ExampleChartInput) {
  const rows = axisPointerData(industries, input.revision)

  return defineChart(
    {
      marks: [
        lineY(rows, {
          id: 'industry-lines',
          x: 'date',
          y: 'unemployed',
          z: 'industry',
          color: 'industry',
          key: axisPointerKey,
          strokeWidth: 2,
        }),
        dot(rows, {
          id: 'industry-points',
          x: 'date',
          y: 'unemployed',
          z: 'industry',
          color: 'industry',
          key: axisPointerKey,
          r: 3,
          stroke: '#ffffff',
          strokeWidth: 1,
        }),
        focusGuideX(rows, {
          id: 'axis-pointer-guide',
          x: 'date',
          y: 'unemployed',
          z: 'industry',
          key: axisPointerKey,
          xRule: {
            stroke: '#64748b',
            strokeWidth: 1,
            strokeDasharray: '4 4',
          },
        }),
      ],
      x: {
        scale: scaleUtc,
        axis: { ticks: { format: (value) => month.format(value) } },
      },
      y: {
        scale: scaleLinear,
        grid: input.preview !== true,
        axis: {
          ticks: { count: 5 },
          ...(input.preview === true
            ? {}
            : { label: 'Unemployed (thousands)' }),
        },
      },
      color: {
        domain: axisPointerIndustries,
        range: axisPointerIndustries.map(
          (industry) => axisPointerColors[industry],
        ),
        legend: colorLegend({ itemWidth: 100 }),
      },
      focus: 'group-x',
      focusRing: false,
      maxFocusDistance: Number.POSITIVE_INFINITY,
      svgAnimation: false,
      margin:
        input.preview === true
          ? { top: 4, right: 4, bottom: 22, left: 38 }
          : { top: 38, right: 24, bottom: 45, left: 60 },
    },
    {
      keyboard: true,
      tooltip: {
        use: tooltip,
        ...axisPointerTooltip,
      },
    },
  )
}

function axisPointerKey(row: AxisPointerDatum) {
  return `${row.industry}:${axisPointerDateKey(row.date)}`
}

export interface ExampleChartInput {
  width: number
  height: number
  revision: number
  preview?: boolean
  interactive?: boolean
}

export const chart = createExampleChart({
  width: 640,
  height: 480,
  revision: 0,
  preview: false,
})

export default function Example() {
  return (
    <Chart
      definition={chart}
      height={480}
      ariaLabel={exampleAriaLabel}
      ariaDescription="Move across the chart or use the arrow keys to compare all three industries at the nearest month."
    />
  )
}
