import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import {
  barY,
  colorLegend,
  defineChart,
  delta,
  ruleY,
  rollingWindow,
  type ChartPoint,
} from '@tanstack/charts'
import { waterfall } from '@tanstack/charts/transform/waterfall'
import { decorative } from '@tanstack/charts/mark/decorative'
import type { WaterfallKind } from '@tanstack/charts/transform/waterfall'
import { scaleBand, scaleLinear } from 'd3-scale'
import { driving } from '@tanstack/charts-data/driving'

const kinds = [
  'increase',
  'decrease',
  'total',
] satisfies readonly WaterfallKind[]
const colors = ['#10b981', '#ef4444', '#2563eb']
const signedAmount = new Intl.NumberFormat('en-US', {
  signDisplay: 'always',
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const observations = driving.filter((row) => row.year >= 2004)
const firstYear = observations[0]?.year
const lastYear = observations.at(-1)?.year
const totalLabel =
  firstYear === undefined || lastYear === undefined
    ? 'Total'
    : `${firstYear}–${String(lastYear).slice(-2)}`

export const yearlyChanges = rollingWindow(observations, {
  orderBy: 'year',
  size: 2,
  partial: false,
  outputs: {
    delta: { value: 'gas', reduce: delta },
  },
})

export const waterfallRows = waterfall(yearlyChanges, {
  value: 'delta',
  orderBy: 'year',
  total: true,
})

export const createExampleChart = () =>
  defineChart(
    ({ width }) => {
      return {
        marks: [
          barY(waterfallRows, {
            id: 'waterfall-bars',
            x: (datum) =>
              datum.kind === 'total' ? totalLabel : `${datum.year}`,
            y1: 'start',
            y2: 'end',
            color: 'kind',
            key: (datum) =>
              datum.kind === 'total' ? 'net-total' : `${datum.year}`,
            inset: 1,
          }),
          decorative(ruleY([0], { stroke: '#64748b', strokeOpacity: 0.6 })),
        ] as const,
        x: {
          scale: () => scaleBand<string>().padding(0.14),
          axis: { tickLabels: { rotate: width < 560 ? -32 : 0 } },
        },
        y: {
          scale: scaleLinear,
          grid: true,
          axis: { label: 'Change in gasoline price (USD per gallon)' },
        },
        color: {
          domain: kinds,
          range: colors,
          legend: colorLegend({ label: 'Change' }),
        },
      }
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        format: ({ datum }: ChartPoint<(typeof waterfallRows)[number]>) =>
          datum.kind === 'total'
            ? `${totalLabel} · ${signedAmount.format(datum.end)} net change`
            : `${datum.year} · ${signedAmount.format(
                datum.end - datum.start,
              )} · ${signedAmount.format(datum.end)} running change`,
      },
    },
  )

export const exampleAriaLabel = 'Annual changes in U.S. gasoline prices'

export const chart = createExampleChart()

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
