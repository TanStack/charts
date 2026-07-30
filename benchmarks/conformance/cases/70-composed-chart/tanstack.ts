import { areaY, barY, d3Curve, defineChart, dot, lineY } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import { composedCategories, composedData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const monotone = d3Curve(curveMonotoneX)

const definition = (input: ConformanceInput) =>
  defineChart(({ width }) => {
    const rows = composedData(input.revision)
    const innerWidth = Math.max(0, width - 100)
    const categoryBandwidth = (innerWidth / composedCategories.length) * 0.9
    const barInset = Math.max(0, (categoryBandwidth - 20) / 2)

    return {
      marks: [
        areaY(rows, {
          x: 'name',
          y: 'amt',
          key: 'name',
          fill: '#8884d8',
          fillOpacity: 0.2,
          stroke: '#8884d8',
          curve: monotone,
        }),
        barY(rows, {
          x: 'name',
          y: 'pv',
          key: 'name',
          fill: '#413ea0',
          inset: barInset,
        }),
        lineY(rows, {
          x: 'name',
          y: 'uv',
          key: 'name',
          stroke: '#ff7300',
          strokeWidth: 2,
          curve: monotone,
        }),
        dot(rows, {
          x: 'name',
          y: 'cnt',
          key: 'name',
          fill: '#ef4444',
          r: 4.5,
        }),
      ],
      x: {
        scale: scaleBand<string>()
          .domain(composedCategories)
          .paddingInner(0.1)
          .paddingOuter(0.05),
      },
      y: {
        scale: scaleLinear().domain([0, 1_800]),
        ticks: 5,
        grid: true,
      },
      margin: { top: 20, right: 20, bottom: 50, left: 80 },
    }
  })

export const mount = tanstackMount(definition, 'Layered categorical measures')
