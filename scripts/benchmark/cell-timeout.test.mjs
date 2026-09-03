import { describe, expect, it } from 'vitest'
import { CellTimeoutError } from './cell-timeout.mjs'

describe('CellTimeoutError', () => {
  it('is initialized before benchmark top-level execution can time out', () => {
    const error = new CellTimeoutError(120_000)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(CellTimeoutError)
    expect(error.name).toBe('CellTimeoutError')
    expect(error.message).toBe('Cell exceeded 120000 ms.')
  })
})
