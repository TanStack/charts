import { defineChart, facet, rect } from '@tanstack/charts'
import { bin } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { distributionGroups, facetedDistributionData } from './data'
import type { DistributionGroup, FacetedDistributionPoint } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

export interface DistributionBin {
  id: string
  group: DistributionGroup
  x1: number
  x2: number
  count: number
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

export function prepareFacetedDistributionBins(
  rows: readonly FacetedDistributionPoint[],
): readonly DistributionBin[] {
  return distributionGroups.flatMap((group) => {
    const groupRows = rows.filter((row) => row.group === group)
    if (groupRows.length === 0) return []

    return createBins(groupRows).flatMap((bucket, index) =>
      bucket.x0 === undefined || bucket.x1 === undefined
        ? []
        : [
            {
              id: `${group}:${index}`,
              group,
              x1: bucket.x0,
              x2: bucket.x1,
              count: bucket.length,
              proportion: bucket.length / groupRows.length,
            },
          ],
    )
  })
}

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = facetedDistributionData(input.revision)
    const bins = prepareFacetedDistributionBins(rows)

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
