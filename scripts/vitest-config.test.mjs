import { describe, expect, it } from 'vitest'
import { configDefaults } from 'vitest/config'
import config from '../vitest.config.ts'

describe('root Vitest configuration', () => {
  it('retains every default exclusion before adding framework exclusions', () => {
    expect(config.test.exclude).toEqual(
      expect.arrayContaining(configDefaults.exclude),
    )
  })
})
