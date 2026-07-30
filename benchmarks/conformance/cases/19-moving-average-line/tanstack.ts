import { colorLegend, defineChart, lineY } from '@tanstack/charts'
import { group, mean } from 'd3-array'
import { scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import { timeDomain } from '../../shared/data'
import type { TimePoint } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'
import {
  movingAverageData,
  movingAverageValueDomain,
  seriesColors,
  seriesNames,
} from './data'

interface MovingAveragePoint {
  id: string
  date: Date
  value: number
  series: TimePoint['series']
}

const windowSize = 7

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = trailingMeans(movingAverageData(input.revision))

    return {
      marks: [
        lineY(rows, {
          id: 'moving-average-lines',
          x: 'date',
          y: 'value',
          z: 'series',
          key: 'id',
          strokeWidth: 2.25,
        }),
      ],
      x: {
        scale: scaleUtc().domain(timeDomain),
        label: 'Week',
      },
      y: {
        scale: scaleLinear().domain(movingAverageValueDomain),
        grid: true,
        label: 'Moving average',
      },
      color: {
        scale: scaleOrdinal<TimePoint['series'], string>()
          .domain(seriesNames)
          .range(seriesNames.map((series) => seriesColors[series])),
        legend: colorLegend({ label: 'Series' }),
      },
    }
  })

export const mount: ConformanceMount = tanstackMount(
  definition,
  'Seven-week moving averages for three time series',
)

function trailingMeans(
  rows: readonly TimePoint[],
): readonly MovingAveragePoint[] {
  const output: MovingAveragePoint[] = []

  for (const seriesRows of group(rows, (row) => row.series).values()) {
    for (let index = windowSize - 1; index < seriesRows.length; index++) {
      const row = seriesRows[index]
      if (!row) continue
      const value = mean(
        seriesRows.slice(index - windowSize + 1, index + 1),
        (point) => point.value,
      )
      if (value === undefined) continue
      output.push({
        id: row.id,
        date: row.date,
        value,
        series: row.series,
      })
    }
  }

  return output
}
