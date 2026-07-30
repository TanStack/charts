import { describe, expect, it } from 'vitest'
import { normalizeRegistryPackageMetadata } from './release-artifacts.mjs'

describe('release registry metadata', () => {
  it('normalizes dotted npm view fields', () => {
    expect(
      normalizeRegistryPackageMetadata({
        name: '@tanstack/charts',
        version: '0.0.1',
        'dist.integrity': 'sha512-example',
        'dist.attestations': { url: 'https://registry.example/attestations' },
      }),
    ).toMatchObject({
      name: '@tanstack/charts',
      version: '0.0.1',
      dist: {
        integrity: 'sha512-example',
        attestations: { url: 'https://registry.example/attestations' },
      },
    })
  })

  it('preserves nested registry metadata', () => {
    const metadata = {
      name: '@tanstack/charts',
      version: '0.0.1',
      dist: {
        integrity: 'sha512-example',
        attestations: { url: 'https://registry.example/attestations' },
      },
    }
    expect(normalizeRegistryPackageMetadata(metadata)).toBe(metadata)
  })
})
