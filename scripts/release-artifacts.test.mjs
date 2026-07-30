import { describe, expect, it } from 'vitest'
import {
  normalizeRegistryPackageMetadata,
  validatePackedEntryFiles,
} from './release-artifacts.mjs'

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

describe('packed package entry fields', () => {
  it('rejects a Svelte entry that is absent from the tarball', () => {
    expect(() =>
      validatePackedEntryFiles(
        '@tanstack/svelte-charts',
        { svelte: './src/index.ts' },
        new Set(['package.json', 'dist/index.js']),
      ),
    ).toThrow(
      '@tanstack/svelte-charts packed svelte entry is missing from tarball: ./src/index.ts',
    )
  })

  it.each(['main', 'module', 'browser', 'types', 'typings', 'svelte', 'style'])(
    'requires the top-level %s entry to name a packed file',
    (field) => {
      expect(() =>
        validatePackedEntryFiles(
          'example-package',
          { [field]: './dist/missing.js' },
          new Set(['package.json', 'dist/index.js']),
        ),
      ).toThrow(
        `example-package packed ${field} entry is missing from tarball: ./dist/missing.js`,
      )
    },
  )

  it('accepts top-level entries that are present in the tarball', () => {
    expect(() =>
      validatePackedEntryFiles(
        'example-package',
        {
          main: './dist/index.js',
          types: './dist/index.d.ts',
          svelte: './dist/index.js',
        },
        new Set(['package.json', 'dist/index.js', 'dist/index.d.ts']),
      ),
    ).not.toThrow()
  })
})
