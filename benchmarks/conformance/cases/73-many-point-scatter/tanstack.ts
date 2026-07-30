import { defineChart, dot } from '@tanstack/charts'
import { scaleLinear, scaleOrdinal, scaleSqrt } from 'd3-scale'
import { flatManyPoints } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'
import type { ScatterStatus } from './data'

const statusDomain: readonly ScatterStatus[] = ['passed', 'failed']

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const points = flatManyPoints(input.revision)

    return {
      marks: [
        dot(points, {
          x: 'x',
          y: 'y',
          z: 'status',
          key: 'id',
          r: 'z',
          rScale: scaleSqrt().domain([0, 100]).range([2.25, 4.5]),
          fillOpacity: 0.72,
        }),
      ],
      x: {
        scale: scaleLinear().domain([0, 100]),
        ticks: 6,
        grid: true,
      },
      y: {
        scale: scaleLinear().domain([0, 100]),
        ticks: 6,
        grid: true,
      },
      color: {
        scale: scaleOrdinal<ScatterStatus, string>()
          .domain(statusDomain)
          .range(['#22c55e', '#ef4444']),
      },
      margin: { top: 20, right: 20, bottom: 50, left: 80 },
    }
  })

export const mount = tanstackMount(definition, 'Many-point scatter performance')
