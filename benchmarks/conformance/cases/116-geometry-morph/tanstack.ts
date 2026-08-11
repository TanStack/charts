import { createMark, defineChart } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { morphData, morphModes } from './model'
import { tanstackCase } from '../../shared/mount'
import type {
  ChartMotionDefinition,
  ChartPoint,
  SceneNode,
} from '@tanstack/charts'
import type { MorphDatum, MorphMode } from './model'

type Point = readonly [number, number]

const sampleCount = 48

export { mount } from './view'

export function geometryMorphDefinition(
  data: readonly MorphDatum[],
  mode: MorphMode,
) {
  return defineChart({
    motion: {
      transition: {
        type: 'spring',
        stiffness: 105,
        damping: 16,
        mass: 0.9,
      },
    },
    marks: [
      normalizedTopologyMark(data, mode, {
        id: 'geometry-morph',
        key: (datum) => datum.id,
        fill: (datum) => datum.color,
        fillOpacity: 0.9,
        stroke: 'Canvas',
        strokeOpacity: 0.75,
        strokeWidth: 1.5,
        lineJoin: 'round',
        motion(context) {
          return {
            delay: context.phase === 'enter' ? context.datumIndex * 38 : 0,
            transition:
              context.datum?.id === 'violet'
                ? { type: 'spring', mass: 1.35 }
                : undefined,
          }
        },
      }),
    ],
    x: { scale: scaleLinear().domain([0, data.length - 1]) },
    y: { scale: scaleLinear().domain([0, 100]) },
    guides: false,
    margin: 0,
  })
}

export const catalogCase = tanstackCase(
  (input) =>
    geometryMorphDefinition(morphData, modeForRevision(input.revision)),
  'Data morphing between bars, line, area, rose, and bubbles',
)

interface NormalizedTopologyMarkOptions {
  id: string
  key: (datum: MorphDatum, index: number) => string
  fill: (datum: MorphDatum, index: number) => string
  fillOpacity: number
  stroke: string
  strokeOpacity: number
  strokeWidth: number
  lineJoin: 'miter' | 'round' | 'bevel'
  motion?: ChartMotionDefinition<MorphDatum>
}

function normalizedTopologyMark(
  data: readonly MorphDatum[],
  mode: MorphMode,
  options: NormalizedTopologyMarkOptions,
) {
  return createMark<MorphDatum, number, number>(() => {
    const id = options.id
    return {
      id,
      channels: {
        x: { scale: 'x', values: data.map((_datum, index) => index) },
        y: {
          scale: 'y',
          values: data.map((datum) => datum.value),
          includeZero: true,
        },
      },
      render: ({ chart }) => {
        const geometries = geometryForMode(data, mode, chart)
        const nodes: SceneNode[] = []
        const points: ChartPoint<MorphDatum, number, number>[] = []
        data.forEach((datum, datumIndex) => {
          const geometry = geometries[datumIndex]
          if (!geometry) return
          const datumKey = options.key(datum, datumIndex)
          const key = `${id}:${datumKey}`
          nodes.push({
            kind: 'area',
            key,
            points: geometry.points,
            style: {
              fill: options.fill(datum, datumIndex),
              fillOpacity: options.fillOpacity,
              stroke: options.stroke,
              strokeOpacity: options.strokeOpacity,
              strokeWidth: options.strokeWidth,
              lineJoin: options.lineJoin,
            },
          })
          points.push({
            key,
            markId: id,
            group: datumKey,
            groupLabel: datum.label,
            datum,
            datumIndex,
            xValue: datumIndex,
            yValue: datum.value,
            x: geometry.center[0],
            y: geometry.center[1],
            color: datum.color,
          })
        })
        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: 'ts-chart__area ts-chart__geometry-morph',
              children: nodes,
            },
          ],
          points,
        }
      },
    }
  }, options.motion)
}

function geometryForMode(
  data: readonly MorphDatum[],
  mode: MorphMode,
  chart: { x: number; y: number; width: number; height: number },
) {
  const padding = Math.max(14, Math.min(chart.width, chart.height) * 0.05)
  const center: Point = [chart.x + chart.width / 2, chart.y + chart.height / 2]
  const radius = Math.max(12, Math.min(chart.width, chart.height) / 2 - padding)
  const maximum = Math.max(...data.map((datum) => datum.value))

  if (mode === 'bars') {
    const gap = Math.max(4, chart.width * 0.012)
    const width = (chart.width - padding * 2) / data.length
    return data.map((datum, index) => {
      const height = ((chart.height - padding * 2) * datum.value) / 100
      const x = chart.x + padding + index * width + gap / 2
      const y = chart.y + chart.height - padding - height
      const barWidth = width - gap
      return {
        points: sampleRectangle(x, y, barWidth, height, sampleCount),
        center: [x + barWidth / 2, y + height / 2] as Point,
      }
    })
  }

  if (mode === 'bubbles') {
    const columns = 3
    const rows = 2
    const cellWidth = (chart.width - padding * 2) / columns
    const cellHeight = (chart.height - padding * 2) / rows
    return data.map((datum, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const bubbleCenter: Point = [
        chart.x + padding + cellWidth * (column + 0.5),
        chart.y + padding + cellHeight * (row + 0.5),
      ]
      const bubbleRadius =
        Math.min(cellWidth, cellHeight) * 0.4 * Math.sqrt(datum.value / maximum)
      return {
        points: sampleCircle(bubbleCenter, bubbleRadius, sampleCount),
        center: bubbleCenter,
      }
    })
  }

  const gap = 0.035
  let angle = -Math.PI / 2
  const total = data.reduce((sum, datum) => sum + datum.value, 0)
  return data.map((datum, index) => {
    const span =
      mode === 'rose'
        ? (Math.PI * 2) / data.length
        : (Math.PI * 2 * datum.value) / total
    const start = mode === 'rose' ? -Math.PI / 2 + index * span : angle
    const end = start + span
    angle = end
    const outer =
      mode === 'rose' ? radius * (0.38 + (0.6 * datum.value) / maximum) : radius
    const inner = mode === 'rose' ? radius * 0.09 : radius * 0.55
    const points = sampleSector(
      center,
      inner,
      outer,
      start + gap,
      end - gap,
      sampleCount,
    )
    const middleAngle = (start + end) / 2
    const middleRadius = (inner + outer) / 2
    return {
      points,
      center: [
        center[0] + Math.cos(middleAngle) * middleRadius,
        center[1] + Math.sin(middleAngle) * middleRadius,
      ] as Point,
    }
  })
}

function sampleRectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  count: number,
): Point[] {
  const perimeter = 2 * (width + height)
  return Array.from({ length: count }, (_value, index) => {
    let distance = (index / count) * perimeter
    if (distance < width) return [x + distance, y] as const
    distance -= width
    if (distance < height) return [x + width, y + distance] as const
    distance -= height
    if (distance < width) return [x + width - distance, y + height] as const
    return [x, y + height - (distance - width)] as const
  })
}

function sampleCircle(center: Point, radius: number, count: number): Point[] {
  return Array.from({ length: count }, (_value, index) => {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2
    return [
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius,
    ] as const
  })
}

function sampleSector(
  center: Point,
  inner: number,
  outer: number,
  start: number,
  end: number,
  count: number,
): Point[] {
  const outerCount = count / 2
  const innerCount = count - outerCount
  const points: Point[] = []
  for (let index = 0; index < outerCount; index += 1) {
    const angle = start + ((end - start) * index) / (outerCount - 1)
    points.push([
      center[0] + Math.cos(angle) * outer,
      center[1] + Math.sin(angle) * outer,
    ])
  }
  for (let index = 0; index < innerCount; index += 1) {
    const angle = end - ((end - start) * index) / (innerCount - 1)
    points.push([
      center[0] + Math.cos(angle) * inner,
      center[1] + Math.sin(angle) * inner,
    ])
  }
  return points
}

export function modeForRevision(revision: number) {
  return morphModes[Math.abs(revision) % morphModes.length] ?? 'bars'
}

export function modeLabel(mode: MorphMode) {
  return mode[0]!.toUpperCase() + mode.slice(1)
}
