import { olympians } from '@charts-poc/demo-data/olympians'
import { defineChart, rect } from '@tanstack/charts'
import { bin, thresholdScott } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { OlympiansRow } from '@charts-poc/demo-data/olympians'
import type { ConformanceInput } from '../../types'

interface CumulativeBin {
  id: string
  x0: number
  x1: number
  count: number
}

type OlympianWithWeight = OlympiansRow & { weight: number }

const completeOlympians = olympians.filter(
  (row): row is OlympianWithWeight => row.weight !== null,
)
const createBins = bin<OlympianWithWeight, number>()
  .value((row) => row.weight)
  .thresholds(thresholdScott)

const definition = (input: ConformanceInput) => {
  let cumulative = 0
  const bins: CumulativeBin[] = createBins(
    completeOlympians.slice(input.revision * 8),
  ).flatMap((bucket, index) => {
    cumulative += bucket.length
    return bucket.x0 === undefined || bucket.x1 === undefined
      ? []
      : [
          {
            id: `bin:${index}`,
            x0: bucket.x0,
            x1: bucket.x1,
            count: cumulative,
          },
        ]
  })

  return defineChart({
    marks: [
      rect(bins, {
        x1: 'x0',
        x2: 'x1',
        y1: () => 0,
        y2: 'count',
        fill: '#2563eb',
        inset: 1,
      }),
    ],
    x: {
      scale: scaleLinear,
      grid: true,
      label: 'Weight (kg)',
    },
    y: {
      scale: scaleLinear,
      grid: true,
      label: 'Cumulative count',
    },
  })
}

export const mount = tanstackMount(definition, 'Cumulative histogram')
