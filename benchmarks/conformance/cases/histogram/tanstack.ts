import { defineChart, rect } from '@tanstack/charts'
import { bin } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { distributionData } from '../../shared/data'
import type { DistributionPoint } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface HistogramBin {
  id: string
  x0: number
  x1: number
  count: number
}

const boundaries = [20, 30, 40, 50, 60, 70, 80, 90]
const createBins = bin<DistributionPoint, number>()
  .value((row) => row.value)
  .domain([boundaries[0] ?? 20, boundaries.at(-1) ?? 90])
  .thresholds(boundaries.slice(1, -1))

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = distributionData(input.revision)
  const bins: readonly HistogramBin[] = createBins(rows).flatMap(
    (bucket, index) =>
      bucket.x0 === undefined || bucket.x1 === undefined
        ? []
        : [
            {
              id: `bin:${index}`,
              x0: bucket.x0,
              x1: bucket.x1,
              count: bucket.length,
            },
          ],
  )

  return {
    marks: [
      rect(bins, {
        x1: 'x0',
        x2: 'x1',
        y1: () => 0,
        y2: 'count',
        key: 'id',
        fill: '#2563eb',
        inset: 1,
      }),
    ],
    x: {
      scale: scaleLinear().domain([20, 90]),
      grid: true,
      label: 'Value',
    },
    y: {
      scale: scaleLinear().domain([0, 80]),
      grid: true,
      label: 'Count',
    },
  }
})

export const mount = tanstackMount(definition, 'Histogram of values', {
  format: ({ datum }) =>
    `${datum.x0.toLocaleString('en-US')}–${datum.x1.toLocaleString(
      'en-US',
    )} · ${datum.count.toLocaleString('en-US')} observations`,
})
