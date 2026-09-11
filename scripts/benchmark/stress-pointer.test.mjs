import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  installStressPointerTiming,
  measureTrustedPointer,
} from './stress-pointer.mjs'

afterEach(() => vi.useRealTimers())

function fixture() {
  vi.useFakeTimers()
  let active = false,
    signature = 'before'
  const document = new EventTarget()
  const host = {
    document,
    performance: { now: () => Date.now() },
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (callback) => setTimeout(callback, 16),
    cancelAnimationFrame: clearTimeout,
    __stressPointerActive: () => active,
    __stressPointerSignature: () => signature,
  }
  installStressPointerTiming(host)
  return {
    host,
    document,
    activate() {
      active = true
    },
    change() {
      signature = 'after'
    },
  }
}

describe('stress pointer readiness and deadlines', () => {
  it('registers before returning readiness and measures from the input event', async () => {
    const f = fixture()
    expect(f.host.__stressPointerBegin('activate')).toBe(true)
    await vi.advanceTimersByTimeAsync(100)
    f.activate()
    f.document.dispatchEvent(new Event('pointermove'))
    const result = f.host.__stressPointerRead()
    await vi.advanceTimersByTimeAsync(16)
    expect(await result).toEqual({ durationMs: 16, trusted: false })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('fails missing input within two seconds, even before reading the result', async () => {
    const f = fixture()
    f.host.__stressPointerBegin('activate')
    await vi.advanceTimersByTimeAsync(2000)
    await expect(f.host.__stressPointerRead()).rejects.toThrow(
      'did not receive pointermove',
    )
    expect(vi.getTimerCount()).toBe(0)
  })

  it('fails a received input that never activates and cancels polling', async () => {
    const f = fixture()
    f.host.__stressPointerBegin('activate')
    f.document.dispatchEvent(new Event('pointermove'))
    await vi.advanceTimersByTimeAsync(2000)
    await expect(f.host.__stressPointerRead()).rejects.toThrow('did not settle')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('requires an active changed signature for a sweep', async () => {
    const f = fixture()
    f.activate()
    f.host.__stressPointerBegin('change', 'before')
    f.document.dispatchEvent(new Event('pointermove'))
    await vi.advanceTimersByTimeAsync(16)
    f.change()
    const result = f.host.__stressPointerRead()
    await vi.advanceTimersByTimeAsync(16)
    expect(await result).toEqual({
      durationMs: 32,
      trusted: false,
      signature: 'after',
    })
  })

  it('rejects invalid initial states and overlapping probes', () => {
    const f = fixture()
    expect(() => f.host.__stressPointerBegin('change', 'before')).toThrow(
      'initial state',
    )
    expect(() => f.host.__stressPointerBegin('unknown')).toThrow('Unknown')
    f.host.__stressPointerBegin('activate')
    expect(() => f.host.__stressPointerBegin('activate')).toThrow(
      'already armed',
    )
    f.host.__stressPointerCancel()
    f.activate()
    expect(() => f.host.__stressPointerBegin('activate')).toThrow(
      'initial state',
    )
  })

  it('cancels listeners and timers when the chart is cleaned up', async () => {
    const f = fixture()
    const remove = vi.spyOn(f.document, 'removeEventListener')
    f.host.__stressPointerBegin('activate')
    f.host.__stressPointerCancel()
    expect(remove).toHaveBeenCalledWith(
      'pointermove',
      expect.any(Function),
      true,
    )
    expect(vi.getTimerCount()).toBe(0)
    await expect(f.host.__stressPointerRead()).rejects.toThrow('not armed')
  })

  it('does not dispatch input until the browser acknowledges registration', async () => {
    let ready
    const registration = new Promise((resolve) => {
      ready = resolve
    })
    const evaluate = vi
      .fn()
      .mockReturnValueOnce(registration)
      .mockResolvedValueOnce({ durationMs: 1 })
    const move = vi.fn().mockResolvedValue(undefined)
    const pending = measureTrustedPointer(
      { evaluate, mouse: { move } },
      'activate',
      { x: 5, y: 6 },
    )
    expect(move).not.toHaveBeenCalled()
    ready(true)
    expect(await pending).toEqual({ durationMs: 1 })
    expect(move).toHaveBeenCalledWith(5, 6)
    expect(evaluate).toHaveBeenCalledTimes(2)
  })

  it('cancels an armed probe when dispatching input fails', async () => {
    const evaluate = vi.fn().mockResolvedValue(true)
    const move = vi.fn().mockRejectedValue(new Error('page closed'))
    await expect(
      measureTrustedPointer({ evaluate, mouse: { move } }, 'activate', {
        x: 5,
        y: 6,
      }),
    ).rejects.toThrow('page closed')
    expect(evaluate).toHaveBeenCalledTimes(2)
  })
})
