import { describe, expect, it } from 'vitest'
import { stagger } from './motion-definition'
import type { ChartMotionContext, ChartMotionTiming } from './types'

const context: ChartMotionContext<{ id: string }> = {
  phase: 'enter',
  role: 'bar',
  key: 'bar:2',
  markId: 'bars',
  seriesKey: 'desktop',
  seriesIndex: 1,
  datumIndex: 2,
  datumCount: 4,
  datum: { id: 'c' },
  point: undefined,
}

describe('motion definition utilities', () => {
  it('staggers enter timing by datum index by default', () => {
    const timing = stagger({ each: 24 })

    expect(resolveDelay(timing, context)).toBe(48)
    expect(
      resolveDelay(timing, { ...context, phase: 'update' }),
    ).toBeUndefined()
  })

  it('can stagger selected phases and roles by series index', () => {
    const timing = stagger({
      each: 30,
      offset: 10,
      by: 'series',
      phase: ['enter', 'exit'],
      roles: ['bar', 'arc'],
    })

    expect(resolveDelay(timing, context)).toBe(40)
    expect(resolveDelay(timing, { ...context, phase: 'exit' })).toBe(40)
    expect(resolveDelay(timing, { ...context, role: 'line' })).toBeUndefined()
  })

  it('clamps invalid delays instead of producing negative timing', () => {
    const timing = stagger({ each: -20, offset: Number.NaN })

    expect(resolveDelay(timing, context)).toBe(0)
  })

  it('composes with timing fields through ordinary object spread', () => {
    const timing = {
      transition: { type: 'spring' as const, stiffness: 170 },
      path: 'morph' as const,
      delay: 5,
      ...stagger<{ id: string }>({ each: 20 }),
    }

    expect(timing).toMatchObject({
      transition: { type: 'spring', stiffness: 170 },
      path: 'morph',
    })
    expect(resolveDelay(timing, context)).toBe(40)

    const explicitDelay = {
      ...stagger({ each: 20 }),
      delay: 60,
    }
    expect(explicitDelay.delay).toBe(60)
  })
})

function resolveDelay<TDatum>(
  timing: Pick<ChartMotionTiming<TDatum>, 'delay'>,
  value: ChartMotionContext<TDatum>,
) {
  return typeof timing.delay === 'function' ? timing.delay(value) : timing.delay
}
