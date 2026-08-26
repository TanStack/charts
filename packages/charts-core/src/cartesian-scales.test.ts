import { scaleBand, scaleLinear } from 'd3-scale'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { crosshair } from './crosshair'
import { lineY } from './line'
import { createChartScene, defineChart } from './scene'
import type { SceneNode, SceneRule } from './types'

const legacyScaleWarning =
  '[TanStack Charts] Root `x` and `y` options are deprecated. Move them to `scales.x` and `scales.y`. When neither Cartesian scale is used, set `scales` to `{ x: null, y: null }`. This compatibility will be removed when TanStack Charts enters Alpha.'

describe('Cartesian scale registry', () => {
  it('renders legacy root scales and warns once with migration guidance', async () => {
    vi.resetModules()
    const freshScene = await import('./scene')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const definition = freshScene.defineChart({
      marks: [lineY([2, 4, 6])],
      x: { scale: scaleLinear().domain([0, 2]) },
      y: { scale: scaleLinear().domain([0, 6]) },
    })

    const first = freshScene.createChartScene(definition, {
      width: 480,
      height: 260,
    })
    freshScene.createChartScene(definition, { width: 640, height: 320 })

    expect(first.points).toHaveLength(3)
    expect(first.scales.x?.domain).toEqual([0, 2])
    expect(first.scales.y?.domain).toEqual([0, 6])
    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(legacyScaleWarning)
  })

  it('warns when a scale-free legacy definition omits the registry', async () => {
    vi.resetModules()
    const freshScene = await import('./scene')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    freshScene.createChartScene(freshScene.defineChart({ marks: [] }), {
      width: 320,
      height: 180,
    })

    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(legacyScaleWarning)
  })

  it('warns in browsers without a process global', async () => {
    vi.resetModules()
    const freshScene = await import('./scene')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const nodeProcess = globalThis.process
    vi.stubGlobal('process', undefined)

    try {
      freshScene.createChartScene(
        freshScene.defineChart({
          marks: [lineY([1, 2, 3])],
          x: { scale: scaleLinear().domain([0, 2]) },
          y: { scale: scaleLinear().domain([0, 3]) },
        }),
        { width: 480, height: 260 },
      )
    } finally {
      vi.stubGlobal('process', nodeProcess)
    }

    expect(warn).toHaveBeenCalledWith(legacyScaleWarning)
  })

  it('removes the full legacy warning from production bundles', async () => {
    const output = execFileSync(
      resolve('node_modules/.bin/esbuild'),
      [
        resolve('packages/charts-core/src/scene.ts'),
        '--bundle',
        '--platform=browser',
        '--format=esm',
        '--minify',
        '--define:process.env.NODE_ENV="production"',
      ],
      { encoding: 'utf8' },
    )

    expect(output).not.toContain(legacyScaleWarning)
  })

  it('binds marks to named y scales and stacks axes sharing the right side', () => {
    const scene = createNamedScaleScene()
    const percentPoint = scene.points.find(
      (point) => point.markId === 'percent',
    )
    const rules = flatten(scene.nodes).filter(
      (node): node is SceneRule => node.kind === 'rule',
    )
    const percentAxis = rules.find((node) => node.key === 'percent-axis')
    const temperatureAxis = rules.find(
      (node) => node.key === 'temperature-axis',
    )
    if (!percentAxis || !temperatureAxis) {
      throw new Error('Expected both named right-side axes')
    }

    expect(scene.scales.percent?.domain).toEqual([0, 1])
    expect(percentPoint?.y).toBe(scene.scales.percent?.map(0.5))
    expect(percentPoint?.y).not.toBe(scene.scales.y?.map(0.5))
    expect(percentAxis.x1).toBe(scene.chart.x + scene.chart.width)
    expect(temperatureAxis.x1).toBeGreaterThan(percentAxis.x1)
  })

  it('supports top, right, bottom, and left axis sides', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([1, 2])],
        scales: {
          x: { scale: scaleLinear().domain([0, 1]), side: 'bottom' },
          y: { scale: scaleLinear().domain([0, 2]), side: 'left' },
          top: {
            channel: 'x',
            side: 'top',
            scale: scaleLinear().domain([0, 1]),
          },
          right: {
            channel: 'y',
            side: 'right',
            scale: scaleLinear().domain([0, 2]),
          },
        },
      }),
      { width: 480, height: 260 },
    )
    const rules = flatten(scene.nodes).filter(
      (node): node is SceneRule => node.kind === 'rule',
    )

    expect(rules.find((node) => node.key === 'top-axis')?.y1).toBe(
      scene.chart.y,
    )
    expect(rules.find((node) => node.key === 'right-axis')?.x1).toBe(
      scene.chart.x + scene.chart.width,
    )
    expect(rules.find((node) => node.key === 'x-axis')?.y1).toBe(
      scene.chart.y + scene.chart.height,
    )
    expect(rules.find((node) => node.key === 'y-axis')?.x1).toBe(scene.chart.x)
  })

  it('keeps named grids off by default', () => {
    const keys = flatten(createNamedScaleScene().nodes).map((node) => node.key)

    expect(keys.some((key) => key.startsWith('y-grid:'))).toBe(true)
    expect(keys.some((key) => key.startsWith('percent-grid:'))).toBe(false)
    expect(keys.some((key) => key.startsWith('temperature-grid:'))).toBe(false)
  })

  it('renders an enabled grid when its axis is disabled', () => {
    const scene = createChartScene(
      defineChart({
        marks: [lineY([1, 2, 3])],
        scales: {
          x: { scale: scaleLinear().domain([0, 2]) },
          y: {
            scale: scaleLinear().domain([0, 3]),
            axis: false,
            grid: true,
          },
        },
      }),
      { width: 480, height: 260 },
    )
    const keys = flatten(scene.nodes).map((node) => node.key)

    expect(keys.some((key) => key.startsWith('y-grid:'))).toBe(true)
    expect(keys).not.toContain('y-axis')
  })

  it('reports missing, reserved, and mismatched scale bindings', () => {
    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY([1, 2, 3], { yScale: 'missing' })],
          scales: {
            x: { scale: scaleLinear().domain([0, 2]) },
            y: { scale: scaleLinear().domain([0, 3]) },
          },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrowError(
      'Chart scale "missing" is used by a mark but is not configured',
    )

    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY([1, 2, 3], { yScale: 'color' })],
          scales: {
            x: { scale: scaleLinear().domain([0, 2]) },
            y: { scale: scaleLinear().domain([0, 3]) },
          },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrowError('Position scales cannot use reserved ID "color"')

    expect(() =>
      createChartScene(
        defineChart({
          marks: [lineY([1, 2, 3], { yScale: 'alternate' })],
          scales: {
            x: { scale: scaleLinear().domain([0, 2]) },
            y: { scale: scaleLinear().domain([0, 3]) },
            alternate: {
              channel: 'x',
              scale: scaleLinear().domain([0, 3]),
            },
          },
        }),
        { width: 480, height: 260 },
      ),
    ).toThrowError(
      'Chart scale "alternate" is configured for x but is used as y',
    )
  })

  it('validates named channels, reserved channels, and axis sides', () => {
    expect(() =>
      createChartScene(
        defineChart({
          marks: [],
          scales: {
            x: null,
            y: null,
            alternate: { scale: scaleLinear() },
          },
        }),
        { width: 200, height: 120 },
      ),
    ).toThrowError(
      'Named chart scale "alternate" requires channel: "x" or channel: "y"',
    )

    expect(() =>
      createChartScene(
        defineChart({
          marks: [],
          scales: {
            x: { channel: 'y', scale: scaleLinear() },
            y: null,
          },
        }),
        { width: 200, height: 120 },
      ),
    ).toThrowError('Chart scale "x" is configured for x but is used as y')

    expect(() =>
      createChartScene(
        defineChart({
          marks: [],
          scales: {
            x: null,
            y: null,
            alternate: {
              channel: 'x',
              side: 'left',
              scale: scaleLinear(),
            },
          },
        }),
        { width: 200, height: 120 },
      ),
    ).toThrowError(
      'Chart scale "alternate" uses x and cannot render an axis on the left side',
    )
  })

  it('does not replace canonical null scales with legacy root values', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const scene = createChartScene(
      defineChart({
        marks: [],
        guides: false,
        scales: { x: null, y: null },
        x: { scale: scaleLinear().domain([0, 10]) },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x?.type).toBe('none')
    expect(scene.scales.y?.type).toBe('none')
  })

  it('allows focus-guide-only marks to bind null scales', () => {
    const scene = createChartScene(
      defineChart({
        marks: [crosshair({ x: true, y: true })],
        guides: false,
        scales: { x: null, y: null },
      }),
      { width: 480, height: 260 },
    )

    expect(scene.scales.x?.type).toBe('none')
    expect(scene.scales.y?.type).toBe('none')
    expect(scene.focusGuides).toHaveLength(1)
  })

  it('keeps stacked empty-domain axes inside the scene', () => {
    const scene = createChartScene(
      defineChart({
        marks: [],
        scales: {
          x: null,
          y: { scale: scaleBand<string>().domain([]) },
          alternate: {
            channel: 'y',
            side: 'left',
            scale: scaleBand<string>().domain([]),
          },
        },
      }),
      { width: 200, height: 120 },
    )
    const axes = flatten(scene.nodes).filter(
      (node): node is SceneRule =>
        node.kind === 'rule' &&
        (node.key === 'y-axis' || node.key === 'alternate-axis'),
    )

    expect(axes).toHaveLength(2)
    expect(axes.every((axis) => axis.x1 >= 0 && axis.x2 >= 0)).toBe(true)
  })
})

function createNamedScaleScene() {
  return createChartScene(
    defineChart({
      marks: [
        lineY([{ x: 0, y: 25 }], { id: 'primary', x: 'x', y: 'y' }),
        lineY([{ x: 0, y: 0.5 }], {
          id: 'percent',
          x: 'x',
          y: 'y',
          yScale: 'percent',
        }),
        lineY([{ x: 0, y: 20 }], {
          id: 'temperature',
          x: 'x',
          y: 'y',
          yScale: 'temperature',
        }),
      ],
      scales: {
        x: { scale: scaleLinear().domain([0, 1]) },
        y: { scale: scaleLinear().domain([0, 100]), grid: true },
        percent: {
          channel: 'y',
          side: 'right',
          scale: scaleLinear().domain([0, 1]),
        },
        temperature: {
          channel: 'y',
          side: 'right',
          scale: scaleLinear().domain([-40, 40]),
        },
      },
    }),
    { width: 640, height: 320 },
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}
