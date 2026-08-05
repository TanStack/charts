import { describe, expect, it } from 'vitest'
import { readBundleConcurrency } from './measure-bundles-options.mjs'

describe('bundle build concurrency', () => {
  it.each([undefined, '', '   ', '\t\n'])(
    'uses the default for an unset or blank value %#',
    (value) => {
      expect(readBundleConcurrency(value, 4)).toBe(4)
    },
  )

  it('accepts a positive integer surrounded by whitespace', () => {
    expect(readBundleConcurrency(' 2 ', 4)).toBe(2)
  })

  it.each(['0', '-1', '1.5', 'many'])(
    'rejects invalid concurrency %s',
    (value) => {
      expect(() => readBundleConcurrency(value, 4)).toThrow(
        'BUNDLE_BUILD_CONCURRENCY must be a positive integer.',
      )
    },
  )
})
