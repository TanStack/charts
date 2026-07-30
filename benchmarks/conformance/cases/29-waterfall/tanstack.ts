import { barY, colorLegend, defineChart, ruleY } from '@tanstack/charts'
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale'
import { waterfallData } from './data'
import type { WaterfallContribution } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface WaterfallPoint extends WaterfallContribution {
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
})

const definition = (input: ConformanceInput) =>
  defineChart(({ width }) => {
    const rows = buildWaterfall(waterfallData(input.revision))

    return {
      marks: [
        barY(rows, {
          x: 'label',
          y1: 'start',
          y2: 'end',
          color: 'kind',
          key: 'id',
          inset: 1,
        }),
        ruleY([0], { stroke: '#64748b', strokeOpacity: 0.6 }),
      ],
      x: {
        scale: scaleBand<string>()
          .domain(rows.map((row) => row.label))
          .padding(0.14),
        tickRotate: width < 560 ? -32 : 0,
      },
      y: {
        scale: scaleLinear().domain([0, 130]),
        grid: true,
        label: 'Amount',
      },
      color: {
        scale: scaleOrdinal<WaterfallPoint['kind'], string>()
          .domain(kinds)
          .range(colors),
        legend: colorLegend({ label: 'Contribution' }),
      },
    }
  })

function buildWaterfall(
  contributions: readonly WaterfallContribution[],
): readonly WaterfallPoint[] {
  let total = 0
  const rows = contributions.map((row): WaterfallPoint => {
    const start = total
    total += row.value
    return {
      ...row,
      start,
      end: total,
      kind: row.value >= 0 ? 'increase' : 'decrease',
    }
  })
  return [
    ...rows,
    {
      id: 'net',
      label: 'Net',
      value: total,
      start: 0,
      end: total,
      kind: 'total',
    },
  ]
}

export const mount = tanstackMount(definition, 'Contribution waterfall chart', {
  format: ({ datum }) =>
    datum.kind === 'total'
      ? `${datum.label} · ${datum.end.toLocaleString('en-US')} total`
      : `${datum.label} · ${signedAmount.format(
          datum.end - datum.start,
        )} · ${datum.end.toLocaleString('en-US')} running total`,
})
