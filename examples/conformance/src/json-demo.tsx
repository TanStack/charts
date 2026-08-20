import * as React from 'react'
import { Chart } from '@tanstack/charts/react'
import {
  ChartJsonError,
  chartFromJson,
  chartJsonVersion,
  type ChartJsonIssue,
} from '@tanstack/charts/json'
import barSource from '../../../packages/charts-core/schemas/example.json?raw'

interface DemoRow {
  readonly category: string
  readonly date: string
  readonly value: number
}

const replacementRows: readonly (readonly DemoRow[])[] = [
  [
    { category: 'Alpha', date: '2026-01-01', value: 11 },
    { category: 'Beta', date: '2026-01-02', value: 6 },
    { category: 'Gamma', date: '2026-01-03', value: 15 },
  ],
  [
    { category: 'Alpha', date: '2026-01-01', value: 4 },
    { category: 'Beta', date: '2026-01-02', value: 17 },
    { category: 'Gamma', date: '2026-01-03', value: 9 },
  ],
]

const donutSource = JSON.stringify(
  {
    $schema: `https://unpkg.com/@tanstack/charts@${chartJsonVersion}/schemas/chart.json`,
    chartsVersion: chartJsonVersion,
    spec: {
      marks: [
        {
          $call: 'tanstack.mark.pie',
          data: { $data: 'rows' },
          category: 'category',
          value: 'value',
          innerRadiusRatio: 0.55,
        },
      ],
      color: {
        legend: {
          $call: 'tanstack.legend.color',
          label: 'Category',
          placement: 'bottom',
        },
      },
    },
    data: {
      rows: [
        { category: 'Alpha', value: 8 },
        { category: 'Beta', value: 13 },
        { category: 'Gamma', value: 5 },
      ],
    },
    metadata: {
      title: 'Category share',
      description:
        'Shares for Alpha, Beta, and Gamma. Set innerRadiusRatio to 0 for a pie.',
    },
  },
  null,
  2,
)

const annotationsSource = JSON.stringify(
  {
    $schema: `https://unpkg.com/@tanstack/charts@${chartJsonVersion}/schemas/chart.json`,
    chartsVersion: chartJsonVersion,
    spec: {
      marks: [
        {
          $call: 'tanstack.mark.line-y',
          data: { $data: 'rows' },
          x: {
            $call: 'tanstack.accessor.iso-date',
            field: 'date',
          },
          y: 'value',
          points: true,
          strokeWidth: 2,
        },
        {
          $call: 'tanstack.mark.rule-y',
          data: { $data: 'thresholds' },
          y: 'value',
          stroke: '#dc2626',
          strokeWidth: 1.5,
          strokeDasharray: '6 4',
        },
        {
          $call: 'tanstack.mark.rule-x',
          data: { $data: 'events' },
          x: {
            $call: 'tanstack.accessor.iso-date',
            field: 'date',
          },
          stroke: '#7c3aed',
          strokeWidth: 1.5,
          strokeDasharray: '2 3',
        },
        {
          $call: 'tanstack.mark.text',
          data: { $data: 'labels' },
          x: {
            $call: 'tanstack.accessor.iso-date',
            field: 'date',
          },
          y: 'value',
          text: 'label',
          key: 'label',
          anchor: 'start',
          dx: 6,
          dy: -8,
          fontSize: 12,
          fontWeight: 600,
        },
      ],
      x: { scale: { $call: 'tanstack.scale.utc' } },
      y: {
        scale: { $call: 'tanstack.scale.linear' },
        nice: true,
        grid: true,
      },
    },
    data: {
      rows: [
        { date: '2026-01-01', value: 7 },
        { date: '2026-01-02', value: 12 },
        { date: '2026-01-03', value: 9 },
      ],
      thresholds: [{ value: 10 }],
      events: [{ date: '2026-01-02' }],
      labels: [
        { date: '2026-01-01', value: 10, label: 'Target 10' },
        { date: '2026-01-02', value: 13, label: 'Launch' },
      ],
    },
    metadata: {
      title: 'Annotated signups',
      description:
        'Daily signups with a target at 10 and a launch marker on January 2.',
    },
  },
  null,
  2,
)

const exampleSources = {
  bar: barSource,
  donut: donutSource,
  annotations: annotationsSource,
} as const

type ExampleSource = keyof typeof exampleSources

const initialDefinition = chartFromJson(barSource)

export function ChartJsonDemo() {
  const editorId = React.useId()
  const statusId = React.useId()
  const previewTitleId = React.useId()
  const [exampleSource, setExampleSource] = React.useState<ExampleSource>('bar')
  const [draft, setDraft] = React.useState(barSource)
  const [appliedSource, setAppliedSource] = React.useState(barSource)
  const [definition, setDefinition] = React.useState(initialDefinition)
  const [issues, setIssues] = React.useState<readonly ChartJsonIssue[]>([])
  const [dataRevision, setDataRevision] = React.useState(0)
  const title = definition.metadata?.title ?? 'Chart preview'
  const description =
    definition.metadata?.description ?? 'Chart rendered from JSON.'

  const apply = () => {
    try {
      const next = chartFromJson(
        draft,
        dataRevision === 0
          ? undefined
          : { data: { rows: rowsForRevision(dataRevision) } },
      )
      setDefinition(next)
      setAppliedSource(draft)
      setIssues([])
    } catch (error) {
      setIssues(chartJsonIssues(error))
    }
  }

  const loadExample = (nextExample: ExampleSource) => {
    const nextSource = exampleSources[nextExample]
    try {
      const next = chartFromJson(nextSource)
      setExampleSource(nextExample)
      setDraft(nextSource)
      setAppliedSource(nextSource)
      setDefinition(next)
      setIssues([])
      setDataRevision(0)
    } catch (error) {
      setIssues(chartJsonIssues(error))
    }
  }

  const reset = () => loadExample(exampleSource)

  const replaceData = () => {
    const nextRevision = (dataRevision % replacementRows.length) + 1
    try {
      setDefinition(
        chartFromJson(appliedSource, {
          data: { rows: rowsForRevision(nextRevision) },
        }),
      )
      setDataRevision(nextRevision)
    } catch (error) {
      setIssues(chartJsonIssues(error))
    }
  }

  return (
    <section className="json-workbench" aria-label="Chart JSON workbench">
      <div className="json-demo-surface">
        <section
          className="json-demo-editor"
          aria-labelledby={`${editorId}-title`}
        >
          <header className="json-demo-panel-header">
            <h2 id={`${editorId}-title`}>JSON source</h2>
            <div className="json-demo-actions">
              <select
                aria-label="Example source"
                value={exampleSource}
                onChange={(event) =>
                  loadExample(readExample(event.target.value))
                }
              >
                <option value="bar">Bar</option>
                <option value="donut">Donut</option>
                <option value="annotations">Annotations</option>
              </select>
              <button type="button" onClick={reset}>
                Reset
              </button>
              <button className="json-demo-apply" type="button" onClick={apply}>
                Apply
              </button>
            </div>
          </header>
          <label className="sr-only" htmlFor={editorId}>
            Editable Chart JSON source
          </label>
          <textarea
            id={editorId}
            value={draft}
            aria-describedby={statusId}
            aria-invalid={issues.length > 0}
            spellCheck={false}
            onChange={(event) => setDraft(event.target.value)}
          />
          <output id={statusId} className="json-demo-status" aria-live="polite">
            {issues.length
              ? `Change not applied · ${issues.length} ${issues.length === 1 ? 'issue' : 'issues'} · previous preview retained`
              : dataRevision === 0
                ? 'Applied · bundled data'
                : `Applied · host data override ${dataRevision}`}
          </output>
          {issues.length > 0 ? <IssueList issues={issues} /> : null}
        </section>

        <section className="json-demo-preview" aria-labelledby={previewTitleId}>
          <header className="json-demo-panel-header">
            <div>
              <h2 id={previewTitleId}>{title}</h2>
              <p>{description}</p>
            </div>
            <button
              type="button"
              disabled={issues.length > 0}
              onClick={replaceData}
            >
              Replace data
            </button>
          </header>
          <div className="json-demo-chart">
            <PreviewErrorBoundary resetKey={definition}>
              <Chart
                definition={definition}
                initialWidth={640}
                aspectRatio={1.6}
                ariaLabel={title}
                ariaDescription={description}
                idPrefix="chart-json-demo"
                tabIndex={0}
              />
            </PreviewErrorBoundary>
          </div>
        </section>
      </div>
    </section>
  )
}

function IssueList({ issues }: { readonly issues: readonly ChartJsonIssue[] }) {
  return (
    <section className="json-demo-issues" aria-label="Validation issues">
      <ol>
        {issues.map((issue, index) => (
          <li key={`${issue.path}:${issue.code}:${index}`}>
            <div>
              <code>{issue.code}</code>
              <code>{issue.path}</code>
            </div>
            <p>{issue.message}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

interface PreviewErrorBoundaryProps {
  readonly resetKey: unknown
  readonly children: React.ReactNode
}

class PreviewErrorBoundary extends React.Component<
  PreviewErrorBoundaryProps,
  { readonly error?: Error }
> {
  state: { readonly error?: Error } = {}

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(previous: PreviewErrorBoundaryProps) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: undefined })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <p className="json-demo-preview-error" role="status">
          Preview failed: {this.state.error.message}
        </p>
      )
    }
    return this.props.children
  }
}

function rowsForRevision(revision: number): readonly DemoRow[] {
  return replacementRows[(revision - 1) % replacementRows.length] ?? []
}

function readExample(value: string): ExampleSource {
  if (value === 'donut' || value === 'annotations') return value
  return 'bar'
}

function chartJsonIssues(error: unknown): readonly ChartJsonIssue[] {
  if (error instanceof ChartJsonError) return error.issues
  throw error
}
