import { describe, expect, it } from 'vitest'
import {
  isUnifiedCoreExport,
  mappedUnifiedExportConditions,
  mappedUnifiedExportKey,
  unifiedPackageSources,
  validateUnifiedCoreExports,
} from './unified-package-artifact.mjs'

describe('unified package export mapping', () => {
  it('maps legacy roots and subpaths into collision-free dist trees', () => {
    expect(mappedUnifiedExportKey('react', '.')).toBe('./react')
    expect(mappedUnifiedExportKey('react', './tooltip')).toBe('./react/tooltip')
    expect(
      mappedUnifiedExportConditions('react', {
        types: './dist/tooltip.d.ts',
        import: './dist/tooltip.js',
      }),
    ).toEqual({
      types: './dist/react/tooltip.d.ts',
      import: './dist/react/tooltip.js',
    })
  })

  it('recognizes only unified core namespaces', () => {
    expect(isUnifiedCoreExport('./react')).toBe(true)
    expect(isUnifiedCoreExport('./react/tooltip')).toBe(true)
    expect(isUnifiedCoreExport('./scales/linear')).toBe(true)
    expect(isUnifiedCoreExport('./reactive')).toBe(false)
    expect(isUnifiedCoreExport('./scale')).toBe(false)
  })

  it('requires every legacy artifact export under the matching namespace', () => {
    const sourceManifests = new Map(
      unifiedPackageSources.map(({ packageName }) => [
        packageName,
        {
          exports:
            packageName === '@tanstack/charts-scales'
              ? {
                  './linear': {
                    types: './dist/linear.d.ts',
                    import: './dist/linear.js',
                  },
                }
              : {
                  '.': {
                    types: './dist/index.d.ts',
                    import: './dist/index.js',
                  },
                },
        },
      ]),
    )
    const coreExports = Object.fromEntries(
      unifiedPackageSources.map(({ packageName, namespace }) => {
        const sourceKey =
          packageName === '@tanstack/charts-scales' ? './linear' : '.'
        const sourceConditions =
          sourceManifests.get(packageName).exports[sourceKey]
        return [
          mappedUnifiedExportKey(namespace, sourceKey),
          mappedUnifiedExportConditions(namespace, sourceConditions),
        ]
      }),
    )

    expect(() =>
      validateUnifiedCoreExports(coreExports, sourceManifests),
    ).not.toThrow()
    delete coreExports['./react']
    expect(() =>
      validateUnifiedCoreExports(coreExports, sourceManifests),
    ).toThrow(
      '@tanstack/charts/react exports drifted from @tanstack/react-charts',
    )
  })
})
