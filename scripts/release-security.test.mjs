import { describe, expect, it } from 'vitest'
import { validateTrustedPublishingNpmVersion } from './release-security.mjs'

describe('npm trusted publishing', () => {
  it('requires an npm version with OIDC support', () => {
    expect(() => validateTrustedPublishingNpmVersion('11.5.1\n')).not.toThrow()
    expect(() => validateTrustedPublishingNpmVersion('11.18.0')).not.toThrow()
    expect(() => validateTrustedPublishingNpmVersion('11.5.0')).toThrow(
      /11\.5\.1 or newer/,
    )
  })
})
