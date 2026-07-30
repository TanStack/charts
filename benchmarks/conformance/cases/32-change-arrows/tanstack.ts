import { arrow, defineChart } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { changeData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = changeData(input.revision)
    const gains = rows.filter((row) => row.direction === 'up')
    const losses = rows.filter((row) => row.direction === 'down')
    return {
      marks: [
        arrow(gains, {
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
          key: 'id',
          stroke: '#10b981',
          headLength: 8,
        }),
        arrow(losses, {
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
          key: 'id',
          stroke: '#ef4444',
          headLength: 8,
        }),
      ],
      x: {
        scale: scaleLinear().domain([0, 100]),
        grid: true,
        label: 'State X',
      },
      y: {
        scale: scaleLinear().domain([0, 100]),
        grid: true,
        label: 'State Y',
      },
    }
  })

export const mount = tanstackMount(definition, 'Directed quantitative changes')
