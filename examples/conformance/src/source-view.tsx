import { renderToStaticMarkup } from 'react-dom/server'
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

export function CatalogSourceView({
  closure,
}: {
  closure: CatalogSourceClosure
}) {
  if (!closure.files.length) {
    return <p className="gap">No implementation yet.</p>
  }

  const files = [...closure.files].sort(compareSourceFiles)
  const chartLines = closure.roles.entry.lines + closure.roles.support.lines
  const fixtureLines = closure.roles.fixture.lines

  return (
    <>
      <p className="source-accounting">
        <span>
          {[
            formatCount(chartLines, 'chart line'),
            fixtureLines
              ? formatCount(fixtureLines, 'data-selection line')
              : '',
            formatCount(closure.totalFiles, 'file'),
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {closure.excludedHarnessPaths.length > 0 ? (
          <span className="source-exclusion">
            Benchmark harness excluded ·{' '}
            {closure.excludedHarnessPaths.join(', ')}
          </span>
        ) : null}
      </p>
      {closure.datasets.map((dataset) => (
        <SourceDataset key={dataset.id} dataset={dataset} />
      ))}
      {files.map((file) => (
        <SourceFile key={file.path} file={file} />
      ))}
    </>
  )
}

export function renderCatalogSourceView(closure: CatalogSourceClosure): string {
  return renderToStaticMarkup(<CatalogSourceView closure={closure} />)
}

function SourceDataset({ dataset }: { dataset: DemoDatasetMetadata }) {
  return (
    <section className="source-dataset" aria-label={`${dataset.title} dataset`}>
      <div className="source-dataset-heading">
        <strong>{dataset.title}</strong>
        <span>
          {formatCount(dataset.records, 'record')} · {dataset.format} ·{' '}
          {formatBytes(dataset.bytes)}
        </span>
      </div>
      <p className="source-dataset-schema">
        {dataset.schema.map(({ name, types }, index) => (
          <span key={name}>
            {index ? ', ' : null}
            {name} <span>{types.join(' | ')}</span>
          </span>
        ))}
      </p>
      <p className="source-dataset-provenance">
        <a href={dataset.sourceUrl} target="_blank" rel="noreferrer">
          {dataset.source}
        </a>
        <span>
          {dataset.observablePackage} · {dataset.license} · SHA-256{' '}
          {dataset.sha256.slice(0, 12)}
        </span>
        <a href={dataset.observableUrl} target="_blank" rel="noreferrer">
          Pinned snapshot
        </a>
      </p>
    </section>
  )
}

function SourceFile({ file }: { file: CatalogSourceFile }) {
  return (
    <details
      className={`source-file source-file-${file.kind}`}
      open={file.kind !== 'fixture'}
    >
      <summary>
        <span>{file.path}</span>
        <span className="source-file-meta">
          {formatCount(file.lines, 'line')} · {file.kind}
        </span>
      </summary>
      <pre>
        <code>{file.source}</code>
      </pre>
    </details>
  )
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
