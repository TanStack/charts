import { scaleBand, scaleLinear, scalePoint, scaleUtc } from 'd3-scale'
import { curveBasis } from 'd3-shape'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { d3AreaXCurve } from './d3-area-x'
import { d3Curve } from './d3-shape'
import { motion } from './motion'
import { createChartScene, defineChart } from './scene'
import { renderChartSvg } from './svg'
import { svgChartRenderer } from './svg-surface'
import { violinX, violinY } from './violin'
import type { ChartMark, SceneArea, SceneNode } from './types'

interface Row {
  id: string
  species: string
  mass: number
  width: number | null
}

const rows: readonly Row[] = [
  { id: 'adelie:0', species: 'Adelie', mass: 3000, width: 0 },
  { id: 'adelie:1', species: 'Adelie', mass: 4000, width: 1 },
  { id: 'adelie:2', species: 'Adelie', mass: 5000, width: 0.25 },
  { id: 'gentoo:0', species: 'Gentoo', mass: 3000, width: 0.5 },
  { id: 'gentoo:1', species: 'Gentoo', mass: 4000, width: 1 },
  { id: 'gentoo:2', species: 'Gentoo', mass: 5000, width: 0.5 },
]

describe('violin marks', () => {
  it('derives mirrored vertical envelopes from semantic category centers', () => {
    const mark = violinY(rows, {
      id: 'mass-profile',
      x: 'species',
      y: 'mass',
      width: 'width',
      key: 'id',
      span: 0.8,
      fillOpacity: 0.4,
      strokeWidth: 2,
    })
    const definition = defineChart({
      marks: [mark],
      guides: false,
      focusRing: false,
      x: {
        scale: scalePoint<string>().domain(['Adelie', 'Chinstrap', 'Gentoo']),
      },
      y: { scale: scaleLinear().domain([3000, 5000]) },
    })
    const scene = createChartScene(definition, { width: 480, height: 300 })
    const resized = createChartScene(definition, { width: 720, height: 480 })
    const areas = sceneAreas(scene.nodes)
    const step = Math.abs(
      scene.scales.x.map('Chinstrap') - scene.scales.x.map('Adelie'),
    )

    expectTypeOf(mark).toEqualTypeOf<ChartMark<Row, string, number>>()
    expect(scene.scales.x.domain).toEqual(['Adelie', 'Chinstrap', 'Gentoo'])
    expect(scene.colors.domain).toEqual(['Adelie', 'Gentoo'])
    expect(areas).toHaveLength(2)
    expect(areas.map((area) => area.points.length)).toEqual([6, 6])
    expect(areas.every((area) => area.style?.fillOpacity === 0.4)).toBe(true)
    expect(areas.every((area) => area.style?.strokeWidth === 2)).toBe(true)
    expect(scene.points.map((point) => point.datum)).toEqual(rows)
    expect(scene.points.map((point) => point.datumIndex)).toEqual([
      0, 1, 2, 3, 4, 5,
    ])
    expect(
      scene.points.map(({ xValue, yValue }) => ({ xValue, yValue })),
    ).toEqual(rows.map((row) => ({ xValue: row.species, yValue: row.mass })))
    scene.points.forEach((point, index) => {
      const row = rows[index]!
      expect(point.x).toBe(scene.scales.x.map(row.species))
      expect(point.y).toBe(scene.scales.y.map(row.mass))
    })
    areas.forEach((area, groupIndex) => {
      const groupRows = rows.slice(groupIndex * 3, groupIndex * 3 + 3)
      groupRows.forEach((row, index) => {
        const positive = area.points[index]!
        const mirrored = area.points[area.points.length - 1 - index]!
        const center = scene.scales.x.map(row.species)
        const halfWidth = row.width! * 0.8 * step * 0.5
        expect(positive[0]).toBeCloseTo(center + halfWidth)
        expect(mirrored[0]).toBeCloseTo(center - halfWidth)
        expect(positive[1]).toBe(scene.scales.y.map(row.mass))
        expect(mirrored[1]).toBe(positive[1])
      })
    })
    expect(interactionPoints(areas[0])).toEqual(scene.points.slice(0, 3))
    expect(resized.points.map((point) => point.key)).toEqual(
      scene.points.map((point) => point.key),
    )
    expect(resized.points.map((point) => [point.x, point.y])).not.toEqual(
      scene.points.map((point) => [point.x, point.y]),
    )
  })

  it('transposes temporal profiles for violinX', () => {
    const at = [
      new Date('2026-01-01T00:00:00Z'),
      new Date('2026-01-02T00:00:00Z'),
    ] as const
    const temporal = [
      { id: 'a:0', category: 'A', at: at[0], width: 0.5 },
      { id: 'a:1', category: 'A', at: at[1], width: 1 },
      { id: 'b:0', category: 'B', at: at[0], width: 0.25 },
      { id: 'b:1', category: 'B', at: at[1], width: 0.75 },
    ]
    const mark = violinX(temporal, {
      x: 'at',
      y: 'category',
      width: 'width',
      key: 'id',
      span: 0.6,
      curve: d3Curve(curveBasis),
    })
    const scene = createChartScene(
      defineChart({
        marks: [mark],
        guides: false,
        focusRing: false,
        x: { scale: scaleUtc().domain(at) },
        y: { scale: scalePoint<string>().domain(['A', 'B']) },
      }),
      { width: 480, height: 300 },
    )
    const areas = sceneAreas(scene.nodes)
    const step = Math.abs(scene.scales.y.map('B') - scene.scales.y.map('A'))

    expectTypeOf(mark).toEqualTypeOf<
      ChartMark<(typeof temporal)[number], Date, string>
    >()
    expect(areas).toHaveLength(2)
    expect(areas.every((area) => area.path?.startsWith('M'))).toBe(true)
    expect(scene.points.map((point) => point.xValue)).toEqual([
      at[0],
      at[1],
      at[0],
      at[1],
    ])
    expect(scene.points.map((point) => point.yValue)).toEqual([
      'A',
      'A',
      'B',
      'B',
    ])
    temporal.forEach((row, index) => {
      const positive = areas[Math.floor(index / 2)]!.points[index % 2]!
      expect(positive[0]).toBe(scene.scales.x.map(row.at))
      expect(positive[1]).toBeCloseTo(
        scene.scales.y.map(row.category) - row.width * 0.6 * step * 0.5,
      )
    })
  })

  it('supports band scales and bounds singleton spans wider than one step', () => {
    const band = createChartScene(
      defineChart({
        marks: [
          violinY(rows, {
            x: 'species',
            y: 'mass',
            width: 'width',
          }),
        ],
        guides: false,
        focusRing: false,
        x: {
          scale: scaleBand<string>().domain(['Adelie', 'Gentoo']).padding(0.2),
        },
        y: { scale: scaleLinear().domain([3000, 5000]) },
      }),
      { width: 400, height: 240 },
    )
    const singleton = createChartScene(
      defineChart({
        marks: [
          violinY(rows.slice(0, 3), {
            x: 'species',
            y: 'mass',
            width: 'width',
            span: 2,
          }),
        ],
        guides: false,
        focusRing: false,
        x: { scale: scalePoint<string>().domain(['Adelie']) },
        y: { scale: scaleLinear().domain([3000, 5000]) },
      }),
      { width: 400, height: 240 },
    )

    expect(band.points).toHaveLength(rows.length)
    expect(sceneAreas(singleton.nodes)[0]!.points.every(([x]) => x >= 0)).toBe(
      true,
    )
    expect(
      sceneAreas(singleton.nodes)[0]!.points.every(([x]) => x <= 400),
    ).toBe(true)
  })

  it('uses the complete category domain when slots have no observations', () => {
    const sparse = rows.slice(0, 3)
    const domain = ['Adelie', 'Chinstrap', 'Gentoo']
    const scene = createChartScene(
      defineChart({
        marks: [
          violinY(sparse, {
            x: 'species',
            y: 'mass',
            width: 'width',
            span: 1,
          }),
        ],
        guides: false,
        focusRing: false,
        x: { scale: scalePoint<string>().domain(domain) },
        y: { scale: scaleLinear().domain([3000, 5000]) },
      }),
      { width: 400, height: 240 },
    )
    const area = sceneAreas(scene.nodes)[0]!
    const peak = area.points[1]!
    const center = scene.scales.x.map('Adelie')
    const step = scene.scales.x.map('Chinstrap') - center

    expect(peak[0]).toBeCloseTo(center + step / 2)
  })

  it('splits invalid samples while preserving surviving source identity', () => {
    const splitRows = [
      { id: 'a', category: 'A', value: 0, width: 0.5 },
      { id: 'gap-position', category: 'A', value: Number.NaN, width: 0.5 },
      { id: 'b', category: 'A', value: 2, width: 1 },
      { id: 'gap-width', category: 'A', value: 3, width: Number.NaN },
      { id: 'c', category: 'A', value: 4, width: 0.25 },
    ]
    const scene = createChartScene(
      defineChart({
        marks: [
          violinY(splitRows, {
            id: 'split',
            x: 'category',
            y: 'value',
            width: 'width',
            key: 'id',
          }),
        ],
        guides: false,
        focusRing: false,
        x: { scale: scalePoint<string>().domain(['A']) },
        y: { scale: scaleLinear().domain([0, 4]) },
      }),
      { width: 400, height: 240 },
    )

    expect(sceneAreas(scene.nodes)).toHaveLength(3)
    expect(scene.points.map((point) => point.datum)).toEqual([
      splitRows[0],
      splitRows[2],
      splitRows[4],
    ])
    expect(scene.points.map((point) => point.datumIndex)).toEqual([0, 2, 4])
  })

  it('uses one closed curve path for the mirrored envelope', () => {
    const curve = d3AreaXCurve(curveBasis)
    const scene = createChartScene(
      defineChart({
        marks: [
          violinY(rows.slice(0, 3), {
            id: 'curved-violin',
            x: 'species',
            y: 'mass',
            width: 'width',
            curve,
            stroke: null,
          }),
        ],
        guides: false,
        focusRing: false,
        x: { scale: scalePoint<string>().domain(['Adelie']) },
        y: { scale: scaleLinear().domain([3000, 5000]) },
      }),
      { width: 400, height: 240 },
    )
    const area = sceneAreas(scene.nodes)[0]!
    const midpoint = area.points.length / 2
    const right = area.points.slice(0, midpoint)
    const left = area.points.slice(midpoint).reverse()
    const svg = renderChartSvg(scene, { ariaLabel: 'Curved violin' })

    expect(area.path).toMatch(/^M.*Z$/)
    expect(area.path).toBe(curve.areaX(right, left))
    expect(area.style?.stroke).toBeUndefined()
    expect(svg).toContain(
      'class="ts-chart__area ts-chart__violin ts-chart__violin-y"',
    )
    expect(svg).toContain(`d="${area.path}"`)
  })

  it('applies area states without changing the envelope paint roles', () => {
    const scene = createChartScene(
      defineChart({
        marks: [
          violinY(rows.slice(0, 3), {
            id: 'stateful-violin',
            x: 'species',
            y: 'mass',
            width: 'width',
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
        x: { scale: scalePoint<string>().domain(['Adelie']) },
        y: { scale: scaleLinear().domain([3000, 5000]) },
      }),
      { width: 400, height: 240 },
    )
    const container = document.createElement('div')
    const surface = svgChartRenderer.mount(container, () => {})
    surface.render(scene, { ariaLabel: 'Stateful violin' })
    const path = container.querySelector<SVGPathElement>(
      '.ts-chart__violin path',
    )!
    const fill = path.getAttribute('fill')
    const stroke = path.getAttribute('stroke')

    surface.paintFocus({
      primary: scene.points[1]!,
      group: [scene.points[1]!],
      source: 'pointer',
      pinned: false,
    })

    expect(path.getAttribute('opacity')).toBe('0.25')
    expect(path.getAttribute('fill')).toBe(fill)
    expect(path.getAttribute('stroke')).toBe(stroke)
    surface.destroy()
  })

  it('interpolates keyed envelope paths when widths change', () => {
    const makeScene = (widths: readonly number[]) =>
      createChartScene(
        defineChart({
          marks: [
            violinY(
              rows.slice(0, 3).map((row, index) => ({
                ...row,
                width: widths[index]!,
              })),
              {
                id: 'moving-violin',
                x: 'species',
                y: 'mass',
                width: 'width',
                key: 'id',
                curve: d3AreaXCurve(curveBasis),
              },
            ),
          ],
          guides: false,
          focusRing: false,
          x: { scale: scalePoint<string>().domain(['Adelie']) },
          y: { scale: scaleLinear().domain([3000, 5000]) },
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
    surface.render(first, { ariaLabel: 'Moving violin' })
    const sourcePath = container
      .querySelector('.ts-chart__violin path')
      ?.getAttribute('d')
    const target = document.createElement('div')
    target.innerHTML = renderChartSvg(next, { ariaLabel: 'Moving violin' })
    const targetPath = target
      .querySelector('.ts-chart__violin path')
      ?.getAttribute('d')
    const frames = installManagedFrames()
    surface.render(next, { ariaLabel: 'Moving violin' })

    frames.run(0)
    frames.run(50)
    const halfwayPath = container
      .querySelector('.ts-chart__violin path')
      ?.getAttribute('d')
    expect(halfwayPath).not.toBe(sourcePath)
    expect(halfwayPath).not.toBe(targetPath)
    frames.run(100)
    expect(
      container.querySelector('.ts-chart__violin path')?.getAttribute('d'),
    ).toBe(targetPath)
    surface.destroy()
    frames.restore()
  })

  it('rejects invalid normalized widths, spans, and category scales', () => {
    expect(() =>
      violinY(rows, {
        x: 'species',
        y: 'mass',
        width: 'width',
        span: 0,
      }),
    ).toThrow('span must be a positive finite number')

    const render = (width: number) =>
      createChartScene(
        defineChart({
          marks: [
            violinY([{ category: 'A', value: 1, width }], {
              x: 'category',
              y: 'value',
              width: 'width',
            }),
          ],
          guides: false,
          focusRing: false,
          x: { scale: scalePoint<string>().domain(['A']) },
          y: { scale: scaleLinear().domain([0, 2]) },
        }),
        { width: 240, height: 160 },
      )

    expect(() => render(-0.1)).toThrow('width must be between 0 and 1')
    expect(() => render(1.1)).toThrow('width must be between 0 and 1')
    expect(() =>
      createChartScene(
        defineChart({
          marks: [
            violinY([{ category: 1, value: 1, width: 0.5 }], {
              x: 'category',
              y: 'value',
              width: 'width',
            }),
          ],
          guides: false,
          focusRing: false,
          x: { scale: scaleLinear().domain([0, 2]) },
          y: { scale: scaleLinear().domain([3000, 5000]) },
        }),
        { width: 240, height: 160 },
      ),
    ).toThrow('category axis requires a band or point scale')
  })
})

if (false) {
  const vertical = violinY(rows, {
    x: 'species',
    y: 'mass',
    width: 'width',
  })

  expectTypeOf(vertical).toEqualTypeOf<ChartMark<Row, string, number>>()

  // @ts-expect-error Violin profile positions must be numeric or temporal.
  violinY(rows, { x: 'species', y: 'id', width: 'width' })

  violinY(rows, {
    // @ts-expect-error Violin categories are numeric or string keys, not dates.
    x: () => new Date('2026-01-01T00:00:00Z'),
    y: 'mass',
    width: 'width',
  })

  // @ts-expect-error Violin widths must be numeric.
  violinY(rows, { x: 'species', y: 'mass', width: 'id' })
}

function sceneAreas(nodes: readonly SceneNode[]): SceneArea[] {
  return flatten(nodes).filter(
    (node): node is SceneArea => node.kind === 'area',
  )
}

function interactionPoints(node: SceneArea) {
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
