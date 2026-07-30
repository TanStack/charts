import type {
  CatalogSourceClosure,
  CatalogSourceFile,
  CatalogSourceKind,
} from '../../../benchmarks/conformance/catalog-loader'
import type { DemoDatasetMetadata } from '@charts-poc/demo-data/metadata'

const sourceKindOrder: Record<CatalogSourceKind, number> = {
  entry: 0,
  support: 1,
  fixture: 2,
}

export function renderCatalogSourceView(closure: CatalogSourceClosure): string {
  if (!closure.files.length) {
    return '<p class="gap">No implementation yet.</p>'
  }

  const files = [...closure.files].sort(compareSourceFiles)
  const chartLines = closure.roles.entry.lines + closure.roles.support.lines
  const fixtureLines = closure.roles.fixture.lines
  const excludedHarness =
    closure.excludedHarnessPaths.length > 0
      ? `<span class="source-exclusion">Benchmark harness excluded · ${closure.excludedHarnessPaths
          .map(escapeHtml)
          .join(', ')}</span>`
      : ''

  return `
    <p class="source-accounting">
      <span>${[
        formatCount(chartLines, 'chart line'),
        fixtureLines ? formatCount(fixtureLines, 'data-selection line') : '',
        formatCount(closure.totalFiles, 'file'),
      ]
        .filter(Boolean)
        .join(' · ')}</span>
      ${excludedHarness}
    </p>
    ${closure.datasets.map(renderDataset).join('')}
    ${files.map(renderSourceFile).join('')}
  `
}

function renderDataset(dataset: DemoDatasetMetadata): string {
  const schema = dataset.schema
    .map(
      ({ name, types }) =>
        `${escapeHtml(name)} <span>${escapeHtml(types.join(' | '))}</span>`,
    )
    .join(', ')

  return `
    <section class="source-dataset" aria-label="${escapeHtml(dataset.title)} dataset">
      <div class="source-dataset-heading">
        <strong>${escapeHtml(dataset.title)}</strong>
        <span>${formatCount(dataset.records, 'record')} · ${escapeHtml(dataset.format)} · ${formatBytes(dataset.bytes)}</span>
      </div>
      <p class="source-dataset-schema">${schema}</p>
      <p class="source-dataset-provenance">
        <a href="${escapeHtml(dataset.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(dataset.source)}</a>
        <span>${escapeHtml(dataset.observablePackage)} · ${escapeHtml(dataset.license)} · SHA-256 ${escapeHtml(dataset.sha256.slice(0, 12))}</span>
        <a href="${escapeHtml(dataset.observableUrl)}" target="_blank" rel="noreferrer">Pinned snapshot</a>
      </p>
    </section>
  `
}

function renderSourceFile(file: CatalogSourceFile): string {
  const open = file.kind === 'fixture' ? '' : ' open'
  return `
    <details class="source-file source-file-${file.kind}"${open}>
      <summary>
        <span>${escapeHtml(file.path)}</span>
        <span class="source-file-meta">${formatCount(file.lines, 'line')} · ${
          file.kind
        }</span>
      </summary>
      <pre><code>${escapeHtml(file.source)}</code></pre>
    </details>
  `
}

function compareSourceFiles(
  left: CatalogSourceFile,
  right: CatalogSourceFile,
): number {
  return (
    sourceKindOrder[left.kind] - sourceKindOrder[right.kind] ||
    left.path.localeCompare(right.path)
  )
}

function formatCount(value: number, noun: string): string {
  return `${value.toLocaleString('en-US')} ${noun}${value === 1 ? '' : 's'}`
}

function formatBytes(value: number): string {
  if (value < 1_000) return `${value} B`
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)} kB`
  return `${(value / 1_000_000).toFixed(1)} MB`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
