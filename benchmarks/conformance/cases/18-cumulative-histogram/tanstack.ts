import { olympians } from '@charts-poc/demo-data/olympians'
import { binX, cumulative, defineChart, rect } from '@tanstack/charts'
import { thresholdScott } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { OlympiansRow } from '@charts-poc/demo-data/olympians'
import type { ConformanceInput } from '../../types'

type OlympianWithWeight = OlympiansRow & { weight: number }

const completeOlympians = olympians.filter(
  (row): row is OlympianWithWeight => row.weight !== null,
)
const definition = (input: ConformanceInput) => {
  const bins = binX(completeOlympians.slice(input.revision * 8), {
    value: 'weight',
    thresholds: thresholdScott,
    outputs: { count: { reduce: 'count' } },
  })
  const cumulativeBins = cumulative(bins, {
    orderBy: 'x1',
    outputs: { cumulativeCount: { value: 'count', reduce: 'sum' } },
  })

  return defineChart({
    marks: [
      rect(cumulativeBins, {
        x1: 'x1',
        x2: 'x2',
        y1: () => 0,
        y2: 'cumulativeCount',
        fill: '#2563eb',
        inset: 1,
      }),
    ],
    x: { scale: scaleLinear, grid: true, axis: { label: 'Weight (kg)' } },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Cumulative count' } },
  })
}

export const mount = tanstackMount(definition, 'Cumulative histogram')
