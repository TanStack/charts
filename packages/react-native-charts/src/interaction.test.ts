import { describe, expect, it } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { lineY } from '@tanstack/charts/line'
import { createChartScene, defineChart } from '@tanstack/charts/scene'
import type {
  ChartDefinition,
  ChartPoint,
  ChartScene,
  SceneNode,
} from '@tanstack/charts/types'
import { adjacentFocusPoint, createNativeChartFocusModel } from './interaction'

interface Datum {
  id: string
}

describe('native focus model', () => {
  it('reuses grouped focus semantics and native accessibility order', () => {
    const points = [
      point('alpha-1', 'alpha', 0, 10, 10, 1, 2),
      point('beta-1', 'beta', 1, 10, 30, 1, 3),
      point('alpha-2', 'alpha', 2, 40, 20, 2, 4),
    ]
    const model = createNativeChartFocusModel(
      chartScene(points),
      definition({ focus: 'group-x', maxFocusDistance: 20 }),
    )

    expect(model.resolve(11, 29).map((candidate) => candidate.key)).toEqual([
      'beta-1',
      'alpha-1',
    ])
    expect(adjacentFocusPoint(model, null, 1)?.key).toBe('alpha-1')
    expect(adjacentFocusPoint(model, model.navigation[0] ?? null, 1)?.key).toBe(
      'alpha-2',
    )
  })

  it('honors a supplied spatial index for nearest focus', () => {
    const points = [point('alpha', 'alpha', 0, 10, 10, 1, 2)]
    let calls = 0
    const model = createNativeChartFocusModel(
      chartScene(points),
      definition({
        spatialIndex: (indexedPoints) => ({
          findNearest() {
            calls += 1
            return indexedPoints[0] ?? null
          },
        }),
      }),
    )

    expect(model.resolve(500, 500)[0]?.key).toBe('alpha')
    expect(calls).toBe(1)
  })

  it('disables focus resolution and spatial indexing when focus is false', () => {
    const points = [point('alpha', 'alpha', 0, 10, 10, 1, 2)]
    let indexCalls = 0
    const model = createNativeChartFocusModel(
      chartScene(points),
      definition({
        focus: false,
        spatialIndex: () => {
          indexCalls += 1
          return { findNearest: () => points[0] ?? null }
        },
      }),
    )

    expect(indexCalls).toBe(0)
    expect(model.resolve(10, 10)).toEqual([])
    expect(model.group(points[0]!)).toEqual([])
    expect(model.navigation).toEqual([])
  })

  it('uses painted containment to seed grouped axis focus', () => {
    const disease = point('disease', 'disease', 0, 10, 40, 1, 100)
    const wounds = point('wounds', 'wounds', 1, 10, 20, 1, 40)
    const model = createNativeChartFocusModel(
      chartScene(
        [disease, wounds],
        [rectangle(disease, 5, 40, 10, 20), rectangle(wounds, 5, 20, 10, 20)],
      ),
      definition({ focus: 'group-x', maxFocusDistance: 0 }),
    )

    expect(model.resolve(10, 30).map((candidate) => candidate.key)).toEqual([
      'wounds',
      'disease',
    ])
  })

  it('restores duplicate keys by datum identity after a scene update', () => {
    const datum = { id: 'same' }
    const previous = point('duplicate', 'alpha', 0, 10, 10, 1, 2, datum)
    const other = point('duplicate', 'alpha', 0, 20, 20, 2, 3, { id: 'same' })
    const restored = point('duplicate', 'alpha', 1, 30, 30, 3, 4, datum)
    const model = createNativeChartFocusModel(
      chartScene([other, restored]),
      definition({}),
    )

    expect(model.restore(previous)).toBe(restored)
  })

  it('limits viewport geometry, navigation, restoration, and indexes to visible points', () => {
    const rows = [0, 1, 2, 3].map((x) => ({ id: String(x), x, y: x }))
    const chartDefinition = (translate: number) =>
      defineChart({
        marks: [lineY(rows, { x: 'x', y: 'y', key: 'id' })],
        x: {
          scale: scaleLinear().domain([0, 3]),
          viewport: { domain: [1, 2], translate },
        },
        y: { scale: scaleLinear().domain([0, 3]) },
        guides: false,
      })
    const settled = createChartScene(chartDefinition(0), {
      width: 480,
      height: 260,
    })
    const settledOne = settled.points.find((point) => point.datum.x === 1)
    const settledTwo = settled.points.find((point) => point.datum.x === 2)
    if (!settledOne || !settledTwo) throw new Error('Expected history points')
    const scene = createChartScene(
      chartDefinition((settledTwo.x - settledOne.x) / 4),
      { width: 480, height: 260 },
    )
    const visible = scene.points.find((point) => point.datum.x === 1)
    const excluded = scene.points.find((point) => point.datum.x === 2)
    if (!visible || !excluded) throw new Error('Expected presented points')
    const right = scene.chart.x + scene.chart.width
    const progress = (right - visible.x) / (excluded.x - visible.x)
    const model = createNativeChartFocusModel(scene, chartDefinition(0))

    expect(
      model.resolve(right, visible.y + (excluded.y - visible.y) * progress)[0]
        ?.datum.x,
    ).toBe(1)
    expect(model.navigation.map((point) => point.datum.x)).toEqual([1])
    expect(model.restore(excluded)).toBeNull()

    let indexed: readonly (typeof scene.points)[number][] = []
    const indexedDefinition = defineChart(chartDefinition(0), {
      spatialIndex(points) {
        indexed = points
        return { findNearest: () => excluded }
      },
    })
    const indexedModel = createNativeChartFocusModel(scene, indexedDefinition)
    expect(indexed.map((point) => point.datum.x)).toEqual([1])
    expect(indexedModel.resolve(right, visible.y)).toEqual([])
  })
})

function definition(
  options: Partial<ChartDefinition<Datum, number, number>>,
): ChartDefinition<Datum, number, number> {
  return { marks: [], ...options }
}

function point(
  key: string,
  group: string,
  datumIndex: number,
  x: number,
  y: number,
  xValue: number,
  yValue: number,
  datum: Datum = { id: key },
): ChartPoint<Datum, number, number> {
  return {
    key,
    markId: 'series',
    group,
    groupLabel: group,
    datum,
    datumIndex,
    xValue,
    yValue,
    x,
    y,
    color: '#2563eb',
  }
}

function chartScene(
  points: readonly ChartPoint<Datum, number, number>[],
  nodes: readonly SceneNode[] = [],
): ChartScene<Datum, number, number> {
  return {
    width: 100,
    height: 60,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    chart: { x: 0, y: 0, width: 100, height: 60 },
    nodes,
    points,
    scales: {},
    colors: {
      type: 'ordinal',
      domain: ['alpha', 'beta'],
      range: ['#2563eb', '#f97316'],
      map: (value) => (value === 'beta' ? '#f97316' : '#2563eb'),
    },
    gradients: [],
    theme: {
      foreground: '#111827',
      muted: '#6b7280',
      grid: '#d1d5db',
      background: 'transparent',
      palette: ['#2563eb', '#f97316'],
    },
  }
}

function rectangle(
  target: ChartPoint<Datum, number, number>,
  x: number,
  y: number,
  width: number,
  height: number,
): SceneNode {
  return {
    kind: 'rect',
    key: target.key,
    x,
    y,
    width,
    height,
    interaction: { point: target, affinity: 'x' },
  }
}
