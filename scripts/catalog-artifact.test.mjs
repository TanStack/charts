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
const sourceText = {
  tanstack:
    "import { rows } from './data'\nimport { derive } from './transform'\nimport { mount } from '../../shared/mount'\nexport { derive, mount, rows }\n",
  plot: "import { rows } from './data'\nimport { mount } from '../../shared/mount'\nexport { mount, rows }\n",
  data: "import { base } from '../../shared/fixtures/base'\nexport const rows = base\n",
  transform: 'export const derive = (rows) => rows\n',
  fixture: 'export const base = [1, 2, 3]\n',
  harness: 'export const mount = () => {}\n',
}
const sourceModules = {
  './cases/01-line/tanstack.ts': async () => sourceText.tanstack,
  './cases/01-line/plot.ts': async () => sourceText.plot,
  './cases/01-line/data.ts': async () => sourceText.data,
  './cases/01-line/transform.ts': async () => sourceText.transform,
  './shared/fixtures/base.ts': async () => sourceText.fixture,
  './shared/mount.ts': async () => sourceText.harness,
}

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
    expect(catalog).toMatchObject({
      schemaVersion: 4,
      source: {
        repo: 'tanstack/charts',
        ref: revision,
        pathRoot: 'benchmarks/conformance/',
      },
    })
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
    expect(catalog.cases[0].authoredSource.tanstack).toEqual({
      totalFiles: 4,
      totalLines: 8,
      totalBytes:
        byteLength(sourceText.tanstack) +
        byteLength(sourceText.transform) +
        byteLength(sourceText.data) +
        byteLength(sourceText.fixture),
      datasetIds: [],
      roles: {
        entry: {
          files: 1,
          lines: 4,
          bytes: byteLength(sourceText.tanstack),
          paths: ['cases/01-line/tanstack.ts'],
        },
        support: {
          files: 1,
          lines: 1,
          bytes: byteLength(sourceText.transform),
          paths: ['cases/01-line/transform.ts'],
        },
        fixture: {
          files: 2,
          lines: 3,
          bytes: byteLength(sourceText.data) + byteLength(sourceText.fixture),
          paths: ['cases/01-line/data.ts', 'shared/fixtures/base.ts'],
        },
        harness: {
          files: 1,
          lines: 1,
          bytes: byteLength(sourceText.harness),
          paths: ['shared/mount.ts'],
        },
      },
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
      sourceModules,
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
        sourceModules,
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
        sourceModules,
        readAsset: async (assetPath) => contents.get(assetPath),
      }),
    ).rejects.toThrow('invalid catalog asset path')
  })

  it('rejects assets outside the implementation closure', async () => {
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

    expect(() => validateCatalogArtifactManifest(catalog)).toThrow(
      'assets outside the implementation closure',
    )
  })

  it('rejects non-debug comparisons', async () => {
    const artifact = await createArtifact()
    const catalog = attachEmbedContract(artifact.catalog, {
      protocol: { version: 1 },
    })
    catalog.cases[0].modules.comparison.visibility = 'public'

    expect(() => validateCatalogArtifactManifest(catalog)).toThrow(
      'comparison must be debug-only',
    )
  })

  it('rejects source references to datasets outside the registry', async () => {
    const artifact = await createArtifact()
    const catalog = attachEmbedContract(artifact.catalog, {
      protocol: { version: 1 },
    })
    catalog.cases[0].authoredSource.tanstack.datasetIds = ['missing']

    expect(() => validateCatalogArtifactManifest(catalog)).toThrow(
      'dataset ids are invalid',
    )
  })

  it('rejects source totals that include excluded harness code', async () => {
    const artifact = await createArtifact()
    const catalog = attachEmbedContract(artifact.catalog, {
      protocol: { version: 1 },
    })
    catalog.cases[0].authoredSource.tanstack.totalLines +=
      catalog.cases[0].authoredSource.tanstack.roles.harness.lines

    expect(() => validateCatalogArtifactManifest(catalog)).toThrow(
      'totals include excluded or missing files',
    )
  })

  it('rejects source role counts that do not match their paths', async () => {
    const artifact = await createArtifact()
    const catalog = attachEmbedContract(artifact.catalog, {
      protocol: { version: 1 },
    })
    catalog.cases[0].authoredSource.tanstack.roles.support.files += 1

    expect(() => validateCatalogArtifactManifest(catalog)).toThrow(
      'file count does not match paths',
    )
  })

  it('rejects source metrics without source files', async () => {
    const artifact = await createArtifact()
    const catalog = attachEmbedContract(artifact.catalog, {
      protocol: { version: 1 },
    })
    catalog.cases[0].authoredSource.tanstack.roles.support.files = 0
    catalog.cases[0].authoredSource.tanstack.roles.support.paths = []

    expect(() => validateCatalogArtifactManifest(catalog)).toThrow(
      'metrics without files',
    )
  })

  it('rejects harness paths assigned to authored roles', async () => {
    const artifact = await createArtifact()
    const catalog = attachEmbedContract(artifact.catalog, {
      protocol: { version: 1 },
    })
    catalog.cases[0].authoredSource.tanstack.roles.support.paths[0] =
      'shared/mount.ts'

    expect(() => validateCatalogArtifactManifest(catalog)).toThrow(
      'assigns a harness path to support',
    )
  })

  it('rejects one source path assigned to multiple roles', async () => {
    const artifact = await createArtifact()
    const catalog = attachEmbedContract(artifact.catalog, {
      protocol: { version: 1 },
    })
    catalog.cases[0].authoredSource.tanstack.roles.support.paths[0] =
      'cases/01-line/tanstack.ts'

    expect(() => validateCatalogArtifactManifest(catalog)).toThrow(
      'duplicate path',
    )
  })

  it('rejects source metadata with the wrong entry path', async () => {
    const artifact = await createArtifact()
    const catalog = attachEmbedContract(artifact.catalog, {
      protocol: { version: 1 },
    })
    catalog.cases[0].authoredSource.tanstack.roles.entry.paths[0] =
      'cases/01-line/other.ts'

    expect(() => validateCatalogArtifactManifest(catalog)).toThrow(
      'must contain one entry file',
    )
  })

  it('rejects non-harness files in the harness role', async () => {
    const artifact = await createArtifact()
    const catalog = attachEmbedContract(artifact.catalog, {
      protocol: { version: 1 },
    })
    catalog.cases[0].authoredSource.tanstack.roles.harness.paths[0] =
      'shared/helper.ts'

    expect(() => validateCatalogArtifactManifest(catalog)).toThrow(
      'invalid harness path',
    )
  })
})

function createArtifact() {
  return createCatalogArtifact({
    cases,
    revision,
    viteManifest,
    sourceModules,
    readAsset: async (assetPath) => contents.get(assetPath),
  })
}

function bytes(value) {
  return new TextEncoder().encode(value)
}

function byteLength(value) {
  return bytes(value).byteLength
}
