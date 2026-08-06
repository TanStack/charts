import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime, renderChartSvg } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { morphData, morphModes } from './model'
import { geometryMorphDefinition } from './tanstack'
import type {
  ChartDefinition,
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMotionPhase,
  ChartMotionTiming,
  ChartPoint,
  ChartScene,
  ChartSpecDatum,
  SceneArea,
  SceneNode,
} from '@tanstack/charts'
import type { MorphDatum, MorphMode } from './model'

describe('normalized-topology geometry morph', () => {
  it('keeps exact datum types, source identity, and stable keys across modes', () => {
    const definition = geometryMorphDefinition(morphData, 'bars')
    const scenes = morphModes.map((mode) => render(mode))
    type Datum = ChartSpecDatum<ReturnType<typeof geometryMorphDefinition>>

    expectTypeOf<Datum>().toEqualTypeOf<MorphDatum>()
    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<MorphDatum, number, number>
    >()

    for (const scene of scenes) {
      expect(scene.points).toHaveLength(morphData.length)
      expect(areaNodes(scene.nodes)).toHaveLength(morphData.length)
      expect(new Set(scene.points.map(({ key }) => key)).size).toBe(
        morphData.length,
      )

      for (const [datumIndex, datum] of morphData.entries()) {
        const point = scene.points.find(
          (candidate) => candidate.key === `geometry-morph:${datum.id}`,
        )
        expect(point?.markId).toBe('geometry-morph')
        expect(point?.datum).toBe(datum)
        expect(point?.datumIndex).toBe(datumIndex)
        expect(point?.group).toBe(datum.id)
        expect(point?.xValue).toBe(datumIndex)
        expect(point?.yValue).toBe(datum.value)
        expect(point?.color).toBe(datum.color)
      }
    }

    const keys = scenes.map((scene) => scene.points.map(({ key }) => key))
    expect(keys).toEqual(keys.map(() => keys[0]))
  })

  it('normalizes every shape to one renderer-owned closed-path skeleton', () => {
    const skeletons = new Set<string>()
    const violetShapes = new Set<string>()

    for (const mode of morphModes) {
      const scene = render(mode, 320, 240)
      const areas = areaNodes(scene.nodes)
      const container = document.createElement('div')
      container.innerHTML = renderChartSvg(scene, {
        ariaLabel: `Normalized ${mode}`,
      })
      const paths = [
        ...container.querySelectorAll<SVGPathElement>(
          'g.ts-chart__geometry-morph > path',
        ),
      ]

      expect(paths).toHaveLength(morphData.length)
      for (const area of areas) {
        expect(area.points).toHaveLength(48)
        expect(area.path).toBeUndefined()
        for (const [x, y] of area.points) {
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
          expect(x).toBeGreaterThanOrEqual(scene.chart.x - 1e-9)
          expect(x).toBeLessThanOrEqual(
            scene.chart.x + scene.chart.width + 1e-9,
          )
          expect(y).toBeGreaterThanOrEqual(scene.chart.y - 1e-9)
          expect(y).toBeLessThanOrEqual(
            scene.chart.y + scene.chart.height + 1e-9,
          )
        }
      }
      for (const path of paths) {
        const value = path.getAttribute('d')
        if (!value) throw new TypeError(`Expected a ${mode} path`)
        skeletons.add(pathSkeleton(value))
      }
      const violet = areas.find(({ key }) => key === 'geometry-morph:violet')
      if (!violet) throw new TypeError(`Expected violet ${mode} geometry`)
      violetShapes.add(JSON.stringify(violet.points))
    }

    expect(skeletons.size).toBe(1)
    expect(violetShapes.size).toBe(morphModes.length)
  })

  it('keeps spring defaults and per-datum staggering in the definition', () => {
    const definition = geometryMorphDefinition(morphData, 'rose')
    const scene = render('rose')
    const markMotion = definition.marks[0]?.motion
    const violet = pointById(scene, 'violet')
    const blue = pointById(scene, 'blue')

    expect(definition.motion).toEqual({
      transition: {
        type: 'spring',
        stiffness: 105,
        damping: 16,
        mass: 0.9,
      },
    })
    expect(resolveMotion(markMotion, motionContext('enter', violet))).toEqual({
      delay: 0,
      transition: { type: 'spring', mass: 1.35 },
    })
    expect(resolveMotion(markMotion, motionContext('enter', blue))).toEqual({
      delay: 38,
      transition: undefined,
    })
    expect(resolveMotion(markMotion, motionContext('update', blue))).toEqual({
      delay: 0,
      transition: undefined,
    })
  })

  it('preserves compatible path tokens and spring velocity across a retarget', () => {
    const bars = render('bars')
    const rose = render('rose')
    const bubbles = render('bubbles')
    const bubbleTargetX = firstAreaX(bubbles, 'violet')
    const container = document.createElement('div')
    const surface = motion<MorphDatum, number, number>({
      initial: false,
    }).mount(container, () => {})
    surface.render(bars, { ariaLabel: 'Geometry morph update' })
    const frames = installManagedFrames()

    try {
      surface.render(rose, { ariaLabel: 'Geometry morph update' })
      frames.run(0)
      frames.run(104)
      const incomingX = firstPathX(violetPath(container))
      frames.run(120)
      const interruptedPath = violetPath(container).getAttribute('d')
      const interruptedX = firstPathX(violetPath(container))

      expect(interruptedX).toBeGreaterThan(incomingX)
      expect(bubbleTargetX).toBeLessThan(interruptedX)

      surface.render(bubbles, { ariaLabel: 'Geometry morph update' })
      expect(violetPath(container).getAttribute('d')).toBe(interruptedPath)
      frames.run(120)
      frames.run(136)

      expect(firstPathX(violetPath(container))).toBeGreaterThan(interruptedX)
    } finally {
      surface.destroy()
      frames.restore()
    }
  })

  it('keeps only fixed-topology geometry in the custom mark boundary', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/116-geometry-morph/tanstack.ts',
      ),
      'utf8',
    )
    const definitionStart = source.indexOf(
      'export function geometryMorphDefinition(',
    )
    const markStart = source.indexOf(
      'function normalizedTopologyMark(',
      definitionStart,
    )
    const shellStart = source.indexOf('function createControls', markStart)
    const definitionSource = source.slice(definitionStart, markStart)
    const customSource = source.slice(markStart, shellStart)

    expect(source).toContain("from '../../shared/motion'")
    expect(source).toContain('settleChartMotion(chart')
    expect(source).not.toContain('function settleMotion')
    expect(source).not.toContain("from 'd3-shape'")
    expect(source).not.toContain("from 'd3-interpolate'")
    expect(definitionSource).toContain('defineChart({')
    expect(definitionSource).toContain("id: 'geometry-morph'")
    expect(definitionSource).toContain('key: (datum) => datum.id')
    expect(definitionSource).toContain('fill: (datum) => datum.color')
    expect(definitionSource).toContain('motion(context)')
    expect(definitionSource).toContain("type: 'spring'")
    expect(definitionSource).not.toContain('createMark')
    expect(definitionSource).not.toContain('SceneNode')
    expect(customSource).toContain('createMark<MorphDatum')
    expect(customSource).toContain('geometryForMode(data, mode, chart)')
    expect(customSource).toContain("kind: 'area'")
    expect(customSource).toContain('points: geometry.points')
    expect(customSource).not.toContain('closedPath')
    expect(customSource).not.toContain('path:')
    expect(customSource).not.toContain("type: 'spring'")
    expect(customSource).not.toContain('requestAnimationFrame')
    expect(customSource).not.toContain('setTimeout')
    expect(customSource).not.toContain('querySelector')
    expect(customSource).not.toContain('document.')
    expect(customSource).not.toContain('mountChartRenderer')
  })
})

function render(mode: MorphMode, width = 640, height = 400) {
  return createChartRuntime<MorphDatum, number, number>().render(
    geometryMorphDefinition(morphData, mode),
    { width, height },
  )
}

function pointById(scene: ChartScene<MorphDatum, number, number>, id: string) {
  const point = scene.points.find(({ datum }) => datum.id === id)
  if (!point) throw new TypeError(`Expected ${id} point`)
  return point
}

function motionContext(
  phase: ChartMotionPhase,
  point: ChartPoint<MorphDatum, number, number>,
): ChartMotionContext<MorphDatum> {
  return {
    phase,
    role: 'area',
    key: point.key,
    markId: point.markId,
    seriesKey: point.groupLabel,
    seriesIndex: 0,
    datumIndex: point.datumIndex,
    datumCount: morphData.length,
    datum: point.datum,
    point,
  }
}

function resolveMotion<TDatum>(
  definition: ChartMotionDefinition<TDatum> | undefined,
  context: ChartMotionContext<TDatum>,
): ChartMotionTiming | undefined {
  return typeof definition === 'function' ? definition(context) : definition
}

function areaNodes(nodes: readonly SceneNode[]) {
  return flatten(nodes).filter(
    (node): node is SceneArea => node.kind === 'area',
  )
}

function flatten(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}

function pathSkeleton(value: string) {
  return value.replace(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi, '#')
}

function firstAreaX(scene: ChartScene, id: string) {
  const area = areaNodes(scene.nodes).find(
    ({ key }) => key === `geometry-morph:${id}`,
  )
  const x = area?.points[0]?.[0]
  if (typeof x !== 'number' || !Number.isFinite(x)) {
    throw new TypeError(`Expected ${id} area geometry`)
  }
  return x
}

function violetPath(container: HTMLElement) {
  const path = container.querySelector<SVGPathElement>(
    'path[data-ts-key="geometry-morph:violet"]',
  )
  if (!path) throw new TypeError('Expected a violet path')
  return path
}

function firstPathX(path: SVGPathElement) {
  const match = /^M(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?),/i.exec(
    path.getAttribute('d') ?? '',
  )
  const value = Number(match?.[1])
  if (!Number.isFinite(value)) throw new TypeError('Expected a path coordinate')
  return value
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
