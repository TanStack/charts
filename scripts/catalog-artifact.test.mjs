import { describe, expect, it } from 'vitest'
import {
  attachEmbedContract,
  createCatalogArtifact,
  validateCatalogArtifactManifest,
} from './catalog-artifact.mjs'

const revision = 'a'.repeat(40)
const cases = [
  {
    directory: '01-line',
    metadata: {
      schemaVersion: 1,
      order: 1,
      id: '01-line',
      title: 'Line',
      family: 'trend',
      intent: 'Show change.',
      support: 'native',
      features: ['line'],
      geometry: [{ role: 'line', count: 1 }],
      source: { title: 'Plot line', url: 'https://example.com/line' },
      ai: { create: 'Create it.', maintain: 'Maintain it.' },
    },
  },
]
const viteManifest = {
  '../../benchmarks/conformance/cases/01-line/tanstack.ts': {
    file: 'assets/tanstack-AAAA1111.js',
    src: '../../benchmarks/conformance/cases/01-line/tanstack.ts',
    isDynamicEntry: true,
    imports: ['_shared.js'],
  },
  '../../benchmarks/conformance/cases/01-line/plot.ts': {
    file: 'assets/plot-BBBB2222.js',
    src: '../../benchmarks/conformance/cases/01-line/plot.ts',
    isDynamicEntry: true,
    imports: ['_plot.js', '_shared.js'],
  },
  '../../benchmarks/conformance/cases/01-line/tanstack.ts?raw': {
    file: 'assets/tanstack-source-CCCC3333.js',
    src: '../../benchmarks/conformance/cases/01-line/tanstack.ts?raw',
    isDynamicEntry: true,
  },
  '_shared.js': {
    file: 'assets/shared-DDDD4444.js',
  },
  '_plot.js': {
    file: 'assets/plot-runtime-EEEE5555.js',
    imports: ['_shared.js'],
  },
  'index.html': {
    file: 'assets/index-FFFF6666.js',
    isEntry: true,
  },
}
const contents = new Map([
  ['assets/tanstack-AAAA1111.js', bytes('tanstack')],
  ['assets/plot-BBBB2222.js', bytes('plot')],
  ['assets/shared-DDDD4444.js', bytes('shared')],
  ['assets/plot-runtime-EEEE5555.js', bytes('plot-runtime')],
])

describe('catalog artifact', () => {
  it('publishes only the recursive implementation closure', async () => {
    const artifact = await createArtifact()
    const catalog = attachEmbedContract(artifact.catalog, {
      protocol: { version: 1 },
    })
    const summary = validateCatalogArtifactManifest(catalog)

    expect([...artifact.assetContents.keys()].sort()).toEqual(
      [...contents.keys()].sort(),
    )
    expect(Object.keys(catalog.assets).sort()).toEqual(
      [...contents.keys()].sort(),
    )
    expect(catalog.cases[0].modules).toEqual({
      tanstack: {
        path: 'assets/tanstack-AAAA1111.js',
        preload: ['assets/shared-DDDD4444.js'],
      },
      comparison: {
        renderer: 'observable-plot',
        path: 'assets/plot-BBBB2222.js',
        preload: [
          'assets/plot-runtime-EEEE5555.js',
          'assets/shared-DDDD4444.js',
        ],
        visibility: 'debug',
      },
    })
    expect(catalog.cases[0].code).toEqual({
      tanstack: 'benchmarks/conformance/cases/01-line/tanstack.ts',
      reference: 'benchmarks/conformance/cases/01-line/plot.ts',
    })
    expect(summary).toMatchObject({
      assetCount: 4,
      caseCount: 1,
      referenceCounts: {
        'observable-plot': 1,
        recharts: 0,
        echarts: 0,
      },
    })
  })

  it('hashes emitted bytes deterministically', async () => {
    const left = await createArtifact()
    const right = await createArtifact()

    expect(left.catalog.assets).toEqual(right.catalog.assets)
    expect(left.catalog.assets['assets/tanstack-AAAA1111.js']).toEqual({
      bytes: 8,
      sha256:
        '8b0580d3326507f3298f05caff42ea5511092530141a871b84a28ffaa3365475',
      imports: ['assets/shared-DDDD4444.js'],
      dynamicImports: [],
    })
  })

  it('keeps a cyclic root out of its own preload closure', async () => {
    const cyclicManifest = structuredClone(viteManifest)
    cyclicManifest['_shared.js'].imports = [
      '../../benchmarks/conformance/cases/01-line/tanstack.ts',
    ]
    const artifact = await createCatalogArtifact({
      cases,
      revision,
      viteManifest: cyclicManifest,
      readAsset: async (assetPath) => contents.get(assetPath),
    })
    const catalog = attachEmbedContract(artifact.catalog, {
      protocol: { version: 1 },
    })

    expect(catalog.cases[0].modules.tanstack.preload).toEqual([
      'assets/shared-DDDD4444.js',
    ])
    expect(() => validateCatalogArtifactManifest(catalog)).not.toThrow()
  })

  it('rejects assets outside a safe relative module path', async () => {
    const invalidManifest = structuredClone(viteManifest)
    invalidManifest['_shared.js'].file = '../shared.js'

    await expect(
      createCatalogArtifact({
        cases,
        revision,
        viteManifest: invalidManifest,
        readAsset: async (assetPath) => contents.get(assetPath),
      }),
    ).rejects.toThrow('invalid catalog asset path')
  })

  it('rejects module names without a content hash', async () => {
    const invalidManifest = structuredClone(viteManifest)
    invalidManifest['_shared.js'].file = 'assets/shared.js'

    await expect(
      createCatalogArtifact({
        cases,
        revision,
        viteManifest: invalidManifest,
        readAsset: async (assetPath) => contents.get(assetPath),
      }),
    ).rejects.toThrow('invalid catalog asset path')
  })

  it('rejects unreferenced files and non-debug comparisons', async () => {
    const artifact = await createArtifact()
    const catalog = attachEmbedContract(artifact.catalog, {
      protocol: { version: 1 },
    })
    catalog.assets['assets/extra-GGGG7777.js'] = {
      bytes: 1,
      sha256: 'b'.repeat(64),
      imports: [],
      dynamicImports: [],
    }
    catalog.cases[0].modules.comparison.visibility = 'public'

    expect(() => validateCatalogArtifactManifest(catalog)).toThrow(
      'comparison must be debug-only',
    )
  })
})

function createArtifact() {
  return createCatalogArtifact({
    cases,
    revision,
    viteManifest,
    readAsset: async (assetPath) => contents.get(assetPath),
  })
}

function bytes(value) {
  return new TextEncoder().encode(value)
}
