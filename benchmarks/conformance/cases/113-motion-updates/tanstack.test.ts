import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { updateStages } from './model'
import { motionUpdatesDefinition } from './tanstack'
import type {
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMotionPhase,
  ChartMotionTiming,
  ChartPoint,
  ChartSpecDatum,
} from '@tanstack/charts'
import type { UpdateRow } from './model'
import type { UpdateSettings } from './tanstack'

const tweenSettings = {
  duration: 1_100,
  easing: 'ease-out',
  spring: false,
  stiffness: 170,
  damping: 14,
  mass: 1,
} as const satisfies UpdateSettings

const springSettings = {
  ...tweenSettings,
  spring: true,
} as const satisfies UpdateSettings

describe('declarative keyed motion updates', () => {
  it('keeps stable keys while enter, update, and exit retain their source rows', () => {
    const initialRows = updateStages[0] ?? []
    const updatedRows = updateStages[1] ?? []
    const initial = render(initialRows, tweenSettings)
    const updated = render(updatedRows, tweenSettings)
    type Datum = ChartSpecDatum<ReturnType<typeof motionUpdatesDefinition>>

    expectTypeOf<Datum>().toEqualTypeOf<UpdateRow>()
    expect(initial.points).toHaveLength(initialRows.length * 2)
    expect(updated.points).toHaveLength(updatedRows.length * 2)

    for (const markId of ['actual', 'target']) {
      const initialById = pointsByDatumId(initial.points, markId)
      const updatedById = pointsByDatumId(updated.points, markId)

      for (const id of ['jan', 'mar', 'apr', 'may', 'jun', 'jul', 'aug']) {
        expect(updatedById.get(id)?.key).toBe(initialById.get(id)?.key)
        expect(updatedById.get(id)?.datum).toBe(
          updatedRows.find((row) => row.id === id),
        )
      }

      const exiting = initialById.get('feb')
      const entering = updatedById.get('sep')
      const updating = updatedById.get('jan')

      expect(exiting?.datum).toBe(initialRows.find(({ id }) => id === 'feb'))
      expect(entering?.datum).toBe(updatedRows.find(({ id }) => id === 'sep'))
      expect(updating?.datum).toBe(updatedRows.find(({ id }) => id === 'jan'))
      expect(updating?.datum).not.toBe(
        initialRows.find(({ id }) => id === 'jan'),
      )
    }
  })

  it('passes the correct source datum to keyed enter, update, and exit policy', () => {
    const initialRows = updateStages[0] ?? []
    const updatedRows = updateStages[1] ?? []
    const contexts: ChartMotionContext<UpdateRow>[] = []
    const runtime = createChartRuntime<UpdateRow, string, number>()
    const observed = (rows: readonly UpdateRow[]) => {
      const definition = motionUpdatesDefinition(rows, tweenSettings)
      const authored = definition.motion
      return {
        ...definition,
        motion(context: ChartMotionContext<UpdateRow>) {
          contexts.push(context)
          return resolveMotion(authored, context)
        },
      }
    }
    const surface = motion<UpdateRow, string, number>({ initial: false }).mount(
      document.createElement('div'),
      () => {},
    )

    surface.render(
      runtime.render(observed(initialRows), { width: 640, height: 400 }),
      {
        ariaLabel: 'Initial keyed update chart',
      },
    )
    surface.render(
      runtime.render(observed(updatedRows), { width: 640, height: 400 }),
      {
        ariaLabel: 'Updated keyed update chart',
      },
    )

    const barContexts = contexts.filter(({ role }) => role === 'bar')
    expect(
      barContexts.find(
        ({ phase, datum }) => phase === 'update' && datum?.id === 'jan',
      )?.datum,
    ).toBe(updatedRows.find(({ id }) => id === 'jan'))
    expect(
      barContexts.find(
        ({ phase, datum }) => phase === 'enter' && datum?.id === 'sep',
      )?.datum,
    ).toBe(updatedRows.find(({ id }) => id === 'sep'))
    expect(
      barContexts.find(
        ({ phase, datum }) => phase === 'exit' && datum?.id === 'feb',
      )?.datum,
    ).toBe(initialRows.find(({ id }) => id === 'feb'))

    surface.destroy()
  })

  it('owns tween defaults plus exit, featured-datum, and series overrides', () => {
    const rows = updateStages[1] ?? []
    const definition = motionUpdatesDefinition(rows, tweenSettings)
    const scene = render(rows, tweenSettings)
    const barMotion = definition.marks[0]?.motion
    const featured = scene.points.find(
      ({ datum, markId }) => markId === 'actual' && datum.featured,
    )
    const ordinary = scene.points.find(
      ({ datum, markId }) => markId === 'actual' && !datum.featured,
    )

    expect(definition.motion).toEqual({
      transition: {
        type: 'tween',
        duration: 1_100,
        easing: 'ease-out',
      },
    })
    expect(resolveMotion(barMotion, motionContext('exit', ordinary))).toEqual({
      transition: { type: 'tween', duration: 495 },
    })
    expect(resolveMotion(barMotion, motionContext('update', featured))).toEqual(
      {
        delay: 176,
        transition: { type: 'tween', duration: 660 },
      },
    )
    expect(
      resolveMotion(barMotion, motionContext('update', ordinary)),
    ).toBeUndefined()
    expect(definition.marks[1]?.motion).toEqual({
      delay: 80,
      transition: { type: 'tween', duration: 902 },
    })
  })

  it('owns spring physics and composes partial per-datum and series policy', () => {
    const rows = updateStages[1] ?? []
    const definition = motionUpdatesDefinition(rows, springSettings)
    const scene = render(rows, springSettings)
    const barMotion = definition.marks[0]?.motion
    const featured = scene.points.find(
      ({ datum, markId }) => markId === 'actual' && datum.featured,
    )
    const ordinary = scene.points.find(
      ({ datum, markId }) => markId === 'actual' && !datum.featured,
    )

    expect(definition.motion).toEqual({
      transition: {
        type: 'spring',
        stiffness: 170,
        damping: 14,
        mass: 1,
      },
    })
    expect(resolveMotion(barMotion, motionContext('exit', ordinary))).toEqual({
      transition: {
        type: 'spring',
        stiffness: 212.5,
        damping: 16.099999999999998,
      },
    })
    expect(resolveMotion(barMotion, motionContext('enter', featured))).toEqual({
      delay: 70,
      transition: { type: 'spring', mass: 1.35 },
    })
    expect(definition.marks[1]?.motion).toEqual({
      delay: 80,
      transition: { type: 'spring', stiffness: 132.6 },
    })
  })

  it('leaves stages, settings controls, timers, and replay in the shell', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/113-motion-updates/example.tsx',
      ),
      'utf8',
    )
    const start = source.indexOf('export function motionUpdatesDefinition(')
    const end = source.indexOf('export function readEasing', start)
    const definitionSource = source.slice(start, end)

    const view = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/113-motion-updates/view.tsx',
      ),
      'utf8',
    )
    expect(view).toContain("from '../../shared/motion'")
    expect(view).toContain('onClick={advance}')
    expect(view).toContain('onClick={interrupt}')
    expect(view).toContain('onClick={replay}')
    expect(view).toContain('window.setTimeout(() =>')
    expect(view).toContain('settleChartMotion(')
    expect(definitionSource).toContain('defineChart({')
    expect(definitionSource).toContain("id: 'actual'")
    expect(definitionSource).toContain("id: 'target'")
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

function render(rows: readonly UpdateRow[], settings: UpdateSettings) {
  return createChartRuntime<UpdateRow, string, number>().render(
    motionUpdatesDefinition(rows, settings),
    { width: 640, height: 400 },
  )
}

function pointsByDatumId(
  points: readonly ChartPoint<UpdateRow, string, number>[],
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
  point: ChartPoint<UpdateRow, string, number> | undefined,
): ChartMotionContext<UpdateRow> {
  if (!point) throw new TypeError('Expected a motion point')
  return {
    phase,
    role: 'bar',
    key: point.key,
    markId: point.markId,
    seriesKey: point.groupLabel,
    seriesIndex: 0,
    datumIndex: point.datumIndex,
    datumCount: updateStages[0]?.length ?? 0,
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
