import { describe, expect, it } from 'vitest'
import {
  assertStableReleaseVersion,
  releaseTag,
} from './release-package-config.mjs'

describe('release package configuration', () => {
  it('accepts stable releases and creates their tag', () => {
    expect(() =>
      assertStableReleaseVersion('@tanstack/charts', '0.0.2'),
    ).not.toThrow()
    expect(releaseTag('0.0.2')).toBe('v0.0.2')
  })

  it('rejects prereleases before they can publish under latest', () => {
    expect(() =>
      assertStableReleaseVersion('@tanstack/charts', '0.0.2-rc.0'),
    ).toThrow('requires a stable release version')
  })

  it('rejects non-canonical versions with leading zeroes', () => {
    for (const version of ['01.2.3', '1.02.3', '1.2.03']) {
      expect(() =>
        assertStableReleaseVersion('@tanstack/charts', version),
      ).toThrow('requires a stable release version')
    }
  })
})
