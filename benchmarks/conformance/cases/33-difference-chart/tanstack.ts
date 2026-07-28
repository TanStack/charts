import { areaY, defineChart, lineY } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { differenceData, differenceDomain, formatDifferenceMonth } from './data'
import type { DifferencePoint } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface DifferenceAreaPoint extends DifferencePoint {
  segment: string
  sign: 'positive' | 'negative'
}

const definition = defineChart<ConformanceInput>()(({ input }) => {
  const rows = differenceData(input.revision)
  const areaRows = differenceAreas(rows)

  return {
    marks: [
      areaY(areaRows, {
        x: 'date',
        y1: 'forecast',
        y2: 'actual',
        z: 'segment',
        key: 'id',
        fill: (row) => (row.sign === 'positive' ? '#16a34a' : '#dc2626'),
        fillOpacity: 0.35,
      }),
      lineY(rows, {
        x: 'date',
        y: 'actual',
        key: 'id',
        stroke: '#166534',
        strokeWidth: 2,
      }),
      lineY(rows, {
        x: 'date',
        y: 'forecast',
        key: 'id',
        stroke: '#475569',
        strokeWidth: 2,
      }),
    ],
    x: {
      scale: scaleUtc().domain(differenceDomain),
      ticks: 9,
      format: formatDifferenceMonth,
    },
    y: {
      scale: scaleLinear().domain([10, 60]),
      ticks: 6,
      grid: true,
    },
    margin: { top: 20, right: 20, bottom: 30, left: 40 },
  }
})

export const mount = tanstackMount(
  definition,
  'Actual versus forecast difference chart',
)

function differenceAreas(
  rows: readonly DifferencePoint[],
): readonly DifferenceAreaPoint[] {
  const first = rows[0]
  if (!first) return []

  const points: DifferenceAreaPoint[] = []
  let sign = firstNonZeroSign(rows) ?? 'positive'
  let segmentIndex = 0
  let segment = `${sign}-${segmentIndex}`

  pushPoint(first, 'start')

  for (let index = 1; index < rows.length; index++) {
    const previous = rows[index - 1]
    const row = rows[index]
    if (!previous || !row) continue

    const nextSign = signOf(row) ?? sign
    if (crosses(previous, row)) {
      const boundary = crossing(previous, row)
      pushPoint(boundary, `crossing-${index}:end`)
      startSegment(nextSign)
      pushPoint(boundary, `crossing-${index}:start`)
    } else if (nextSign !== sign) {
      startSegment(nextSign)
      pushPoint(previous, `boundary-${index}`)
    }
    pushPoint(row, `row-${index}`)
  }

  return points

  function startSegment(nextSign: DifferenceAreaPoint['sign']) {
    sign = nextSign
    segmentIndex += 1
    segment = `${sign}-${segmentIndex}`
  }

  function pushPoint(row: DifferencePoint, suffix: string) {
    points.push({
      ...row,
      id: `${segment}:${suffix}`,
      segment,
      sign,
    })
  }
}

function firstNonZeroSign(
  rows: readonly DifferencePoint[],
): DifferenceAreaPoint['sign'] | undefined {
  for (const row of rows) {
    const sign = signOf(row)
    if (sign) return sign
  }
  return undefined
}

function signOf(row: DifferencePoint): DifferenceAreaPoint['sign'] | undefined {
  const difference = row.actual - row.forecast
  if (difference === 0) return undefined
  return difference > 0 ? 'positive' : 'negative'
}

function crosses(left: DifferencePoint, right: DifferencePoint): boolean {
  return (left.actual - left.forecast) * (right.actual - right.forecast) < 0
}

function crossing(
  left: DifferencePoint,
  right: DifferencePoint,
): DifferencePoint {
  const leftDifference = left.actual - left.forecast
  const rightDifference = right.actual - right.forecast
  const t = -leftDifference / (rightDifference - leftDifference)
  const time =
    left.date.getTime() + (right.date.getTime() - left.date.getTime()) * t
  const value = left.actual + (right.actual - left.actual) * t

  return {
    id: `crossing-${time}`,
    date: new Date(time),
    actual: value,
    forecast: value,
  }
}
