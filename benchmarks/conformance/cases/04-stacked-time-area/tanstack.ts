import { areaY, colorLegend, defineChart, ruleY } from '@tanstack/charts'
import { group } from 'd3-array'
import { scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import { stack } from 'd3-shape'
import { timeDomain } from '../../shared/data'
import type { TimePoint } from '../../shared/data'
import type { ConformanceInput, ConformanceMount } from '../../types'
import { tanstackMount } from '../../shared/mount'
import {
  seriesColors,
  seriesNames,
  stackedTimeData,
  stackedTimeValueDomain,
} from './data'

interface WideTimePoint {
  date: Date
  Atlas: number
  Beacon: number
  Comet: number
}

interface StackedTimePoint {
  id: string
  date: Date
  value: number
  series: TimePoint['series']
  y1: number
  y2: number
}

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = stackedTimeData(input.revision)
  const intervals = stackRows(rows)

  return {
    marks: [
      areaY(intervals, {
        id: 'stacked-areas',
        x: 'date',
        y1: 'y1',
        y2: 'y2',
        z: 'series',
        key: 'id',
        fillOpacity: 0.78,
      }),
      ruleY([0]),
    ],
    x: {
      scale: scaleUtc().domain(timeDomain),
      label: 'Week',
    },
    y: {
      scale: scaleLinear().domain(stackedTimeValueDomain),
      label: 'Combined index',
      grid: true,
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
  'Three stacked time-series areas',
  {
    format: ({ datum }) =>
      `${datum.series} · ${datum.date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })} · ${datum.value.toLocaleString('en-US', {
        maximumFractionDigits: 1,
      })} index points`,
  },
)

function stackRows(rows: readonly TimePoint[]): readonly StackedTimePoint[] {
  const wideRows = Array.from(
    group(rows, (row) => row.date.getTime()).values(),
    toWideRow,
  )

  return stack<WideTimePoint, TimePoint['series']>()
    .keys(seriesNames)
    .value((row, key) => row[key])(wideRows)
    .flatMap((series) =>
      series.map((point): StackedTimePoint => ({
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
