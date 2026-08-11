import { describe, expect, it } from 'vitest'
import { renderCatalogSourceView } from './source-view'
import type {
  CatalogSourceClosure,
  CatalogSourceFile,
} from '../../../benchmarks/conformance/catalog-loader'
import type { DemoDatasetMetadata } from '@charts-poc/demo-data/metadata'

describe('renderCatalogSourceView', () => {
  it('orders and opens authored source while keeping fixtures collapsed', () => {
    const closure = sourceClosure(
      [
        {
          path: 'data.ts',
          source: 'export const rows = [1]\n',
          kind: 'fixture',
          lines: 1,
          bytes: 24,
        },
        {
          path: 'model.ts',
          source: 'export const derive = <T>(rows: T[]) => rows\n',
          kind: 'support',
          lines: 1,
          bytes: 46,
        },
        {
          path: 'tanstack.ts',
          source: 'export const definition = "<chart>"\n',
          kind: 'entry',
          lines: 1,
          bytes: 36,
        },
      ],
      ['shared/mount.ts'],
    )

    const html = renderCatalogSourceView(closure)

    expect(html).toContain('2 chart lines · 1 data-selection line · 3 files')
    expect(html).toContain('Benchmark harness excluded · shared/mount.ts')
    expect(html.indexOf('tanstack.ts')).toBeLessThan(html.indexOf('model.ts'))
    expect(html.indexOf('model.ts')).toBeLessThan(html.indexOf('data.ts'))
    expect(html).toMatch(
      /<details class="source-file source-file-entry" open="">[\s\S]*tanstack\.ts/,
    )
    expect(html).toMatch(
      /<details class="source-file source-file-support" open="">[\s\S]*model\.ts/,
    )
    expect(html).toMatch(
      /<details class="source-file source-file-fixture">[\s\S]*data\.ts/,
    )
    expect(html).not.toContain('<chart>')
    expect(html).toContain('&lt;chart&gt;')
  })

  it('uses singular accounting and escapes excluded paths', () => {
    const closure = sourceClosure(
      [
        {
          path: 'plot.ts',
          source: '',
          kind: 'entry',
          lines: 1,
          bytes: 0,
        },
      ],
      ['shared/<mount>.ts'],
    )

    const html = renderCatalogSourceView(closure)

    expect(html).toContain('1 chart line · 1 file')
    expect(html).toContain('shared/&lt;mount&gt;.ts')
  })

  it('shows imported dataset schema and provenance without raw rows', () => {
    const closure = sourceClosure(
      [
        {
          path: 'tanstack.ts',
          source:
            "import { aapl } from '@charts-poc/demo-data/aapl'\nvoid aapl\n",
          kind: 'entry',
          lines: 2,
          bytes: 66,
        },
      ],
      [],
      [aaplDataset],
    )

    const html = renderCatalogSourceView(closure)

    expect(html).toContain('Apple daily stock prices')
    expect(html).toContain('1,260 records · CSV · 92.0 kB')
    expect(html).toContain('Date <span>Date</span>')
    expect(html).toContain('Yahoo! Finance')
    expect(html).toContain('@observablehq/sample-datasets@1.0.1')
    expect(html).toContain('SHA-256 0123456789ab')
    expect(html).toContain('Pinned snapshot')
  })

  it('renders an implementation gap without source accounting', () => {
    expect(
      renderCatalogSourceView({
        files: [],
        totalFiles: 0,
        totalLines: 0,
        totalBytes: 0,
        roles: {
          entry: { files: 0, lines: 0, bytes: 0 },
          support: { files: 0, lines: 0, bytes: 0 },
          fixture: { files: 0, lines: 0, bytes: 0 },
          harness: { files: 0, lines: 0, bytes: 0 },
        },
        datasets: [],
        harnessFiles: [],
        excludedHarnessPaths: [],
      }),
    ).toBe('<p class="gap">No implementation yet.</p>')
  })
})

function sourceClosure(
  files: CatalogSourceFile[],
  excludedHarnessPaths: string[],
  datasets: DemoDatasetMetadata[] = [],
): CatalogSourceClosure {
  const roles: CatalogSourceClosure['roles'] = {
    entry: { files: 0, lines: 0, bytes: 0 },
    support: { files: 0, lines: 0, bytes: 0 },
    fixture: { files: 0, lines: 0, bytes: 0 },
    harness: {
      files: excludedHarnessPaths.length,
      lines: 0,
      bytes: 0,
    },
  }

  for (const file of files) {
    roles[file.kind].files += 1
    roles[file.kind].lines += file.lines
    roles[file.kind].bytes += file.bytes
  }

  return {
    files,
    datasets,
    totalFiles: files.length,
    totalLines: files.reduce((total, file) => total + file.lines, 0),
    totalBytes: files.reduce((total, file) => total + file.bytes, 0),
    roles,
    harnessFiles: excludedHarnessPaths.map((path) => ({
      path,
      lines: 0,
      bytes: 0,
    })),
    excludedHarnessPaths,
  }
}

const aaplDataset: DemoDatasetMetadata = {
  id: 'aapl',
  title: 'Apple daily stock prices',
  specifier: '@charts-poc/demo-data/aapl',
  format: 'CSV',
  records: 1_260,
  fields: ['Date', 'Close'],
  schema: [
    { name: 'Date', types: ['Date'] },
    { name: 'Close', types: ['number'] },
  ],
  bytes: 92_000,
  sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  selection: 'Complete published snapshot',
  source: 'Yahoo! Finance',
  sourceUrl: 'https://finance.yahoo.com/lookup',
  observablePackage: '@observablehq/sample-datasets@1.0.1',
  observableRevision: '732c0148de741469b2bcc03f53d93b0ad0b93f0a',
  observableFile: 'aapl.csv',
  observableUrl: 'https://example.test/aapl.csv',
  license: 'ISC',
}
