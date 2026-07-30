import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { timeDomain } from '../../shared/data'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { tanstackMount } from '../../shared/mount'
import { gapData, gapValueDomain } from './data'

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = gapData(input.revision)

    return {
      marks: [
        lineY(rows, {
          id: 'gapped-series',
          x: 'date',
          y: 'value',
          key: 'id',
          stroke: '#2563eb',
          strokeWidth: 2.25,
        }),
      ],
      x: {
        scale: scaleUtc().domain(timeDomain),
        label: 'Week',
      },
      y: {
        scale: scaleLinear().domain(gapValueDomain),
        label: 'Index',
        grid: true,
      },
    }
  })

export const mount: ConformanceMount = tanstackMount(
  definition,
  'Time-series line with two missing-value gaps',
)
