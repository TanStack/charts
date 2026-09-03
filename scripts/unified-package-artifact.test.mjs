import { describe, expect, it } from 'vitest'
import {
  isUnifiedCoreExport,
  linkedUnifiedConsumerDependencies,
  mappedUnifiedExportConditions,
  mappedUnifiedExportKey,
  unifiedConsumerWorkspace,
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

  it('links every packed dependency without resolving its published range', () => {
    const linkedDependencies = linkedUnifiedConsumerDependencies({
      repositoryRoot: '/workspace',
      packageDirectory: 'charts-core',
      dependencies: {
        tslib: '^2.8.1',
        '@types/d3-geo': '^3.1.0',
      },
    })

    expect(linkedDependencies).toEqual({
      '@types/d3-geo':
        'link:/workspace/packages/charts-core/node_modules/@types/d3-geo',
      tslib: 'link:/workspace/packages/charts-core/node_modules/tslib',
    })
    expect(unifiedConsumerWorkspace(linkedDependencies)).toBe(
      `packages:\n  - '.'\nautoInstallPeers: false\noverrides:\n  "@types/d3-geo": "link:/workspace/packages/charts-core/node_modules/@types/d3-geo"\n  "tslib": "link:/workspace/packages/charts-core/node_modules/tslib"\n`,
    )
  })
})
