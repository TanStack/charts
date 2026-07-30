import { describe, expect, it } from 'vitest'
import { isExactNpmPackageVersion } from './package-version.mjs'

describe('release package versions', () => {
  it.each(['0.0.1', '1.2.3-beta.1', '1.2.3-rc.1+build.5'])(
    'accepts exact npm semver %s',
    (version) => {
      expect(isExactNpmPackageVersion(version)).toBe(true)
    },
  )

  it.each(['latest', ' ', 'v1.2.3', '1.2'])(
    'rejects non-version value %j',
    (version) => {
      expect(isExactNpmPackageVersion(version)).toBe(false)
    },
  )
})
