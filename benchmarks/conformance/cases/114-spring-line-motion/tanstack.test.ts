import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { springLineStages } from './model'
import { springLineMotionDefinition } from './tanstack'
import type {
  ChartDefinition,
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMotionPhase,
  ChartMotionTiming,
  ChartPoint,
  ChartSpecDatum,
} from '@tanstack/charts'
import type { SpringLineRow } from './model'
import type { SpringLineTransitionMode } from './tanstack'

describe('declarative spring line motion', () => {
  it("keeps both line series keyed to each stage's source rows", () => {
    const scenes = springLineStages.map((rows) => render(rows, 'spring'))
    const definition = springLineMotionDefinition(
      springLineStages[0] ?? [],
      'spring',
    )
    type Datum = ChartSpecDatum<ReturnType<typeof springLineMotionDefinition>>

    expectTypeOf<Datum>().toEqualTypeOf<SpringLineRow>()
    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<SpringLineRow, string, number>
    >()
    expectTypeOf<SpringLineTransitionMode>().toEqualTypeOf<'spring' | 'tween'>()

    for (const [stageIndex, scene] of scenes.entries()) {
      const rows = springLineStages[stageIndex] ?? []
      expect(scene.points).toHaveLength(rows.length * 2)
      for (const markId of ['primary', 'comparison']) {
        const points = pointsByDatumId(scene.points, markId)
        for (const row of rows) {
          expect(points.get(row.id)?.datum).toBe(row)
          expect(points.get(row.id)?.xValue).toBe(row.period)
          expect(points.get(row.id)?.yValue).toBe(
            markId === 'primary' ? row.primary : row.comparison,
          )
        }
      }
    }

    for (let stageIndex = 1; stageIndex < scenes.length; stageIndex += 1) {
      const previous = scenes[stageIndex - 1]
      const current = scenes[stageIndex]
      if (!previous || !current) throw new Error('Expected adjacent stages')
      for (const markId of ['primary', 'comparison']) {
        const previousPoints = pointsByDatumId(previous.points, markId)
        const currentPoints = pointsByDatumId(current.points, markId)
        for (const row of springLineStages[stageIndex] ?? []) {
          expect(currentPoints.get(row.id)?.key).toBe(
            previousPoints.get(row.id)?.key,
          )
        }
      }
    }
  })

  it('inherits spring physics while overriding only comparison mass', () => {
    const rows = springLineStages[0] ?? []
    const definition = springLineMotionDefinition(rows, 'spring')
    const scene = render(rows, 'spring')
    const comparison = scene.points.find(
      ({ markId }) => markId === 'comparison',
    )

    expect(definition.motion).toEqual({
      transition: {
        type: 'spring',
        stiffness: 170,
        damping: 18,
        mass: 1,
      },
    })
    expect(definition.marks[0]?.motion).toBeUndefined()
    expect(
      resolveMotion(
        definition.marks[1]?.motion,
        motionContext('update', comparison),
      ),
    ).toEqual({
      delay: 0,
      transition: { type: 'spring', mass: 1.2 },
    })
    expect(
      resolveMotion(
        definition.marks[1]?.motion,
        motionContext('enter', comparison),
      ),
    ).toEqual({
      delay: 90,
      transition: { type: 'spring', mass: 1.2 },
    })
  })

  it('keeps the tween default and comparison-series override local', () => {
    const rows = springLineStages[0] ?? []
    const definition = springLineMotionDefinition(rows, 'tween')
    const comparison = render(rows, 'tween').points.find(
      ({ markId }) => markId === 'comparison',
    )

    expect(definition.motion).toEqual({
      transition: { type: 'tween', duration: 650, easing: 'ease-out' },
    })
    expect(
      resolveMotion(
        definition.marks[1]?.motion,
        motionContext('update', comparison),
      ),
    ).toEqual({
      delay: 0,
      transition: {
        type: 'tween',
        duration: 820,
        easing: 'ease-in-out',
      },
    })
  })

  it('preserves line position and spring momentum across a retarget', () => {
    const [initialRows = [], updatedRows = [], finalRows = []] =
      springLineStages
    const initial = render(initialRows, 'spring')
    const updated = render(updatedRows, 'spring')
    const final = render(finalRows, 'spring')
    const container = document.createElement('div')
    const surface = motion<SpringLineRow, string, number>({
      initial: false,
    }).mount(container, () => {})
    surface.render(initial, { ariaLabel: 'Spring line update' })
    const frames = installManagedFrames()
    surface.render(updated, { ariaLabel: 'Spring line update' })

    frames.run(0)
    frames.run(120)
    const primaryPath = () =>
      container.querySelector<SVGPathElement>('g.ts-chart__line path')
    const interruptedY = firstPathY(primaryPath())
    surface.render(final, { ariaLabel: 'Spring line update' })

    expect(firstPathY(primaryPath())).toBeCloseTo(interruptedY)
    frames.run(120)
    frames.run(136)
    const momentumY = firstPathY(primaryPath())
    const finalY = final.points.find(
      ({ markId, datum }) => markId === 'primary' && datum.id === 'jan',
    )?.y
    expect(momentumY).toBeLessThan(interruptedY)
    expect(finalY).toBeGreaterThan(interruptedY)
    expect(surface.getPresentationPoints?.()?.[0]?.y).toBeCloseTo(momentumY)

    surface.destroy()
    frames.restore()
  })

  it('leaves controls, staging, interruption, replay, and lifecycle in the shell', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/114-spring-line-motion/tanstack.ts',
      ),
      'utf8',
    )
    const start = source.indexOf('export function springLineMotionDefinition(')
    const end = source.length
    const definitionSource = source.slice(start, end)

    const view = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/114-spring-line-motion/view.tsx',
      ),
      'utf8',
    )
    expect(view).toContain("from '../../shared/motion'")
    expect(view).toContain('onChange={(event) =>')
    expect(view).toContain('onClick={interrupt}')
    expect(view).toContain('onClick={replay}')
    expect(view).toContain('window.setTimeout(() =>')
    expect(view).toContain('settleChartMotion(')
    expect(view).not.toContain('function settleMotion')
    expect(definitionSource).toContain('defineChart({')
    expect(definitionSource).toContain("id: 'primary'")
    expect(definitionSource).toContain("id: 'comparison'")
    expect(definitionSource).toContain("key: 'id'")
    expect(definitionSource).toContain("type: 'spring'")
    expect(definitionSource).toContain("type: 'tween'")
    expect(definitionSource).not.toContain('createMark')
    expect(definitionSource).not.toContain('SceneNode')
    expect(definitionSource).not.toContain('requestAnimationFrame')
    expect(definitionSource).not.toContain('setTimeout')
    expect(definitionSource).not.toContain('querySelector')
    expect(definitionSource).not.toContain('document.')
    expect(definitionSource).not.toContain('mountChartRenderer')
  })
})

function render(
  rows: readonly SpringLineRow[],
  mode: SpringLineTransitionMode,
) {
  return createChartRuntime<SpringLineRow, string, number>().render(
    springLineMotionDefinition(rows, mode),
    { width: 640, height: 400 },
  )
}

function pointsByDatumId(
  points: readonly ChartPoint<SpringLineRow, string, number>[],
  markId: string,
) {
  return new Map(
    points
      .filter((point) => point.markId === markId)
      .map((point) => [point.datum.id, point] as const),
  )
}

function motionContext(
  phase: ChartMotionPhase,
  point: ChartPoint<SpringLineRow, string, number> | undefined,
): ChartMotionContext<SpringLineRow> {
  if (!point) throw new TypeError('Expected a line point')
  return {
    phase,
    role: 'line',
    key: point.key,
    markId: point.markId,
    seriesKey: point.groupLabel,
    seriesIndex: point.markId === 'primary' ? 0 : 1,
    datumIndex: point.datumIndex,
    datumCount: springLineStages[0]?.length ?? 0,
    datum: point.datum,
    point,
  }
}

function resolveMotion<TDatum>(
  definition: ChartMotionDefinition<TDatum> | undefined,
  context: ChartMotionContext<TDatum>,
): false | ChartMotionTiming<TDatum> | undefined {
  return typeof definition === 'function' ? definition(context) : definition
}

function firstPathY(path: SVGPathElement | null) {
  const values = path?.getAttribute('d')?.match(/-?\d+(?:\.\d+)?/g)
  const value = Number(values?.[1])
  if (!Number.isFinite(value)) throw new TypeError('Expected a line path')
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
