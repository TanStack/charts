import {
  areaY,
  barY,
  d3Curve,
  defineChart,
  dot,
  lineY,
  ruleY,
} from '@tanstack/charts'
import type { ChartCurve } from '@tanstack/charts'
import { extent } from 'd3-array'
import { scaleBand, scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import { curveCatmullRom, curveStep } from 'd3-shape'
import type { BarPoint, TrendPoint } from './data'

export type TrendDisplay = 'area' | 'line'
export type TrendCurve = 'linear' | 'catmull-rom' | 'step'

export interface TrendInput {
  points: readonly TrendPoint[]
  display: TrendDisplay
  curve: TrendCurve
  movingAverage: number
  showDots: boolean
}

export interface PreparedTrend {
  points: readonly TrendPoint[]
}

export interface BarInput {
  rows: readonly BarPoint[]
  order: 'name' | 'value'
}

export interface PreparedBars {
  rows: readonly BarPoint[]
}

export interface DefinitionCounters {
  prepares: number
}

const catmullRomCurve = d3Curve(curveCatmullRom)
const stepCurve = d3Curve(curveStep)

export function createTrendChart(counters: DefinitionCounters) {
  return defineChart<TrendInput>()({
    prepare(input) {
      counters.prepares += 1
      return {
        points: movingAverage(input.points, input.movingAverage),
      }
    },
    prepareEqual(previous, next) {
      return (
        previous.points === next.points &&
        previous.movingAverage === next.movingAverage
      )
    },
    chart({ input, prepared, theme, width }) {
      const color = theme.palette[0] ?? 'currentColor'
      const curve = resolveCurve(input.curve)
      const xTicks = width < 440 ? 4 : 8

      return {
        marks: [
          ruleY(prepared.points.slice(0, 1), {
            y: () => 0,
            stroke: theme.muted,
          }),
          ...(input.display === 'area'
            ? [
                areaY(prepared.points, {
                  id: 'trend-area',
                  x: 'date',
                  y: 'value',
                  key: (_point, index) => index,
                  curve,
                  fill: color,
                  fillOpacity: 0.16,
                }),
              ]
            : []),
          lineY(prepared.points, {
            id: 'trend-line',
            x: 'date',
            y: 'value',
            key: (_point, index) => index,
            curve,
            stroke: color,
            strokeWidth: 2.5,
          }),
          ...(input.showDots
            ? [
                dot(prepared.points, {
                  id: 'trend-dots',
                  x: 'date',
                  y: 'value',
                  key: (_point, index) => index,
                  fill: theme.background,
                  stroke: color,
                  strokeWidth: 1.5,
                  r: width < 520 ? 2 : 3,
                }),
              ]
            : []),
        ],
        x: {
          scale: scaleUtc().domain(dateDomain(prepared.points)),
          ticks: xTicks,
        },
        y: {
          scale: scaleLinear()
            .domain(zeroIncludingDomain(prepared.points))
            .nice(5),
          label: width < 440 ? undefined : 'Index',
          ticks: 5,
          grid: true,
        },
        margin: {
          left: width < 520 ? 42 : 54,
          right: 16,
          top: 18,
          bottom: 38,
        },
      }
    },
  })
}

export function createBarsChart(counters: DefinitionCounters) {
  return defineChart<BarInput>()({
    prepare(input) {
      counters.prepares += 1
      const rows = [...input.rows]
      rows.sort((left, right) =>
        input.order === 'value'
          ? right.value - left.value
          : left.name.localeCompare(right.name),
      )
      return { rows }
    },
    prepareEqual(previous, next) {
      return previous.rows === next.rows && previous.order === next.order
    },
    chart({ prepared, theme, width }) {
      const names = prepared.rows.map((row) => row.name)

      return {
        marks: [
          ruleY(prepared.rows.slice(0, 1), {
            y: () => 0,
            stroke: theme.muted,
          }),
          barY(prepared.rows, {
            id: 'sandbox-bars',
            x: 'name',
            y: 'value',
            color: 'name',
            key: 'name',
            inset: 3,
            radius: 3,
          }),
        ],
        x: {
          scale: scaleBand<string>()
            .domain(names)
            .paddingInner(0.1)
            .paddingOuter(0.05),
          tickRotate: width < 520 ? -35 : 0,
          labelOffset: width < 520 ? 48 : 34,
        },
        y: {
          scale: scaleLinear().domain([0, 100]),
          label: width < 440 ? undefined : 'Score',
          grid: true,
        },
        color: {
          scale: scaleOrdinal<string, string>()
            .domain(names)
            .range(theme.palette),
        },
        margin: {
          left: width < 520 ? 42 : 52,
          right: 14,
          top: 18,
          bottom: width < 520 ? 56 : 42,
        },
      }
    },
  })
}

function resolveCurve(curve: TrendCurve): ChartCurve | undefined {
  if (curve === 'catmull-rom') return catmullRomCurve
  if (curve === 'step') return stepCurve
  return undefined
}

function dateDomain(points: readonly TrendPoint[]): readonly [Date, Date] {
  const [start, end] = extent(points, (point) => point.date)
  return start && end
    ? [start, end]
    : [new Date(0), new Date(24 * 60 * 60 * 1_000)]
}

function zeroIncludingDomain(
  points: readonly TrendPoint[],
): readonly [number, number] {
  const [minimum, maximum] = extent(points, (point) => point.value)
  if (minimum === undefined || maximum === undefined) return [0, 1]
  const domain = [Math.min(0, minimum), Math.max(0, maximum)] as const
  return domain[0] === domain[1] ? [0, 1] : domain
}

function movingAverage(
  points: readonly TrendPoint[],
  windowSize: number,
): readonly TrendPoint[] {
  if (windowSize <= 1) return points

  return points.map((point, index) => {
    const start = Math.max(0, index - windowSize + 1)
    const window = points.slice(start, index + 1)
    return {
      date: point.date,
      value:
        window.reduce((total, current) => total + current.value, 0) /
        window.length,
    }
  })
}
