import { defineChart, dot, lineY } from '@tanstack/charts'
import { pairs } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'
import { autocorrelationData, autocorrelationDomain } from './data'
import type { AutocorrelationObservation } from './data'

interface LagPoint {
  id: string
  lag: number
  current: number
}

const identity: readonly LagPoint[] = [
  { id: 'start', lag: 20, current: 20 },
  { id: 'end', lag: 90, current: 90 },
]

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = lagPairs(autocorrelationData(input.revision))

    return {
      marks: [
        lineY(identity, {
          x: 'lag',
          y: 'current',
          key: 'id',
          stroke: '#94a3b8',
          strokeDasharray: '5,4',
        }),
        dot(rows, {
          x: 'lag',
          y: 'current',
          key: 'id',
          fill: '#7c3aed',
          fillOpacity: 0.78,
          r: 4,
        }),
      ],
      x: {
        scale: scaleLinear().domain(autocorrelationDomain),
        grid: true,
        label: 'Previous observation',
      },
      y: {
        scale: scaleLinear().domain(autocorrelationDomain),
        grid: true,
        label: 'Current observation',
      },
    }
  })

export const mount = tanstackMount(
  definition,
  'Lag-one autocorrelation scatterplot',
)

function lagPairs(
  rows: readonly AutocorrelationObservation[],
): readonly LagPoint[] {
  return pairs(rows, (previous, current) => ({
    id: `${previous.id}->${current.id}`,
    lag: previous.value,
    current: current.value,
  }))
}
