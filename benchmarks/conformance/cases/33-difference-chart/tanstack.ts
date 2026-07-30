import { aapl } from '@charts-poc/demo-data/aapl'
import { areaY, defineChart, lineY } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { formatDifferenceMonth } from './model'
import { rollingCloseAverage } from './transform'
import type { DifferencePoint } from './transform'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

interface DifferenceAreaPoint extends DifferencePoint {
  id: string
  segment: string
  sign: 'positive' | 'negative'
}

const definition = (input: ConformanceInput) => {
  const rows = rollingCloseAverage(
    aapl.slice(input.revision * 10, input.revision * 10 + 120),
    20,
  )
  const areaRows = differenceAreas(rows)

  return defineChart({
    marks: [
      areaY(areaRows, {
        x: 'Date',
        y1: 'average',
        y2: 'Close',
        z: 'segment',
        color: 'sign',
        fillOpacity: 0.35,
      }),
      lineY(rows, {
        x: 'Date',
        y: 'Close',
        stroke: '#166534',
        strokeWidth: 2,
      }),
      lineY(rows, {
        x: 'Date',
        y: 'average',
        stroke: '#475569',
        strokeWidth: 2,
      }),
    ],
    x: {
      scale: scaleUtc,
      ticks: 9,
      format: formatDifferenceMonth,
    },
    y: {
      scale: scaleLinear,
      ticks: 6,
      grid: true,
    },
    color: {
      domain: ['positive', 'negative'],
      range: ['#16a34a', '#dc2626'],
    },
    margin: { top: 20, right: 20, bottom: 30, left: 80 },
  })
}

export const mount = tanstackMount(
  definition,
  'Apple closing price versus its twenty-day average',
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
  const difference = row.Close - row.average
  if (difference === 0) return undefined
  return difference > 0 ? 'positive' : 'negative'
}

function crosses(left: DifferencePoint, right: DifferencePoint): boolean {
  return (left.Close - left.average) * (right.Close - right.average) < 0
}

function crossing(
  left: DifferencePoint,
  right: DifferencePoint,
): DifferencePoint {
  const leftDifference = left.Close - left.average
  const rightDifference = right.Close - right.average
  const t = -leftDifference / (rightDifference - leftDifference)
  const time =
    left.Date.getTime() + (right.Date.getTime() - left.Date.getTime()) * t
  const value = left.Close + (right.Close - left.Close) * t

  return {
    ...left,
    Date: new Date(time),
    Close: value,
    average: value,
  }
}
