import { scaleBand, scaleLinear, scalePoint, scaleUtc } from 'd3-scale'
import { curveBasis } from 'd3-shape'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { d3Curve } from './d3-shape'
import { motion } from './motion'
import { ridgelineX, ridgelineY } from './ridgeline'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import { svgChartRenderer } from './svg-surface'
import type {
  ChartMark,
  ChartScale,
  SceneArea,
  SceneNode,
  ScenePolyline,
} from './types'

interface Row {
  id: string
  season: number
  rating: number
  height: number | null
}

const rows: readonly Row[] = [
  { id: '10:0', season: 10, rating: 4, height: 0 },
  { id: '10:1', season: 10, rating: 5, height: 0.5 },
  { id: '10:2', season: 10, rating: 6, height: 1 },
  { id: '20:0', season: 20, rating: 4, height: 0.25 },
  { id: '20:1', season: 20, rating: 5, height: 1 },
  { id: '20:2', season: 20, rating: 6, height: 0.25 },
]

describe('ridgeline marks', () => {
  it('derives horizontal ridge geometry from semantic category baselines', () => {
    const mark = ridgelineY(rows, {
      id: 'ratings',
      x: 'rating',
      y: 'season',
      height: 'height',
      key: 'id',
      overlap: 0.75,
      fillOpacity: 0.4,
      strokeWidth: 2,
    })
    const definition = defineChart({
      marks: [mark],
      guides: false,
      focusRing: false,
      x: { scale: scaleLinear().domain([4, 6]) },
      y: { scale: scalePoint<number>().domain([10, 20]).padding(0.75) },
    })
    const scene = createChartScene(definition, { width: 480, height: 300 })
    const resized = createChartScene(definition, { width: 720, height: 480 })
    const areas = nodesOf(scene.nodes, 'area')
    const lines = nodesOf(scene.nodes, 'polyline')
    const step = Math.abs(scene.scales.y.map(20) - scene.scales.y.map(10))

    expectTypeOf(mark).toEqualTypeOf<ChartMark<Row, number, number>>()
    expect(scene.scales.y.domain).toEqual([10, 20])
    expect(scene.colors.domain).toEqual([10, 20])
    expect(areas).toHaveLength(2)
    expect(lines).toHaveLength(2)
    expect(
      flatten(scene.nodes)
        .filter((node) => node.kind === 'area' || node.kind === 'polyline')
        .map((node) => node.kind),
    ).toEqual(['area', 'area', 'polyline', 'polyline'])
    expect(areas.map((area) => area.points.length)).toEqual([6, 6])
    expect(scene.points).toHaveLength(rows.length)
    expect(scene.points.map((point) => point.datum)).toEqual(rows)
    expect(scene.points.map((point) => point.datumIndex)).toEqual([
      0, 1, 2, 3, 4, 5,
    ])
    expect(
      scene.points.map(({ xValue, yValue }) => ({ xValue, yValue })),
    ).toEqual(rows.map((row) => ({ xValue: row.rating, yValue: row.season })))
    scene.points.forEach((point, index) => {
      const row = rows[index]!
      expect(point.x).toBe(scene.scales.x.map(row.rating))
      expect(point.y).toBeCloseTo(
        scene.scales.y.map(row.season) - row.height! * 0.75 * step,
      )
      expect(point.y).toBeGreaterThanOrEqual(scene.chart.y)
      expect(point.y).toBeLessThanOrEqual(scene.chart.y + scene.chart.height)
    })
    expect(interactionPoints(areas[0])).toEqual(scene.points.slice(0, 3))
    expect(interactionPoints(lines[0])).toEqual(scene.points.slice(0, 3))
    expect(areas.every((area) => area.style?.fillOpacity === 0.4)).toBe(true)
    expect(lines.every((line) => line.style?.strokeWidth === 2)).toBe(true)
    expect(resized.points.map((point) => point.key)).toEqual(
      scene.points.map((point) => point.key),
    )
    expect(resized.points.map((point) => [point.x, point.y])).not.toEqual(
      scene.points.map((point) => [point.x, point.y]),
    )
  })

  it('transposes categorical baselines and temporal positions for ridgelineX', () => {
    const at = [
      new Date('2026-01-01T00:00:00Z'),
      new Date('2026-01-02T00:00:00Z'),
    ] as const
    const temporal = [
      { id: 'a:0', category: 'A', at: at[0], height: 0 },
      { id: 'a:1', category: 'A', at: at[1], height: 1 },
      { id: 'b:0', category: 'B', at: at[0], height: 0.5 },
      { id: 'b:1', category: 'B', at: at[1], height: 1 },
    ]
    const mark = ridgelineX(temporal, {
      id: 'temporal',
      x: 'category',
      y: 'at',
      height: 'height',
      key: 'id',
      overlap: 1.25,
    })
    const scene = createChartScene(
      defineChart({
        marks: [mark],
        guides: false,
        focusRing: false,
        x: { scale: scalePoint<string>().domain(['A', 'B']).padding(0.5) },
        y: { scale: scaleUtc().domain(at) },
      }),
      { width: 480, height: 300 },
    )
    const step = Math.abs(scene.scales.x.map('B') - scene.scales.x.map('A'))

    expectTypeOf(mark).toEqualTypeOf<
      ChartMark<(typeof temporal)[number], string, Date>
    >()
    expect(nodesOf(scene.nodes, 'area')).toHaveLength(2)
    expect(nodesOf(scene.nodes, 'polyline')).toHaveLength(2)
    expect(scene.points.map((point) => point.xValue)).toEqual([
      'A',
      'A',
      'B',
      'B',
    ])
    expect(scene.points.map((point) => point.yValue)).toEqual([
      at[0],
      at[1],
      at[0],
      at[1],
    ])
    scene.points.forEach((point, index) => {
      const row = temporal[index]!
      expect(point.x).toBeCloseTo(
        scene.scales.x.map(row.category) + row.height * 1.25 * step,
      )
      expect(point.y).toBe(scene.scales.y.map(row.at))
    })
  })

  it('supports band scales and a bounded single-category fallback', () => {
    const twoCategories = createChartScene(
      defineChart({
        marks: [
          ridgelineY(rows, {
            x: 'rating',
            y: 'season',
            height: 'height',
          }),
        ],
        guides: false,
        focusRing: false,
        x: { scale: scaleLinear().domain([4, 6]) },
        y: { scale: scaleBand<number>().domain([10, 20]).padding(0.2) },
      }),
      { width: 400, height: 240 },
    )
    const singleRows = rows.slice(0, 3)
    const single = createChartScene(
      defineChart({
        marks: [
          ridgelineY(singleRows, {
            x: 'rating',
            y: 'season',
            height: 'height',
            overlap: 2,
          }),
        ],
        guides: false,
        focusRing: false,
        x: { scale: scaleLinear().domain([4, 6]) },
        y: { scale: scalePoint<number>().domain([10]).padding(0.5) },
      }),
      { width: 400, height: 240 },
    )

    expect(twoCategories.points).toHaveLength(rows.length)
    expect(single.points).toHaveLength(singleRows.length)
    expect(single.points.every((point) => Number.isFinite(point.y))).toBe(true)
    expect(single.points.every((point) => point.y >= 0 && point.y <= 240)).toBe(
      true,
    )
  })

  it('derives category step from the configured domain, including empty slots', () => {
    const sparse = rows.filter((row) => row.season === 10)
    const domain = [10, 15, 20]
    const scene = createChartScene(
      defineChart({
        marks: [
          ridgelineY(sparse, {
            x: 'rating',
            y: 'season',
            height: 'height',
          }),
        ],
        guides: false,
        focusRing: false,
        x: { scale: scaleLinear().domain([4, 6]) },
        y: { scale: scalePoint<number>().domain(domain) },
      }),
      { width: 400, height: 240 },
    )
    const peak = scene.points.find((point) => point.datum.height === 1)!
    const domainStep = Math.abs(
      scene.scales.y.map(domain[1]!) - scene.scales.y.map(domain[0]!),
    )

    expect(peak.y).toBeCloseTo(scene.scales.y.map(10) - domainStep)
  })

  it('accepts a custom point scale contract', () => {
    const pointScale: ChartScale = {
      id: 'custom-point',
      resolve: ({ id, range }) => {
        const domain = [10, 20]
        const map = (value: unknown) =>
          value === 10 ? range[0] : value === 20 ? range[1] : Number.NaN
        return {
          id,
          type: 'point',
          domain,
          map,
          ticks: domain.map((value) => ({
            value,
            position: map(value),
            label: String(value),
          })),
          bandwidth: 0,
        }
      },
    }
    const scene = createChartScene(
      defineChart({
        marks: [
          ridgelineY(rows, {
            x: 'rating',
            y: 'season',
            height: 'height',
          }),
        ],
        guides: false,
        focusRing: false,
        x: { scale: scaleLinear().domain([4, 6]) },
        y: { scale: pointScale },
      }),
      { width: 400, height: 240 },
    )

    expect(scene.points).toHaveLength(rows.length)
    expect(scene.scales.y.type).toBe('point')
  })

  it('splits invalid profile observations without changing surviving datum identity', () => {
    const splitRows = [
      { id: 'a', category: 'A', x: 0, height: 0.5 },
      { id: 'gap-x', category: 'A', x: Number.NaN, height: 0.5 },
      { id: 'b', category: 'A', x: 2, height: 1 },
      { id: 'gap-height', category: 'A', x: 3, height: Number.NaN },
      { id: 'c', category: 'A', x: 4, height: 0.25 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          ridgelineY(splitRows, {
            id: 'split',
            x: 'x',
            y: 'category',
            height: 'height',
            key: 'id',
          }),
        ],
        guides: false,
        focusRing: false,
        x: { scale: scaleLinear().domain([0, 4]) },
        y: { scale: scalePoint<string>().domain(['A']) },
      }),
      { width: 400, height: 240 },
    )

    expect(nodesOf(scene.nodes, 'area')).toHaveLength(3)
    expect(nodesOf(scene.nodes, 'polyline')).toHaveLength(3)
    expect(scene.points.map((point) => point.datum)).toEqual([
      splitRows[0],
      splitRows[2],
      splitRows[4],
    ])
    expect(scene.points.map((point) => point.datumIndex)).toEqual([0, 2, 4])
  })

  it('uses one curve path for the fill and outline and can omit the outline', () => {
    const curved = createChartScene(
      defineChart({
        marks: [
          ridgelineY(rows.slice(0, 3), {
            id: 'curve',
            x: 'rating',
            y: 'season',
            height: 'height',
            curve: d3Curve(curveBasis),
          }),
        ],
        guides: false,
        focusRing: false,
        x: { scale: scaleLinear().domain([4, 6]) },
        y: { scale: scalePoint<number>().domain([10]) },
      }),
      { width: 400, height: 240 },
    )
    const area = nodesOf(curved.nodes, 'area')[0]!
    const line = nodesOf(curved.nodes, 'polyline')[0]!
    const areaOnly = createChartScene(
      defineChart({
        marks: [
          ridgelineY(rows.slice(0, 3), {
            x: 'rating',
            y: 'season',
            height: 'height',
            stroke: null,
          }),
        ],
        guides: false,
        focusRing: false,
        x: { scale: scaleLinear().domain([4, 6]) },
        y: { scale: scalePoint<number>().domain([10]) },
      }),
      { width: 400, height: 240 },
    )
    const svg = renderChartSvg(curved, { ariaLabel: 'Curved ridge' })

    expect(area.path).toMatch(/^M.*Z$/)
    expect(line.path).toMatch(/^M/)
    expect(area.path).toContain(line.path!)
    expect(svg).toContain('class="ts-chart__ridgeline ts-chart__ridgeline-y"')
    expect(svg).toContain('class="ts-chart__area"')
    expect(svg).toContain('class="ts-chart__line"')
    expect(svg).toContain(`d="${area.path}"`)
    expect(nodesOf(areaOnly.nodes, 'area')).toHaveLength(1)
    expect(nodesOf(areaOnly.nodes, 'polyline')).toHaveLength(0)
  })

  it('applies cross-role state opacity without changing fill or stroke roles', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          ridgelineY(rows.slice(0, 3), {
            id: 'stateful-ridge',
            x: 'rating',
            y: 'season',
            height: 'height',
            states: [
              {
                when: { focus: 'primary' },
                style: { opacity: 0.25 },
              },
            ],
          }),
        ],
        guides: false,
        focusRing: false,
        x: { scale: scaleLinear().domain([4, 6]) },
        y: { scale: scalePoint<number>().domain([10]) },
      }),
      { width: 400, height: 240 },
    )
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Stateful ridge' })
    const paths = [
      ...container.querySelectorAll<SVGPathElement>(
        '.ts-chart__ridgeline path',
      ),
    ]
    const fills = paths.map((path) => path.getAttribute('fill'))
    const strokes = paths.map((path) => path.getAttribute('stroke'))

    surface.paintFocus({
      primary: scene.points[1]!,
      group: [scene.points[1]!],
      source: 'pointer',
      pinned: false,
    })

    expect(paths).toHaveLength(2)
    expect(paths.map((path) => path.getAttribute('opacity'))).toEqual([
      '0.25',
      '0.25',
    ])
    expect(paths.map((path) => path.getAttribute('fill'))).toEqual(fills)
    expect(paths.map((path) => path.getAttribute('stroke'))).toEqual(strokes)
    surface.destroy()
  })

  it('moves presentation points with keyed ridge path updates', () => {
    const makeScene = (heights: readonly number[]) =>
      createChartScene(
        defineChart({
          marks: [
            ridgelineY(
              rows.slice(0, 3).map((row, index) => ({
                ...row,
                height: heights[index]!,
              })),
              {
                id: 'moving-ridge',
                x: 'rating',
                y: 'season',
                height: 'height',
                key: 'id',
              },
            ),
          ],
          guides: false,
          focusRing: false,
          x: { scale: scaleLinear().domain([4, 6]) },
          y: { scale: scalePoint<number>().domain([10]) },
        }),
        { width: 400, height: 240 },
      )
    const first = makeScene([0, 0.25, 0.5])
    const next = makeScene([0, 0.75, 1])
    const container = document.createElement('div')
    const surface = motion({
      initial: false,
      transition: { type: 'tween', duration: 100, easing: 'linear' },
    }).mount(container, () => {})
    surface.render(first, { ariaLabel: 'Moving ridge' })
    const sourcePath = container
      .querySelector('.ts-chart__ridgeline path')
      ?.getAttribute('d')
    const target = document.createElement('div')
    target.innerHTML = renderChartSvg(next, { ariaLabel: 'Moving ridge' })
    const targetPath = target
      .querySelector('.ts-chart__ridgeline path')
      ?.getAttribute('d')
    const frames = installManagedFrames()
    surface.render(next, { ariaLabel: 'Moving ridge' })

    frames.run(0)
    frames.run(50)
    const halfwayPath = container
      .querySelector('.ts-chart__ridgeline path')
      ?.getAttribute('d')
    expect(halfwayPath).not.toBe(sourcePath)
    expect(halfwayPath).not.toBe(targetPath)
    expect(surface.getPresentationPoints?.()?.[1]?.y).toBeCloseTo(
      (first.points[1]!.y + next.points[1]!.y) / 2,
    )
    frames.run(100)
    expect(surface.getPresentationPoints?.()).toBeUndefined()
    surface.destroy()
    frames.restore()
  })

  it('rejects invalid normalized heights, overlap, and category scales', () => {
    expect(() =>
      ridgelineY(rows, {
        x: 'rating',
        y: 'season',
        height: 'height',
        overlap: 0,
      }),
    ).toThrow('overlap must be a positive finite number')

    const render = (height: number) =>
      createChartScene(
        defineChart({
          marks: [
            ridgelineY([{ x: 1, category: 'A', height }], {
              x: 'x',
              y: 'category',
              height: 'height',
            }),
          ],
          guides: false,
          focusRing: false,
          x: { scale: scaleLinear().domain([0, 2]) },
          y: { scale: scalePoint<string>().domain(['A']) },
        }),
        { width: 240, height: 160 },
      )

    expect(() => render(-0.1)).toThrow('height must be between 0 and 1')
    expect(() => render(1.1)).toThrow('height must be between 0 and 1')
    expect(() =>
      createChartScene(
        defineChart({
          marks: [
            ridgelineY(rows, {
              x: 'rating',
              y: 'season',
              height: 'height',
            }),
          ],
          guides: false,
          focusRing: false,
          x: { scale: scaleLinear().domain([4, 6]) },
          y: { scale: scaleLinear().domain([10, 20]) },
        }),
        { width: 240, height: 160 },
      ),
    ).toThrow('category axis requires a band or point scale')
  })
})

if (false) {
  const vertical = ridgelineY(rows, {
    x: 'rating',
    y: 'season',
    height: 'height',
  })

  expectTypeOf(vertical).toEqualTypeOf<ChartMark<Row, number, number>>()

  // @ts-expect-error Ridgeline positions must be numeric or temporal.
  ridgelineY(rows, { x: 'id', y: 'season', height: 'height' })

  // @ts-expect-error Ridgeline categories must be numeric or string chart keys.
  ridgelineY(rows, { x: 'rating', y: () => true, height: 'height' })

  ridgelineY(rows, {
    x: 'rating',
    // @ts-expect-error Ridgeline categories are numeric or string keys, not dates.
    y: () => new Date('2026-01-01T00:00:00Z'),
    height: 'height',
  })

  // @ts-expect-error Ridgeline heights must be numeric.
  ridgelineY(rows, { x: 'rating', y: 'season', height: 'id' })

  ridgelineY(rows, {
    x: 'rating',
    y: 'season',
    height: 'height',
    states: [
      {
        when: { focus: 'primary' },
        style: {
          // @ts-expect-error Composite ridge states cannot recolor one geometry role.
          fill: '#2563eb',
        },
      },
    ],
  })
}

function nodesOf<TKind extends 'area' | 'polyline'>(
  nodes: readonly SceneNode[],
  kind: TKind,
): TKind extends 'area' ? SceneArea[] : ScenePolyline[] {
  return flatten(nodes).filter(
    (node) => node.kind === kind,
  ) as TKind extends 'area' ? SceneArea[] : ScenePolyline[]
}

function interactionPoints(node: SceneArea | ScenePolyline) {
  const interaction = node.interaction
  return interaction && 'points' in interaction ? interaction.points : undefined
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}

function installManagedFrames() {
  const callbacks = new Map<number, FrameRequestCallback>()
  let handle = 0
  const request = vi
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((callback) => {
      handle += 1
      callbacks.set(handle, callback)
      return handle
    })
  const cancel = vi
    .spyOn(window, 'cancelAnimationFrame')
    .mockImplementation((frame) => {
      if (frame !== null && frame !== undefined) callbacks.delete(frame)
    })
  return {
    run(time: number) {
      const next = callbacks.entries().next().value as
        [number, FrameRequestCallback] | undefined
      if (!next) throw new Error(`No animation frame scheduled at ${time}ms`)
      callbacks.delete(next[0])
      next[1](time)
    },
    restore() {
      request.mockRestore()
      cancel.mockRestore()
    },
  }
}
