import { areaY, d3Curve, defineChart, lineY, ruleY } from '@tanstack/charts'
import { scaleLinear, scaleOrdinal } from 'd3-scale'
import { curveBasis } from 'd3-shape'
import { ridgeColors, ridgeData, ridgeRegions } from './data'
import { tanstackMount } from '../../shared/mount'
import type { RidgeRegion } from './data'
import type { ConformanceInput } from '../../types'

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = ridgeData(input.revision)
    const curve = d3Curve(curveBasis)

    return {
      marks: [
        ruleY([0, 1, 2], {
          stroke: '#94a3b8',
          strokeOpacity: 0.5,
        }),
        areaY(rows, {
          x: 'x',
          y1: 'baseline',
          y2: 'density',
          z: 'region',
          key: 'id',
          fillOpacity: 0.52,
          curve,
        }),
        lineY(rows, {
          x: 'x',
          y: 'density',
          z: 'region',
          key: 'id',
          strokeWidth: 1.5,
          curve,
        }),
      ],
      x: {
        scale: scaleLinear().domain([0, 100]),
        label: 'Value',
        grid: true,
      },
      y: {
        scale: scaleLinear().domain([-0.08, 2.86]),
        ticks: ridgeRegions.length,
        format: (value) => ridgeRegions[Math.round(value)] ?? '',
      },
      color: {
        scale: scaleOrdinal<RidgeRegion, string>()
          .domain(ridgeRegions)
          .range(ridgeRegions.map((region) => ridgeColors[region])),
      },
    }
  })

export const mount = tanstackMount(definition, 'Ridgeline density comparison')
