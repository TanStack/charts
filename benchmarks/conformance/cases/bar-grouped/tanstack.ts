import { barY, colorLegend, defineChart } from '@tanstack/charts'
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale'
import type { CategoryPoint } from '../../shared/data'
import { categoryData, categoryValueDomain } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const seriesDomain: CategoryPoint['series'][] = ['Desktop', 'Mobile', 'Tablet']
const seriesColors = ['#2563eb', '#f97316', '#10b981']

const definition = (input: ConformanceInput) =>
  defineChart(({ width }) => {
    const rows = categoryData(input.revision)
    const categoryDomain = [...new Set(rows.map((row) => row.category))]

    return {
      marks: [
        barY(rows, {
          x: 'category',
          y: 'value',
          z: 'series',
          key: 'id',
          groupScale: scaleBand<CategoryPoint['series']>()
            .domain(seriesDomain)
            .paddingInner(0.08),
          inset: 1,
        }),
      ],
      x: {
        scale: scaleBand<string>()
          .domain(categoryDomain)
          .paddingInner(0.14)
          .paddingOuter(0.06),
        tickRotate: width < 640 ? -32 : 0,
      },
      y: {
        scale: scaleLinear().domain(categoryValueDomain),
        label: 'Value',
        ticks: 5,
        grid: true,
      },
      color: {
        scale: scaleOrdinal<CategoryPoint['series'], string>()
          .domain(seriesDomain)
          .range(seriesColors),
        legend: colorLegend({
          label: 'Device',
        }),
      },
    }
  })

export const mount = tanstackMount(definition, 'Grouped bars')
