import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { definitionMotionStages } from './model'
import { definitionMotionDefinition } from './tanstack'
import type {
  ChartDefinition,
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMotionPhase,
  ChartMotionRole,
  ChartMotionTiming,
  ChartPoint,
  ChartSpecDatum,
} from '@tanstack/charts'
import type { DefinitionMotionRow } from './model'

describe('declarative definition-owned motion', () => {
  it('keeps exact row types, raw identity, and stable keys across stages', () => {
    const definition = definitionMotionDefinition(
      definitionMotionStages[0] ?? [],
    )
    const scenes = definitionMotionStages.map(render)
    type Datum = ChartSpecDatum<ReturnType<typeof definitionMotionDefinition>>

    expectTypeOf<Datum>().toEqualTypeOf<DefinitionMotionRow>()
    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<DefinitionMotionRow, string, number>
    >()

    for (const [stageIndex, scene] of scenes.entries()) {
      const rows = definitionMotionStages[stageIndex] ?? []
      expect(scene.points).toHaveLength(rows.length * 2)
      expect(new Set(scene.points.map(({ key }) => key)).size).toBe(
        scene.points.length,
      )

      for (const markId of ['actual', 'target']) {
        const points = pointsByDatumId(scene.points, markId)
        for (const row of rows) {
          const point = points.get(row.id)
          expect(point?.datum).toBe(row)
          expect(point?.xValue).toBe(row.period)
          expect(point?.yValue).toBe(
            markId === 'actual' ? row.actual : row.target,
          )
        }
      }
    }

    for (let stageIndex = 1; stageIndex < scenes.length; stageIndex += 1) {
      const previous = scenes[stageIndex - 1]
      const current = scenes[stageIndex]
      if (!previous || !current) throw new Error('Expected adjacent stages')

      for (const markId of ['actual', 'target']) {
        const previousPoints = pointsByDatumId(previous.points, markId)
        const currentPoints = pointsByDatumId(current.points, markId)
        for (const row of definitionMotionStages[stageIndex] ?? []) {
          const previousPoint = previousPoints.get(row.id)
          if (previousPoint) {
            expect(currentPoints.get(row.id)?.key).toBe(previousPoint.key)
            expect(currentPoints.get(row.id)?.datum).not.toBe(
              previousPoint.datum,
            )
          }
        }
      }
    }
  })

  it('cascades chart, mark, datum, axis, tick, tick-label, and label policy', () => {
    const rows = definitionMotionStages[1] ?? []
    const definition = definitionMotionDefinition(rows)
    const scene = render(rows)
    const actualMotion = definition.marks[0]?.motion
    const featured = scene.points.find(
      ({ datum, markId }) => markId === 'actual' && datum.featured,
    )
    const ordinary = scene.points.find(
      ({ datum, markId }) => markId === 'actual' && !datum.featured,
    )
    if (!featured || !ordinary) throw new Error('Expected bar policy rows')

    expect(definition.motion).toEqual({
      transition: { type: 'spring', stiffness: 170, damping: 18, mass: 1 },
    })
    expect(
      resolveMotion(actualMotion, motionContext('enter', 'bar', featured)),
    ).toEqual({
      delay: featured.datumIndex * 34,
      transition: { type: 'spring', mass: 1.45 },
    })
    expect(
      resolveMotion(actualMotion, motionContext('update', 'bar', ordinary)),
    ).toEqual({ delay: 0, transition: undefined })
    expect(definition.marks[1]?.motion).toEqual({
      transition: {
        type: 'tween',
        duration: 520,
        easing: 'ease-in-out',
      },
    })

    const xAxis = requiredAxis(definition.x)
    const yAxis = requiredAxis(definition.y)
    const xTicks = requiredTicks(xAxis.ticks)
    const xTickLabels = requiredTickLabels(xAxis.tickLabels)
    const xLabel = requiredLabel(xAxis.label)
    const yTicks = requiredTicks(yAxis.ticks)
    const yTickLabels = requiredTickLabels(yAxis.tickLabels)
    const yLabel = requiredLabel(yAxis.label)
    expect(xAxis.motion).toEqual({
      transition: { type: 'tween', duration: 260, easing: 'ease-out' },
    })
    expect(xTicks.motion).toBe(xAxis.motion)
    expect(xLabel.motion).toBe(xAxis.motion)
    expect(
      resolveMotion(
        xTickLabels.motion,
        guideMotionContext('tick-label', 'x', 3),
      ),
    ).toEqual({
      delay: 54,
      transition: { type: 'tween', duration: 220 },
    })
    expect(yAxis.motion).toEqual(xAxis.motion)
    expect(yTicks.motion).toBe(yAxis.motion)
    expect(yTickLabels.motion).toBe(yAxis.motion)
    expect(yLabel.motion).toBe(yAxis.motion)
  })

  it('preserves painted bar position and spring momentum across a retarget', () => {
    const [initialRows = [], updatedRows = [], finalRows = []] =
      definitionMotionStages
    const initial = render(initialRows)
    const updated = render(updatedRows)
    const final = render(finalRows)
    const updatedJan = updated.points.find(
      ({ datum, markId }) => markId === 'actual' && datum.id === 'jan',
    )
    const finalJan = final.points.find(
      ({ datum, markId }) => markId === 'actual' && datum.id === 'jan',
    )
    if (!updatedJan || !finalJan) throw new Error('Expected keyed Jan bars')

    const container = document.createElement('div')
    const surface = motion<DefinitionMotionRow, string, number>({
      initial: false,
    }).mount(container, () => {})
    surface.render(initial, { ariaLabel: 'Definition motion update' })
    const frames = installManagedFrames()
    surface.render(updated, { ariaLabel: 'Definition motion update' })

    frames.run(0)
    frames.run(120)
    const rectangle = () =>
      container.querySelector<SVGRectElement>(
        `g.ts-chart__bar-y > rect[data-ts-key="${updatedJan.key}"]`,
      )
    const interruptedY = Number(rectangle()?.getAttribute('y'))
    surface.render(final, { ariaLabel: 'Definition motion update' })

    expect(Number(rectangle()?.getAttribute('y'))).toBeCloseTo(interruptedY)
    frames.run(120)
    frames.run(136)
    const momentumY = Number(rectangle()?.getAttribute('y'))
    expect(momentumY).toBeLessThan(interruptedY)
    expect(finalJan.y).toBeGreaterThan(interruptedY)
    expect(
      surface.getPresentationPoints?.()?.find(({ key }) => key === finalJan.key)
        ?.y,
    ).toBeCloseTo(momentumY)

    surface.destroy()
    frames.restore()
  })

  it('keeps orchestration and renderer lifecycle outside the definition', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/115-definition-motion/example.tsx',
      ),
      'utf8',
    )
    const start = source.indexOf('export function definitionMotionDefinition(')
    const end = source.indexOf('export default function', start)
    const definitionSource = source.slice(start, end)

    const view = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/115-definition-motion/view.tsx',
      ),
      'utf8',
    )
    expect(view).toContain("from '../../shared/motion'")
    expect(view).toContain('onClick={advance}')
    expect(view).toContain('onClick={interrupt}')
    expect(view).toContain('onClick={replay}')
    expect(view).toContain('window.setTimeout(() =>')
    expect(view).toContain('<Chart')
    expect(view).toContain('settleChartMotion(')
    expect(view).not.toContain('function settleMotion')
    expect(definitionSource).toContain('defineChart({')
    expect(definitionSource).toContain("id: 'actual'")
    expect(definitionSource).toContain("id: 'target'")
    expect(definitionSource).toContain("key: 'id'")
    expect(definitionSource).toContain('axis: {')
    expect(definitionSource).toContain('ticks: { motion: guideMotion }')
    expect(definitionSource).toContain('tickLabels: {')
    expect(definitionSource).toContain("label: { text: 'Period'")
    expect(definitionSource).not.toContain('createMark')
    expect(definitionSource).not.toContain('SceneNode')
    expect(definitionSource).not.toContain('requestAnimationFrame')
    expect(definitionSource).not.toContain('setTimeout')
    expect(definitionSource).not.toContain('querySelector')
    expect(definitionSource).not.toContain('document.')
    expect(definitionSource).not.toContain('mountChartRenderer')
  })
})

function render(rows: readonly DefinitionMotionRow[]) {
  return createChartRuntime<DefinitionMotionRow, string, number>().render(
    definitionMotionDefinition(rows),
    { width: 640, height: 400 },
  )
}

function pointsByDatumId(
  points: readonly ChartPoint<DefinitionMotionRow, string, number>[],
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
  role: ChartMotionRole,
  point: ChartPoint<DefinitionMotionRow, string, number> | undefined,
): ChartMotionContext<DefinitionMotionRow> {
  if (!point) throw new TypeError('Expected a definition-motion point')
  return {
    phase,
    role,
    key: point.key,
    markId: point.markId,
    seriesKey: point.groupLabel,
    seriesIndex: point.markId === 'actual' ? 0 : 1,
    datumIndex: point.datumIndex,
    datumCount: definitionMotionStages[1]?.length ?? 0,
    datum: point.datum,
    point,
  }
}

function guideMotionContext(
  role: ChartMotionRole,
  axis: 'x' | 'y',
  datumIndex: number,
): ChartMotionContext {
  return {
    phase: 'update',
    role,
    key: `${role}:${axis}:${datumIndex}`,
    seriesKey: axis,
    seriesIndex: axis === 'x' ? 0 : 1,
    datumIndex,
    datumCount: 6,
    datum: undefined,
    point: undefined,
    axis,
  }
}

function resolveMotion<TDatum>(
  definition: ChartMotionDefinition<TDatum> | undefined,
  context: ChartMotionContext<TDatum>,
): false | ChartMotionTiming<TDatum> | undefined {
  return typeof definition === 'function' ? definition(context) : definition
}

function requiredAxis(
  axis:
    | {
        axis?: false | import('@tanstack/charts').ChartAxisPresentationOptions
      }
    | null
    | undefined,
) {
  if (!axis || axis.axis === false) throw new TypeError('Expected an axis')
  return axis.axis ?? {}
}

function requiredTicks(
  ticks: false | import('@tanstack/charts').ChartAxisTickOptions | undefined,
) {
  if (!ticks) throw new TypeError('Expected axis ticks')
  return ticks
}

function requiredTickLabels(
  labels:
    false | import('@tanstack/charts').ChartAxisTickLabelOptions | undefined,
) {
  if (!labels) throw new TypeError('Expected axis tick labels')
  return labels
}

function requiredLabel(
  label: string | import('@tanstack/charts').ChartAxisLabelOptions | undefined,
) {
  if (!label || typeof label === 'string') {
    throw new TypeError('Expected an axis label definition')
  }
  return label
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
