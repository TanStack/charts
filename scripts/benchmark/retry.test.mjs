import { describe, expect, it, vi } from 'vitest'
import {
  collectRetryRecords,
  retryFailedResult,
  retryProgressSymbol,
} from './retry.mjs'

describe('retryFailedResult', () => {
  it('returns a clean result without retrying', async () => {
    const run = vi.fn().mockResolvedValue({ status: 'ok', value: 1 })

    await expect(retryFailedResult(run, 'timing')).resolves.toEqual({
      status: 'ok',
      value: 1,
    })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('records a recovered fresh attempt', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({
        status: 'error',
        error: 'browser stalled',
        retryable: true,
      })
      .mockResolvedValueOnce({ status: 'ok', value: 2 })

    await expect(retryFailedResult(run, 'timing')).resolves.toEqual({
      status: 'ok',
      value: 2,
      recovery: {
        phase: 'timing',
        attempts: 2,
        recovered: true,
        errors: ['browser stalled'],
      },
    })
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('preserves a reproducible second failure', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({
        status: 'error',
        error: 'first failure',
        retryable: true,
      })
      .mockResolvedValueOnce({ status: 'error', error: 'second failure' })

    await expect(retryFailedResult(run, 'memory')).resolves.toEqual({
      status: 'error',
      error: 'second failure',
      recovery: {
        phase: 'memory',
        attempts: 2,
        recovered: false,
        errors: ['first failure', 'second failure'],
      },
    })
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('does not retry a renderer or protocol failure', async () => {
    const failure = {
      status: 'error',
      error: 'Renderer output is blank.',
      retryable: false,
    }
    const run = vi.fn().mockResolvedValue(failure)

    await expect(retryFailedResult(run, 'timing')).resolves.toBe(failure)
    expect(run).toHaveBeenCalledTimes(1)
  })
})

describe('retry reporting', () => {
  it('marks timing and memory recovery or persistent failure', () => {
    expect(
      retryProgressSymbol({
        status: 'ok',
        recovery: { recovered: true },
      }),
    ).toBe('r')
    expect(
      retryProgressSymbol(
        { status: 'ok' },
        {
          status: 'ok',
          recovery: { recovered: true },
        },
      ),
    ).toBe('r')
    expect(
      retryProgressSymbol(
        { status: 'ok' },
        {
          status: 'error',
          recovery: { recovered: false },
        },
      ),
    ).toBe('x')
    expect(
      retryProgressSymbol({
        status: 'error',
        recovery: { recovered: false },
      }),
    ).toBe('x')
  })

  it('retains recovered and persistent retry records for disclosure', () => {
    const recovered = {
      phase: 'timing',
      attempts: 2,
      recovered: true,
      errors: ['timeout'],
    }
    const persistent = {
      phase: 'memory',
      attempts: 2,
      recovered: false,
      errors: ['context closed', 'context closed again'],
    }

    expect(
      collectRetryRecords([
        { id: 'clean', status: 'ok' },
        { id: 'recovered', status: 'ok', recovery: recovered },
        {
          id: 'persistent',
          status: 'ok',
          memory: { status: 'error', recovery: persistent },
        },
      ]),
    ).toEqual([
      { id: 'recovered', phase: 'timing', recovery: recovered },
      { id: 'persistent', phase: 'memory', recovery: persistent },
    ])
  })
})
