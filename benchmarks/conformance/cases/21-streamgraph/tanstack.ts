import { areaY, colorLegend, defineChart } from '@tanstack/charts'
import { group, min } from 'd3-array'
import { scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import { stack, stackOffsetWiggle, stackOrderInsideOut } from 'd3-shape'
import { timeDomain } from '../../shared/data'
import type { TimePoint } from '../../shared/data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput, ConformanceMount } from '../../types'
import {
  seriesColors,
  seriesNames,
  streamData,
  streamValueDomain,
} from './data'

interface WideTimePoint {
  date: Date
  Atlas: number
  Beacon: number
  Comet: number
}

interface StreamPoint {
  id: string
  date: Date
  value: number
  series: TimePoint['series']
  y1: number
  y2: number
}

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = streamIntervals(streamData(input.revision))

  return {
    marks: [
      areaY(rows, {
        id: 'stream-areas',
        x: 'date',
        y1: 'y1',
        y2: 'y2',
        z: 'series',
        key: 'id',
        fillOpacity: 0.85,
      }),
    ],
    x: {
      scale: scaleUtc().domain(timeDomain),
      label: 'Week',
    },
    y: {
      scale: scaleLinear().domain(streamValueDomain),
      grid: true,
      label: 'Stream offset',
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
  'Three-series streamgraph',
)

function streamIntervals(rows: readonly TimePoint[]): readonly StreamPoint[] {
  const wideRows = Array.from(
    group(rows, (row) => row.date.getTime()).values(),
    toWideRow,
  )
  const layers = stack<WideTimePoint, TimePoint['series']>()
    .keys(seriesNames)
    .value((row, key) => row[key])
    .order(stackOrderInsideOut)
    .offset(stackOffsetWiggle)(wideRows)
  const baseline = min(layers, (layer) => min(layer, (point) => point[0])) ?? 0

  return layers.flatMap((series) =>
    series.map((point): StreamPoint => ({
      id: `${series.key}:${point.data.date.toISOString()}`,
      date: point.data.date,
      value: point.data[series.key],
      series: series.key,
      y1: point[0] - baseline,
      y2: point[1] - baseline,
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
