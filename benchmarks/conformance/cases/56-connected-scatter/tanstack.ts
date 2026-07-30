import { arrow, d3Curve, defineChart, dot, lineY, text } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { curveCatmullRom } from 'd3-shape'
import { connectedData, directionSegments } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = connectedData(input.revision)
    const arrows = directionSegments(rows)
    const labels = rows.filter((row) => row.year % 4 === 0 || row.year === 2014)

    return {
      marks: [
        lineY(rows, {
          x: 'activity',
          y: 'cost',
          key: 'id',
          stroke: '#64748b',
          strokeWidth: 2.25,
          curve: d3Curve(curveCatmullRom.alpha(0.5)),
        }),
        dot(rows, {
          x: 'activity',
          y: 'cost',
          key: 'id',
          fill: '#0f766e',
          r: 3.25,
        }),
        arrow(arrows, {
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
          key: 'id',
          stroke: '#0f766e',
          strokeWidth: 1.5,
          headLength: 7,
        }),
        text(labels, {
          x: 'activity',
          y: 'cost',
          text: (row) => `${row.year}`,
          key: 'id',
          fill: '#0f172a',
          dy: -9,
        }),
      ],
      x: {
        scale: scaleLinear().domain([48, 86]),
        grid: true,
        label: 'Activity index',
      },
      y: {
        scale: scaleLinear().domain([25, 92]),
        grid: true,
        label: 'Cost index',
      },
    }
  })

export const mount = tanstackMount(
  definition,
  'Directed connected scatterplot over time',
)
