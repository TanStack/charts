import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { controlledSignal } from './interaction-signal'

describe('controlledSignal', () => {
  it('retains the exact application snapshot and delegates changes', () => {
    const value = ['Manufacturing'] as const
    const onChange = vi.fn()
    const signal = controlledSignal(value, onChange)

    expect(signal.value).toBe(value)
    signal.onChange(['Manufacturing'], { type: 'test' })
    expect(onChange).toHaveBeenCalledWith(['Manufacturing'], { type: 'test' })
    expect(signal.value).toBe(value)
  })

  it('preserves controlled value and reason types', () => {
    type Series = 'Manufacturing' | 'Construction'
    type Reason = { type: 'toggle'; value: Series }
    const signal = controlledSignal<readonly Series[], Reason>(
      ['Manufacturing'],
      () => {},
    )

    expectTypeOf(signal.value).toEqualTypeOf<readonly Series[]>()
    expectTypeOf(signal.onChange).parameter(1).toEqualTypeOf<Reason>()
  })
})
