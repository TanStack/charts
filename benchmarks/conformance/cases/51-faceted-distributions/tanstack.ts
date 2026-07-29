import { defineChart, facet, rect } from '@tanstack/charts'
import { bin } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { distributionGroups, facetedDistributionData } from './data'
import type { DistributionGroup, FacetedDistributionPoint } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface DistributionBin {
  id: string
  group: DistributionGroup
  x1: number
  x2: number
  proportion: number
}

const boundaries = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const createBins = bin<FacetedDistributionPoint, number>()
  .value((row) => row.value)
  .domain([0, 100])
  .thresholds(boundaries.slice(1, -1))
const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
})

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = facetedDistributionData(input.revision)
  const bins: readonly DistributionBin[] = distributionGroups.flatMap(
    (group) => {
      const groupRows = rows.filter((row) => row.group === group)
      return createBins(groupRows).flatMap((bucket, index) =>
        bucket.x0 === undefined || bucket.x1 === undefined
          ? []
          : [
              {
                id: `${group}:${index}`,
                group,
                x1: bucket.x0,
                x2: bucket.x1,
                proportion: bucket.length / groupRows.length,
              },
            ],
      )
    },
  )

  return {
    marks: [
      facet(bins, {
        by: 'group',
        columns: 1,
        gap: 8,
        label: (group) => String(group),
        chart: (facetBins) => ({
          marks: [
            rect(facetBins, {
              x1: 'x1',
              x2: 'x2',
              y1: () => 0,
              y2: 'proportion',
              key: 'id',
              fill: '#8b5cf6',
              inset: 0.75,
            }),
          ],
          x: {
            scale: scaleLinear().domain([0, 100]),
            grid: true,
            label: 'Observed value',
          },
          y: {
            scale: scaleLinear().domain([0, 0.25]),
            grid: true,
            ticks: 3,
            label: 'Proportion',
            format: (value) => percent.format(value),
          },
        }),
      }),
    ],
    guides: false,
    margin: 0,
    x: null,
    y: null,
  }
})

export const mount = tanstackMount(
  definition,
  'Faceted distribution comparison',
  {
    format: (point) =>
      `${point.datum.group} · Observed value: ${point.datum.x1}–${point.datum.x2} · Proportion: ${percent.format(point.datum.proportion)}`,
  },
)
