import { scaleLinear } from 'd3-scale'
import { describe, expect, it, vi } from 'vitest'
import { createChartScene, defineChart } from './scene'
import { contour } from './spatial-contour'
import type { ContourLevelIdentity } from './spatial-contour-internal'
import type { SceneArea, SceneGroup, SceneNode } from './types'

describe('scalar-grid contours', () => {
  it('validates grid dimensions and row count', () => {
    expect(() => contour([1], { width: 0, height: 1 })).toThrow(
      'width must be a positive integer',
    )
    expect(() => contour([1], { width: 1, height: 1.5 })).toThrow(
      'height must be a positive integer',
    )
    expect(() => contour([1, 2], { width: 2, height: 2 })).toThrow(
      'source length must equal width * height (4)',
    )
  })

  it('preserves missing grid positions, field lineage, and structured output', () => {
    const rows = [
      { id: 0, speed: 0 },
      { id: 1, speed: 0 },
      { id: 2, speed: 0 },
      { id: 3, speed: 0 },
      { id: 4, speed: 0 },
      { id: 5, speed: 10 },
      { id: 6, speed: null },
      { id: 7, speed: 0 },
      { id: 8, speed: 0 },
      { id: 9, speed: 10 },
      { id: 10, speed: 10 },
      { id: 11, speed: 0 },
      { id: 12, speed: 0 },
      { id: 13, speed: 0 },
      { id: 14, speed: 0 },
      { id: 15, speed: 0 },
    ]
    const before = rows.map((row) => ({ ...row }))
    const fill = vi.fn(
      (datum: { value: number; sourceIndexes: readonly number[] }) =>
        datum.value === 5 ? '#2563eb' : '#93c5fd',
    )
    const mark = contour(rows, {
      width: 4,
      height: 4,
      value: 'speed',
      thresholds: [5],
      fill,
      stroke: '#fff',
      motion: { transition: { type: 'tween', duration: 60 } },
    })
    const scene = createChartScene(
      defineChart({
        marks: [mark],
        guides: false,
        focusRing: false,
        margin: { top: 11, right: 13, bottom: 17, left: 19 },
        color: { scale: scaleLinear<string>, range: ['#dbeafe', '#2563eb'] },
      }),
      { width: 320, height: 220 },
    )
    const group = contourGroup(scene.nodes)
    const areas = sceneAreas(scene.nodes)

    expect(mark.motion).toEqual({
      transition: { type: 'tween', duration: 60 },
    })
    expect(scene.points).toEqual([])
    expect(scene.colors.domain[0]).toBeLessThan(5)
    expect(scene.colors.domain.at(-1)).toBeGreaterThan(5)
    expect(group.translateX).toBe(scene.chart.x)
    expect(group.translateY).toBe(scene.chart.y)
    expect(group.clip).toEqual({
      x: 0,
      y: 0,
      width: scene.chart.width,
      height: scene.chart.height,
    })
    expect(areas).toHaveLength(1)
    expect(areas[0]?.path).toBeUndefined()
    expect(areas[0]?.points).toEqual([])
    expect(areas[0]?.polygons?.length).toBeGreaterThan(0)
    expect(fill).toHaveBeenCalledOnce()
    expect(fill.mock.calls[0]?.[0].sourceIndexes).toEqual([
      0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ])
    expect(rows).toEqual(before)
  })

  it('uses numeric identity values and projects row zero toward the bottom', () => {
    const scene = renderNumericContour([10, 10, 0, 0], {
      width: 2,
      height: 2,
      thresholds: [5],
      sceneWidth: 200,
      sceneHeight: 100,
    })
    const area = sceneAreas(scene.nodes)[0]
    const identity = parseContourKey(area?.key ?? '')[1]
    const yCoordinates =
      area?.polygons?.flatMap((polygon) =>
        polygon.flatMap((ring) => ring.map((point) => point[1])),
      ) ?? []

    expect(identity).toEqual(['explicit', 5, 0])
    expect(yCoordinates.length).toBeGreaterThan(0)
    expect(Math.min(...yCoordinates)).toBeGreaterThanOrEqual(
      scene.chart.height / 2,
    )
  })

  it('keeps generated identities through resize and scalar changes', () => {
    const values = [0, 1, 3, 0, 1, 5, 7, 1, 0, 2, 4, 0]
    const base = renderNumericContour(values, {
      width: 4,
      height: 3,
      thresholds: 4,
      sceneWidth: 240,
      sceneHeight: 160,
    })
    const resized = renderNumericContour(values, {
      width: 4,
      height: 3,
      thresholds: 4,
      sceneWidth: 480,
      sceneHeight: 240,
    })
    const changed = renderNumericContour(
      values.map((value) => value * 10),
      {
        width: 4,
        height: 3,
        thresholds: 4,
        sceneWidth: 240,
        sceneHeight: 160,
      },
    )
    const baseAreas = sceneAreas(base.nodes)
    const resizedAreas = sceneAreas(resized.nodes)

    expect(baseAreas.map(({ key }) => key)).toEqual(
      resizedAreas.map(({ key }) => key),
    )
    expect(baseAreas.map(({ polygons }) => polygons)).not.toEqual(
      resizedAreas.map(({ polygons }) => polygons),
    )
    expectOverlappingGeneratedKeys(
      baseAreas.map(({ key }) => key),
      sceneAreas(changed.nodes).map(({ key }) => key),
    )
  })

  it('distinguishes duplicate explicit levels and honors smoothing', () => {
    const values = [0, 0, 0, 0, 0, 10, 10, 0, 0, 10, 10, 0, 0, 0, 0, 0]
    const smooth = renderNumericContour(values, {
      width: 4,
      height: 4,
      thresholds: [3, 3],
      sceneWidth: 240,
      sceneHeight: 180,
      smooth: true,
    })
    const stepped = renderNumericContour(values, {
      width: 4,
      height: 4,
      thresholds: [3, 3],
      sceneWidth: 240,
      sceneHeight: 180,
      smooth: false,
    })

    expect(
      sceneAreas(smooth.nodes).map(({ key }) => parseContourKey(key)[1]),
    ).toEqual([
      ['explicit', 3, 0],
      ['explicit', 3, 1],
    ])
    expect(
      sceneAreas(smooth.nodes).map(({ polygons }) => polygons),
    ).not.toEqual(sceneAreas(stepped.nodes).map(({ polygons }) => polygons))
  })
})

function renderNumericContour(
  values: readonly number[],
  options: {
    width: number
    height: number
    thresholds: number | readonly number[]
    sceneWidth: number
    sceneHeight: number
    smooth?: boolean
  },
) {
  return createChartScene(
    defineChart({
      marks: [
        contour(values, {
          width: options.width,
          height: options.height,
          thresholds: options.thresholds,
          smooth: options.smooth,
        }),
      ],
      guides: false,
      focusRing: false,
      margin: 0,
      color: { scale: scaleLinear<string>, range: ['#dbeafe', '#2563eb'] },
    }),
    { width: options.sceneWidth, height: options.sceneHeight },
  )
}

function contourGroup(nodes: readonly SceneNode[]) {
  const group = findContourGroup(nodes)
  if (!group) throw new Error('contour group missing')
  return group
}

function findContourGroup(nodes: readonly SceneNode[]): SceneGroup | undefined {
  for (const node of nodes) {
    if (
      node.kind === 'group' &&
      node.className?.includes('ts-chart__contour')
    ) {
      return node
    }
    if (node.kind === 'group') {
      const nested = findContourGroup(node.children)
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

type ContourSceneKey = readonly [string, ContourLevelIdentity]

function parseContourKey(key: string): ContourSceneKey {
  return JSON.parse(key) as unknown as ContourSceneKey
}

function expectOverlappingGeneratedKeys(left: string[], right: string[]) {
  const leftIdentities = left.map((key) => parseContourKey(key)[1])
  const rightIdentities = right.map((key) => parseContourKey(key)[1])
  expect(leftIdentities.length).toBeGreaterThan(0)
  expect(rightIdentities.length).toBeGreaterThan(0)
  expect(
    [...leftIdentities, ...rightIdentities].every(
      (identity) => identity[0] === 'generated',
    ),
  ).toBe(true)
  const shorter = (
    leftIdentities.length <= rightIdentities.length
      ? leftIdentities
      : rightIdentities
  ).map((identity) => JSON.stringify(identity))
  const longer = new Set(
    (leftIdentities.length <= rightIdentities.length
      ? rightIdentities
      : leftIdentities
    ).map((identity) => JSON.stringify(identity)),
  )
  expect(shorter.every((identity) => longer.has(identity))).toBe(true)
}
