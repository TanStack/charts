import { describe, expect, it, vi } from 'vitest'
import { createStressDiagnostics } from './stress-diagnostics.mjs'

describe('stress phase diagnostics', () => {
  it('does not emit or retain phase records in normal runs', () => {
    const emit = vi.fn()
    const diagnostics = createStressDiagnostics(false, emit, () => 0)
    diagnostics.mark('mount')
    expect(emit).not.toHaveBeenCalled()
    expect(diagnostics.snapshot().phases).toEqual([])
  })

  it('retains elapsed phases independently of the final cell result', () => {
    let time = 100
    const emit = vi.fn()
    const diagnostics = createStressDiagnostics(true, emit, () => time)
    diagnostics.mark('mount')
    time = 150
    diagnostics.mark('pointer:initial:activate:0')
    const snapshot = diagnostics.snapshot()
    time = 200
    diagnostics.mark('complete')
    expect(snapshot).toEqual({
      elapsedMs: 50,
      phases: [
        { phase: 'mount', elapsedMs: 0 },
        { phase: 'pointer:initial:activate:0', elapsedMs: 50 },
      ],
    })
    expect(emit).toHaveBeenCalledTimes(3)
    expect(diagnostics.lastPhase()).toBe('complete')
  })
})
