import { scaleLinear, scaleSymlog } from 'd3-scale'
import { describe, expect, it, vi } from 'vitest'
import { createChartScene, defineChart } from './scene'
import { densityContour } from './spatial-density'
import type { ContourLevelIdentity } from './spatial-contour-internal'
import type { SceneArea, SceneGroup, SceneNode } from './types'

describe('spatial density contours', () => {
  it('estimates final-screen contours with lineage and no invented focus points', () => {
    const rows = [
      { id: 'a', x: -2, y: -1, weight: 1 },
      { id: 'b', x: -1.8, y: -0.8, weight: 2 },
      { id: 'c', x: 2, y: 1, weight: 1 },
      { id: 'negative', x: -1.9, y: -0.9, weight: -0.25 },
      { id: 'zero', x: 999, y: 999, weight: 0 },
      { id: 'invalid-weight', x: 998, y: 998, weight: Number.NaN },
      { id: 'invalid-y', x: 997, y: null, weight: 1 },
    ]
    const before = rows.map((row) => ({ ...row }))
    const fill = vi.fn(
      (datum: { density: number; sourceIndexes: readonly number[] }) =>
        datum.density > 0.001 ? '#1d4ed8' : '#93c5fd',
    )
    const mark = densityContour(rows, {
      x: 'x',
      y: 'y',
      weight: 'weight',
      bandwidth: 18,
      thresholds: [0.0001, 0.0003, 0.0005],
      color: 'density',
      fill,
      stroke: '#1e3a8a',
      motion: { transition: { type: 'tween', duration: 40 } },
    })
    const definition = defineChart({
      marks: [mark],
      guides: false,
      focusRing: false,
      margin: { top: 17, right: 13, bottom: 11, left: 19 },
      x: { scale: scaleSymlog },
      y: { scale: scaleLinear },
      color: {
        scale: scaleLinear<string>,
        range: ['#eff6ff', '#1d4ed8'],
      },
    })
    const scene = createChartScene(definition, { width: 480, height: 280 })
    const repeated = createChartScene(definition, { width: 480, height: 280 })
    const group = densityGroup(scene.nodes)
    const areas = sceneAreas(scene.nodes)

    expect(mark.motion).toEqual({
      transition: { type: 'tween', duration: 40 },
    })
    expect(scene.scales.x.domain).toEqual([-2, 2])
    expect(scene.scales.y.domain).toEqual([-1, 1])
    expect(scene.colors.domain[0]).toBe(0)
    expect(scene.points).toEqual([])
    expect(group.translateX).toBe(scene.chart.x)
    expect(group.translateY).toBe(scene.chart.y)
    expect(group.clip).toEqual({
      x: 0,
      y: 0,
      width: scene.chart.width,
      height: scene.chart.height,
    })
    expect(areas).toHaveLength(3)
    expect(areas.every((area) => area.path === undefined)).toBe(true)
    expect(areas.every((area) => area.points.length === 0)).toBe(true)
    expect(areas.every((area) => area.polygons?.length)).toBe(true)
    expect(areas.map((area) => area.key)).toEqual(
      sceneAreas(repeated.nodes).map((area) => area.key),
    )
    expect(fill).toHaveBeenCalled()
    for (const [datum] of fill.mock.calls) {
      expect(datum.sourceIndexes).toEqual([0, 1, 2, 3])
    }
    expect(rows).toEqual(before)
  })

  it('uses explicit z groups while color remains presentation-only', () => {
    const rows = [
      { x: -1, y: 0, group: 'A', color: 'red' },
      { x: -0.8, y: 0.1, group: 'A', color: 'blue' },
      { x: 1, y: 0, group: 'B', color: 'red' },
      { x: 0.8, y: -0.1, group: 'B', color: 'blue' },
    ]
    const render = (z: 'group' | undefined) =>
      createChartScene(
        defineChart({
          marks: [
            densityContour(rows, {
              x: 'x',
              y: 'y',
              ...(z ? { z } : {}),
              color: (datum) => datum.source[0]!.color,
              bandwidth: 12,
              thresholds: [0.0001],
            }),
          ],
          guides: false,
          focusRing: false,
          margin: 0,
          x: { scale: scaleLinear().domain([-2, 2]) },
          y: { scale: scaleLinear().domain([-1, 1]) },
        }),
        { width: 320, height: 180 },
      )

    expect(sceneAreas(render(undefined).nodes)).toHaveLength(1)
    expect(sceneAreas(render('group').nodes)).toHaveLength(2)
  })

  it('shares numeric thresholds across groups and recomputes on resize', () => {
    const rows = [
      ...Array.from({ length: 20 }, (_, index) => ({
        x: index / 20,
        y: index / 20,
        group: 'A',
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        x: 2 + index / 20,
        y: 2 + index / 20,
        group: 'B',
      })),
    ]
    const definition = defineChart({
      marks: [
        densityContour(rows, {
          x: 'x',
          y: 'y',
          z: 'group',
          bandwidth: 14,
          thresholds: 4,
        }),
      ],
      guides: false,
      focusRing: false,
      margin: 0,
      x: { scale: scaleLinear().domain([0, 3]) },
      y: { scale: scaleLinear().domain([0, 3]) },
    })
    const narrow = createChartScene(definition, { width: 220, height: 160 })
    const wide = createChartScene(definition, { width: 660, height: 160 })

    const narrowKeys = sceneAreas(narrow.nodes).map((area) => area.key)
    const wideKeys = sceneAreas(wide.nodes).map((area) => area.key)
    expect(narrowKeys.length).toBeGreaterThan(0)
    expect(wideKeys.length).toBeGreaterThan(0)
    expect(sceneAreas(narrow.nodes).map((area) => area.polygons)).not.toEqual(
      sceneAreas(wide.nodes).map((area) => area.polygons),
    )
    expect(levelsByGroup(narrowKeys).get('string:A')).toEqual(
      expect.arrayContaining(levelsByGroup(narrowKeys).get('string:B') ?? []),
    )
  })

  it('keeps generated threshold keys stable across resize and density changes', () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      x: 0.35 + (index % 4) * 0.1,
      y: 0.4 + Math.floor(index / 4) * 0.1,
    }))
    const render = (
      width: number,
      weight: number,
      thresholds: number | undefined,
    ) => {
      const densities: number[] = []
      const scene = createChartScene(
        defineChart({
          marks: [
            densityContour(rows, {
              id: 'stable-density',
              x: 'x',
              y: 'y',
              weight: () => weight,
              bandwidth: 16,
              ...(thresholds === undefined ? {} : { thresholds }),
              fill: (datum) => {
                densities.push(datum.density)
                return '#2563eb'
              },
            }),
          ],
          guides: false,
          focusRing: false,
          margin: 0,
          x: { scale: scaleLinear().domain([0, 1]) },
          y: { scale: scaleLinear().domain([0, 1]) },
        }),
        { width, height: 220 },
      )
      return {
        densities,
        keys: sceneAreas(scene.nodes).map((area) => area.key),
      }
    }

    for (const thresholds of [undefined, 4] as const) {
      const base = render(320, 1, thresholds)
      const resized = render(640, 1, thresholds)
      const reweighted = render(320, 10, thresholds)

      expect(base.densities).not.toEqual(resized.densities)
      expect(base.densities).not.toEqual(reweighted.densities)
      expectStableGeneratedKeys(base.keys, resized.keys)
      expectStableGeneratedKeys(base.keys, reweighted.keys)
    }
  })

  it('distinguishes repeated explicit threshold levels', () => {
    const rows = [
      { x: 0.45, y: 0.45 },
      { x: 0.5, y: 0.45 },
      { x: 0.45, y: 0.5 },
      { x: 0.5, y: 0.5 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          densityContour(rows, {
            x: 'x',
            y: 'y',
            bandwidth: 16,
            thresholds: [0.0001, 0.0001],
          }),
        ],
        guides: false,
        focusRing: false,
        margin: 0,
        x: { scale: scaleLinear().domain([0, 1]) },
        y: { scale: scaleLinear().domain([0, 1]) },
      }),
      { width: 240, height: 180 },
    )

    expect(
      sceneAreas(scene.nodes).map(({ key }) => parseContourSceneKey(key)[2]),
    ).toEqual([
      ['explicit', 0.0001, 0],
      ['explicit', 0.0001, 1],
    ])
  })

  it('rejects invalid estimator parameters and threshold values', () => {
    const rows = [{ x: 0, y: 0 }]
    expect(() =>
      densityContour(rows, { x: 'x', y: 'y', bandwidth: -1 }),
    ).toThrow('bandwidth must be a nonnegative finite number')
    expect(() => densityContour(rows, { x: 'x', y: 'y', cellSize: 0 })).toThrow(
      'cellSize must be a finite number greater than or equal to 1',
    )
    expect(() =>
      densityContour(rows, { x: 'x', y: 'y', thresholds: 0 }),
    ).toThrow('threshold count must be a positive integer')
    expect(() =>
      densityContour(rows, { x: 'x', y: 'y', thresholds: [Number.NaN] }),
    ).toThrow('thresholds must be finite numbers')
  })
})

function densityGroup(nodes: readonly SceneNode[]) {
  const group = findDensityGroup(nodes)
  if (!group) throw new Error('density group missing')
  return group
}

function findDensityGroup(nodes: readonly SceneNode[]): SceneGroup | undefined {
  for (const node of nodes) {
    if (
      node.kind === 'group' &&
      node.className?.includes('ts-chart__density-contour')
    ) {
      return node
    }
    if (node.kind === 'group') {
      const nested = findDensityGroup(node.children)
      if (nested) return nested
    }
  }
  return undefined
}

function sceneAreas(nodes: readonly SceneNode[]): SceneArea[] {
  return nodes.flatMap((node): SceneArea[] => {
    if (node.kind === 'area') return [node]
    if (node.kind === 'group') return sceneAreas(node.children)
    return []
  })
}

type ContourSceneKey = readonly [string, string, ContourLevelIdentity]

function parseContourSceneKey(key: string): ContourSceneKey {
  return JSON.parse(key) as unknown as ContourSceneKey
}

function levelsByGroup(keys: readonly string[]) {
  const groups = new Map<string, ContourLevelIdentity[]>()
  for (const key of keys) {
    const [, group, level] = parseContourSceneKey(key)
    const values = groups.get(group)
    if (values) values.push(level)
    else groups.set(group, [level])
  }
  return groups
}

function expectStableGeneratedKeys(left: string[], right: string[]) {
  const leftLevels = left.map((key) => parseContourSceneKey(key)[2])
  const rightLevels = right.map((key) => parseContourSceneKey(key)[2])
  expect(leftLevels.length).toBeGreaterThan(0)
  expect(rightLevels.length).toBeGreaterThan(0)
  expect(
    [...leftLevels, ...rightLevels].every((level) => level[0] === 'generated'),
  ).toBe(true)
  const shorter = (
    leftLevels.length <= rightLevels.length ? leftLevels : rightLevels
  ).map((level) => JSON.stringify(level))
  const longer = new Set(
    (leftLevels.length <= rightLevels.length ? rightLevels : leftLevels).map(
      (level) => JSON.stringify(level),
    ),
  )
  expect(shorter.every((level) => longer.has(level))).toBe(true)
}
