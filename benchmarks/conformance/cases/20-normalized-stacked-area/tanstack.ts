import { areaY, colorLegend, defineChart, ruleY } from '@tanstack/charts'
import { format } from 'd3-format'
import { group } from 'd3-array'
import { scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import { stack, stackOffsetExpand } from 'd3-shape'
import { timeDomain } from '../../shared/data'
import type { TimePoint } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'
import {
  normalizedStackData,
  normalizedValueDomain,
  seriesColors,
  seriesNames,
} from './data'

interface WideTimePoint {
  date: Date
  Atlas: number
  Beacon: number
  Comet: number
}

interface NormalizedStackPoint {
  id: string
  date: Date
  value: number
  series: TimePoint['series']
  y1: number
  y2: number
}

const percent = format('.0%')

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = normalizedIntervals(normalizedStackData(input.revision))

  return {
    marks: [
      areaY(rows, {
        id: 'normalized-areas',
        x: 'date',
        y1: 'y1',
        y2: 'y2',
        z: 'series',
        key: 'id',
        fillOpacity: 0.82,
      }),
      ruleY([0]),
    ],
    x: {
      scale: scaleUtc().domain(timeDomain),
      label: 'Week',
    },
    y: {
      scale: scaleLinear().domain(normalizedValueDomain),
      grid: true,
      label: 'Share',
      format: percent,
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
  'Normalized stacked area composition',
)

function normalizedIntervals(
  rows: readonly TimePoint[],
): readonly NormalizedStackPoint[] {
  const wideRows = Array.from(
    group(rows, (row) => row.date.getTime()).values(),
    toWideRow,
  )

  return stack<WideTimePoint, TimePoint['series']>()
    .keys(seriesNames)
    .value((row, key) => row[key])
    .offset(stackOffsetExpand)(wideRows)
    .flatMap((series) =>
      series.map((point): NormalizedStackPoint => ({
        id: `${series.key}:${point.data.date.toISOString()}`,
        date: point.data.date,
        value: point.data[series.key],
        series: series.key,
        y1: point[0],
        y2: point[1],
      })),
    )
}

function toWideRow(rows: TimePoint[]): WideTimePoint {
  return {
    date: rows[0]?.date ?? new Date(0),
    Atlas: valueForSeries(rows, 'Atlas'),
    Beacon: valueForSeries(rows, 'Beacon'),
    Comet: valueForSeries(rows, 'Comet'),
  }
}

function valueForSeries(
  rows: readonly TimePoint[],
  series: TimePoint['series'],
): number {
  return rows.find((row) => row.series === series)?.value ?? 0
}
