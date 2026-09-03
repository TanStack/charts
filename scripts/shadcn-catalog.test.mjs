import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  compareShadcnCatalog,
  shadcnFamilyCounts,
  validateShadcnCatalog,
} from './shadcn-catalog.mjs'

const catalogPath = path.resolve(
  import.meta.dirname,
  '../benchmarks/conformance/shadcn/catalog.json',
)

describe('shadcn catalog inventory', () => {
  it('pins and maps every upstream example', async () => {
    const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
    expect(validateShadcnCatalog(catalog)).toEqual({
      caseCount: 70,
      implementedCount: 70,
    })
    expect(
      Object.fromEntries(
        Object.keys(shadcnFamilyCounts).map((family) => [
          family,
          catalog.cases.filter((entry) => entry.family === family).length,
        ]),
      ),
    ).toEqual(shadcnFamilyCounts)
  })

  it('reports source changes, additions, and removals by Git blob SHA', async () => {
    const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
    const tree = [
      {
        path: catalog.upstream.registryPath,
        sha: catalog.upstream.registryBlobSha,
        type: 'blob',
      },
      ...catalog.cases.slice(0, -1).map((entry, index) => ({
        path: entry.path,
        sha: index === 0 ? '0'.repeat(40) : entry.blobSha,
        type: 'blob',
      })),
      {
        path: `${catalog.upstream.pathRoot}/chart-line-new.tsx`,
        sha: '1'.repeat(40),
        type: 'blob',
      },
    ]
    const drift = compareShadcnCatalog(catalog, tree, '2'.repeat(40))
    expect(drift.changed).toEqual([
      catalog.cases[0].path,
      catalog.cases.at(-1).path,
    ])
    expect(drift.added).toEqual([
      `${catalog.upstream.pathRoot}/chart-line-new.tsx`,
    ])
    expect(drift.removed).toEqual([catalog.cases.at(-1).path])
  })
})
