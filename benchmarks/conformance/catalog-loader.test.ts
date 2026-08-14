import { describe, expect, it } from 'vitest'
import {
  countCatalogSourceBytes,
  countCatalogSourceLines,
  loadCatalogSourceClosure,
} from './catalog-loader'

describe('loadCatalogSourceClosure', () => {
  it('loads authored support and fixture dependencies without harness code', async () => {
    const entrySource =
      "import { rows } from './data'\nimport { derive } from './transform'\nimport { mount } from '../../shared/mount'\nimport '../other/plot'\nexport { derive, mount, rows }\n"
    const dataSource =
      "import { sharedRows } from '../../shared/data'\nexport const rows = sharedRows\n"
    const transformSource =
      "export const derive = async () => import('./transform-helper')\n"
    const transformHelperSource = 'export const helper = true\n'
    const sharedDataSource = 'export const sharedRows = [1, 2, 3]\n'
    const harnessSource = 'export const mount = () => {}\n'

    const modules = {
      './cases/example/tanstack.ts': async () => entrySource,
      './cases/example/data.ts': async () => dataSource,
      './cases/example/transform.ts': async () => transformSource,
      './cases/example/transform-helper.ts': async () => transformHelperSource,
      './cases/other/plot.ts': async () => 'export const mount = () => {}\n',
      './shared/data.ts': async () => sharedDataSource,
      './shared/mount.ts': async () => harnessSource,
    }

    await expect(
      loadCatalogSourceClosure(modules, './cases/example/tanstack.ts'),
    ).resolves.toEqual({
      files: [
        {
          path: 'tanstack.ts',
          source: entrySource,
          kind: 'entry',
          lines: 5,
          bytes: countCatalogSourceBytes(entrySource),
        },
        {
          path: 'transform-helper.ts',
          source: transformHelperSource,
          kind: 'support',
          lines: 1,
          bytes: countCatalogSourceBytes(transformHelperSource),
        },
        {
          path: 'transform.ts',
          source: transformSource,
          kind: 'support',
          lines: 1,
          bytes: countCatalogSourceBytes(transformSource),
        },
        {
          path: 'data.ts',
          source: dataSource,
          kind: 'fixture',
          lines: 2,
          bytes: countCatalogSourceBytes(dataSource),
        },
        {
          path: 'shared/data.ts',
          source: sharedDataSource,
          kind: 'fixture',
          lines: 1,
          bytes: countCatalogSourceBytes(sharedDataSource),
        },
      ],
      datasets: [],
      totalFiles: 5,
      totalLines: 10,
      totalBytes:
        countCatalogSourceBytes(entrySource) +
        countCatalogSourceBytes(transformHelperSource) +
        countCatalogSourceBytes(transformSource) +
        countCatalogSourceBytes(dataSource) +
        countCatalogSourceBytes(sharedDataSource),
      roles: {
        entry: {
          files: 1,
          lines: 5,
          bytes: countCatalogSourceBytes(entrySource),
        },
        support: {
          files: 2,
          lines: 2,
          bytes:
            countCatalogSourceBytes(transformHelperSource) +
            countCatalogSourceBytes(transformSource),
        },
        fixture: {
          files: 2,
          lines: 3,
          bytes:
            countCatalogSourceBytes(dataSource) +
            countCatalogSourceBytes(sharedDataSource),
        },
        harness: {
          files: 1,
          lines: 1,
          bytes: countCatalogSourceBytes(harnessSource),
        },
      },
      harnessFiles: [
        {
          path: 'shared/mount.ts',
          lines: 1,
          bytes: countCatalogSourceBytes(harnessSource),
        },
      ],
      excludedHarnessPaths: ['shared/mount.ts'],
    })
  })

  it('follows TSX views and records the React mount as harness code', async () => {
    const entrySource = "export { mount } from './view'\n"
    const viewSource =
      "import { reactMount } from '../../shared/react-mount'\nexport const mount = reactMount(() => null)\n"
    const harnessSource = 'export const reactMount = () => {}\n'
    const modules = {
      './cases/example/tanstack.ts': async () => entrySource,
      './cases/example/view.tsx': async () => viewSource,
      './shared/react-mount.ts': async () => harnessSource,
    }

    const closure = await loadCatalogSourceClosure(
      modules,
      './cases/example/tanstack.ts',
    )

    expect(closure.files.map(({ kind, path }) => ({ kind, path }))).toEqual([
      { kind: 'entry', path: 'tanstack.ts' },
      { kind: 'support', path: 'view.tsx' },
    ])
    expect(closure.harnessFiles).toEqual([
      {
        path: 'shared/react-mount.ts',
        lines: 1,
        bytes: countCatalogSourceBytes(harnessSource),
      },
    ])
  })

  it('reports pinned demo datasets imported by transitive source files', async () => {
    const modules = {
      './cases/example/tanstack.ts': async () =>
        "import { rows } from './data'\nexport { rows }\n",
      './cases/example/data.ts': async () =>
        "import { aapl } from '@charts-poc/demo-data/aapl'\nimport type { AaplRow } from '@charts-poc/demo-data/aapl'\nexport const rows: readonly AaplRow[] = aapl\n",
    }

    const closure = await loadCatalogSourceClosure(
      modules,
      './cases/example/tanstack.ts',
    )

    expect(closure.datasets).toHaveLength(1)
    expect(closure.datasets[0]).toMatchObject({
      id: 'aapl',
      title: 'Apple daily stock prices',
      specifier: '@charts-poc/demo-data/aapl',
      records: 1_260,
      fields: ['Date', 'Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume'],
      observablePackage: '@observablehq/sample-datasets@1.0.1',
    })
  })

  it('follows cross-case fixtures without exposing another renderer entry', async () => {
    const modules = {
      './cases/example/tanstack.ts': async () =>
        "import { atlas } from '../atlas/atlas-data'\nimport '../atlas/tanstack'\nexport { atlas }\n",
      './cases/atlas/atlas-data.ts': async () =>
        'export const atlas = { type: "FeatureCollection" }\n',
      './cases/atlas/tanstack.ts': async () =>
        'export const mount = () => {}\n',
    }

    const closure = await loadCatalogSourceClosure(
      modules,
      './cases/example/tanstack.ts',
    )

    expect(closure.files.map(({ path }) => path)).toEqual([
      'tanstack.ts',
      'cases/atlas/atlas-data.ts',
    ])
    expect(closure.files[1]?.kind).toBe('fixture')
  })

  it('follows shared fixture dependencies transitively', async () => {
    const modules = {
      './cases/example/tanstack.ts': async () =>
        "import { regions } from '../../shared/fixtures/world-geo'\nexport { regions }\n",
      './shared/fixtures/world-geo.ts': async () =>
        "import { coordinates } from './world-coordinates'\nexport const regions = coordinates\n",
      './shared/fixtures/world-coordinates.ts': async () =>
        'export const coordinates = [[0, 0]]\n',
    }

    const closure = await loadCatalogSourceClosure(
      modules,
      './cases/example/tanstack.ts',
    )

    expect(closure.files.map(({ kind, path }) => ({ kind, path }))).toEqual([
      { kind: 'entry', path: 'tanstack.ts' },
      {
        kind: 'fixture',
        path: 'shared/fixtures/world-coordinates.ts',
      },
      { kind: 'fixture', path: 'shared/fixtures/world-geo.ts' },
    ])
  })

  it('opens shared transforms while keeping their raw fixtures collapsed', async () => {
    const modules = {
      './cases/example/tanstack.ts': async () =>
        "import { joined } from '../../shared/transforms/join'\nexport { joined }\n",
      './shared/transforms/join.ts': async () =>
        "import { rows } from '../fixtures/rows'\nexport const joined = rows.map((row) => ({ ...row, value: row.raw * 2 }))\n",
      './shared/fixtures/rows.ts': async () =>
        'export const rows = [{ raw: 2 }]\n',
    }

    const closure = await loadCatalogSourceClosure(
      modules,
      './cases/example/tanstack.ts',
    )

    expect(closure.files.map(({ kind, path }) => ({ kind, path }))).toEqual([
      { kind: 'entry', path: 'tanstack.ts' },
      { kind: 'support', path: 'shared/transforms/join.ts' },
      { kind: 'fixture', path: 'shared/fixtures/rows.ts' },
    ])
    expect(closure.roles.support.files).toBe(1)
    expect(closure.roles.fixture.files).toBe(1)
  })

  it('includes reusable shadcn chart primitives and their data', async () => {
    const modules = {
      './cases/example/tanstack.ts': async () =>
        "import { example } from '../../shared/shadcn-catalog-tanstack'\nexport { example }\n",
      './shared/shadcn-catalog-tanstack.ts': async () =>
        "import { rows } from './shadcn-catalog-data'\nexport const example = rows\n",
      './shared/shadcn-catalog-data.ts': async () =>
        'export const rows = [1, 2, 3]\n',
    }

    const closure = await loadCatalogSourceClosure(
      modules,
      './cases/example/tanstack.ts',
    )

    expect(closure.files.map(({ kind, path }) => ({ kind, path }))).toEqual([
      { kind: 'entry', path: 'tanstack.ts' },
      { kind: 'support', path: 'shared/shadcn-catalog-tanstack.ts' },
      { kind: 'fixture', path: 'shared/shadcn-catalog-data.ts' },
    ])
  })

  it('includes case-local model modules as authored support', async () => {
    const entrySource =
      "import { selectedRows } from './model'\nexport { selectedRows }\n"
    const modelSource =
      "import { rows } from './data'\nexport const selectedRows = rows.slice(0, 1)\n"
    const dataSource = 'export const rows = [1, 2, 3]\n'
    const modules = {
      './cases/example/tanstack.ts': async () => entrySource,
      './cases/example/model.ts': async () => modelSource,
      './cases/example/data.ts': async () => dataSource,
    }

    const closure = await loadCatalogSourceClosure(
      modules,
      './cases/example/tanstack.ts',
    )

    expect(closure.files.map(({ kind, path }) => ({ kind, path }))).toEqual([
      { kind: 'entry', path: 'tanstack.ts' },
      { kind: 'support', path: 'model.ts' },
      { kind: 'fixture', path: 'data.ts' },
    ])
    expect(closure.roles.support.files).toBe(1)
    expect(closure.roles.fixture.files).toBe(1)
  })

  it('counts logical source lines without adding a trailing empty line', () => {
    expect(countCatalogSourceLines('')).toBe(0)
    expect(countCatalogSourceLines('one')).toBe(1)
    expect(countCatalogSourceLines('one\n')).toBe(1)
    expect(countCatalogSourceLines('one\r\ntwo\r\n')).toBe(2)
    expect(countCatalogSourceLines('one\rtwo\r')).toBe(2)
    expect(countCatalogSourceLines('one\n\n')).toBe(2)
    expect(countCatalogSourceLines('\n')).toBe(1)
  })

  it('counts UTF-8 source bytes', () => {
    expect(countCatalogSourceBytes('plain')).toBe(5)
    expect(countCatalogSourceBytes('São Paulo')).toBe(10)
  })
})
