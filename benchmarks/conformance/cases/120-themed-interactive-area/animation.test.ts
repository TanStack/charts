import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createBoundedAnimationTracker,
  rechartsAreaAnimationFallbackDelay,
} from './animation'

afterEach(() => vi.useRealTimers())

describe('Recharts area animation tracking', () => {
  it('finishes after the bounded fallback when one overlapping track drops its end callback', () => {
    vi.useFakeTimers()
    const changes: boolean[] = []
    const tracker = createBoundedAnimationTracker((value) =>
      changes.push(value),
    )

    tracker.start()
    tracker.start()
    tracker.end()
    vi.advanceTimersByTime(rechartsAreaAnimationFallbackDelay - 1)

    expect(tracker.isRunning()).toBe(true)
    expect(changes).toEqual([true])

    vi.advanceTimersByTime(1)
    expect(tracker.isRunning()).toBe(false)
    expect(changes).toEqual([true, false])
  })

  it('cancels the fallback when every track ends normally', () => {
    vi.useFakeTimers()
    const changes: boolean[] = []
    const tracker = createBoundedAnimationTracker((value) =>
      changes.push(value),
    )

    tracker.start()
    tracker.start()
    tracker.end()
    tracker.end()

    expect(tracker.isRunning()).toBe(false)
    expect(changes).toEqual([true, false])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('moves the fallback deadline when a newer animation interrupts the first', () => {
    vi.useFakeTimers()
    const tracker = createBoundedAnimationTracker(() => {})

    tracker.start()
    vi.advanceTimersByTime(500)
    tracker.start()
    vi.advanceTimersByTime(rechartsAreaAnimationFallbackDelay - 500)

    expect(tracker.isRunning()).toBe(true)

    vi.advanceTimersByTime(500)
    expect(tracker.isRunning()).toBe(false)
  })

  it('finishes once on disposal and ignores late animation callbacks', () => {
    vi.useFakeTimers()
    const changes: boolean[] = []
    const tracker = createBoundedAnimationTracker((value) =>
      changes.push(value),
    )

    tracker.start()
    tracker.dispose()

    expect(changes).toEqual([true, false])
    expect(tracker.isRunning()).toBe(false)
    expect(vi.getTimerCount()).toBe(0)

    tracker.start()
    tracker.end()
    vi.runAllTimers()

    expect(changes).toEqual([true, false])
    expect(tracker.isRunning()).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
})
