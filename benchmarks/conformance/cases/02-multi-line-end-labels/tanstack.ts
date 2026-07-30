import { defineChart, lineY, text } from '@tanstack/charts'
import { group } from 'd3-array'
import { scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import { timeDomain } from '../../shared/data'
import type { TimePoint } from '../../shared/data'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { tanstackMount } from '../../shared/mount'
import {
  multiLineData,
  multiLineValueDomain,
  seriesColors,
  seriesNames,
} from './data'

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = multiLineData(input.revision)
    const endpoints = lastBySeries(rows)

    return {
      marks: [
        lineY(rows, {
          id: 'series-lines',
          x: 'date',
          y: 'value',
          z: 'series',
          key: 'id',
          strokeWidth: 2.25,
        }),
        text(endpoints, {
          id: 'end-labels',
          x: 'date',
          y: 'value',
          text: 'series',
          z: 'series',
          key: 'id',
          anchor: 'start',
          dx: 5,
          fontWeight: 600,
        }),
      ],
      x: {
        scale: scaleUtc().domain(timeDomain),
        label: 'Week',
      },
      y: {
        scale: scaleLinear().domain(multiLineValueDomain),
        label: 'Index',
        grid: true,
      },
      color: {
        scale: scaleOrdinal<TimePoint['series'], string>()
          .domain(seriesNames)
          .range(seriesNames.map((series) => seriesColors[series])),
      },
      margin: { right: 72 },
    }
  })

export const mount: ConformanceMount = tanstackMount(
  definition,
  'Three time series with direct end labels',
)

function lastBySeries(rows: readonly TimePoint[]): readonly TimePoint[] {
  return Array.from(group(rows, (row) => row.series).values(), (seriesRows) =>
    seriesRows.at(-1),
  ).filter((row): row is TimePoint => row !== undefined)
}
