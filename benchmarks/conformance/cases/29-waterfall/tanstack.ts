import { barY, colorLegend, defineChart, ruleY } from '@tanstack/charts'
import { pairs } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import { driving } from '@charts-poc/demo-data/driving'
import type { DrivingRow } from '@charts-poc/demo-data/driving'
import { tanstackMount } from '../../shared/mount'

interface WaterfallPoint extends DrivingRow {
  label: string
  change: number
  start: number
  end: number
  kind: 'increase' | 'decrease' | 'total'
}

const kinds: readonly WaterfallPoint['kind'][] = [
  'increase',
  'decrease',
  'total',
]
const colors = ['#10b981', '#ef4444', '#2563eb']
const signedAmount = new Intl.NumberFormat('en-US', {
  signDisplay: 'always',
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const observations = driving.filter((row) => row.year >= 2004)

const definition = () =>
  defineChart(({ width }) => {
    const rows = buildWaterfall(observations)

    return {
      marks: [
        barY(rows, {
          x: 'label',
          y1: 'start',
          y2: 'end',
          color: 'kind',
          inset: 1,
        }),
        ruleY([0], { stroke: '#64748b', strokeOpacity: 0.6 }),
      ],
      x: {
        scale: () => scaleBand<string>().padding(0.14),
        tickRotate: width < 560 ? -32 : 0,
      },
      y: {
        scale: scaleLinear,
        grid: true,
        label: 'Change in gasoline price (USD per gallon)',
      },
      color: {
        domain: kinds,
        range: colors,
        legend: colorLegend({ label: 'Change' }),
      },
    }
  })

function buildWaterfall(
  rows: readonly DrivingRow[],
): readonly WaterfallPoint[] {
  let total = 0
  const changes = pairs(rows, (previous, current): WaterfallPoint => {
    const change = current.gas - previous.gas
    const start = total
    total += change
    return {
      ...current,
      label: `${current.year}`,
      change,
      start,
      end: total,
      kind: change >= 0 ? 'increase' : 'decrease',
    }
  })

  const first = rows[0]
  const last = rows.at(-1)
  if (!first || !last) return changes

  return [
    ...changes,
    {
      ...last,
      label: `${first.year}–${String(last.year).slice(-2)}`,
      change: total,
      start: 0,
      end: total,
      kind: 'total',
    },
  ]
}

export const mount = tanstackMount(
  definition,
  'Annual changes in U.S. gasoline prices',
  {
    format: ({ datum }) =>
      datum.kind === 'total'
        ? `${datum.label} · ${signedAmount.format(datum.end)} net change`
        : `${datum.label} · ${signedAmount.format(
            datum.end - datum.start,
          )} · ${signedAmount.format(datum.end)} running change`,
  },
)
