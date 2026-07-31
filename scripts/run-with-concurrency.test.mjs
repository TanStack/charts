import { describe, expect, it } from 'vitest'
import { runWithConcurrency } from './run-with-concurrency.mjs'

describe('concurrent worker pool', () => {
  it('waits for every operation and reports failures after the pool drains', async () => {
    let active = 0
    let maximumActive = 0
    const completed = []
    const started = []
    const failure = new Error('publish failed')

    const result = runWithConcurrency([0, 1, 2, 3], 2, async (value) => {
      active += 1
      maximumActive = Math.max(maximumActive, active)
      started.push(value)
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 5))
      active -= 1
      if (value === 0) throw failure
      completed.push(value)
    })

    await expect(result).rejects.toMatchObject({
      errors: [failure],
      name: 'AggregateError',
    })
    expect(started.sort()).toEqual([0, 1, 2, 3])
    expect(completed.sort()).toEqual([1, 2, 3])
    expect(active).toBe(0)
    expect(maximumActive).toBe(2)
  })
})
