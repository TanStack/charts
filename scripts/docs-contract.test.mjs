import { describe, expect, it } from 'vitest'
import {
  apiReferenceCoversExport,
  comparisonBaselineContractFailures,
  exportedNames,
  documentedStandaloneExamples,
  flattenConfigPaths,
  formatComparisonRange,
  importedNamesBySpecifier,
  isPublicChartLibraryLinkAllowed,
  markdownTableRows,
  markdownHeadingAnchors,
  parseFrontmatter,
  parseChartExampleDirective,
  stripNameOnlyApiInventories,
  typedCodeFenceSyntaxErrors,
  validateChartExamples,
} from './docs-contract.mjs'

describe('documentation contract helpers', () => {
  it('flattens ordinary and framework navigation without section labels', () => {
    expect(
      flattenConfigPaths({
        sections: [
          {
            children: [
              { label: 'Overview', to: 'overview' },
              {
                label: 'Catalog example',
                to: '/charts/catalog/charts/01-line-gaps/',
              },
              {
                label: 'External resource',
                to: 'https://example.com/',
              },
            ],
            frameworks: [
              {
                label: 'react',
                children: [{ label: 'React', to: 'framework/react/adapter' }],
              },
            ],
          },
        ],
      }),
    ).toEqual(['overview', 'framework/react/adapter'])
  })

  it('reads simple TanStack frontmatter', () => {
    expect(
      parseFrontmatter(`---
title: "Scales and D3"
description: The integration boundary.
---

Body
`),
    ).toEqual({
      title: 'Scales and D3',
      description: 'The integration boundary.',
    })
  })

  it('parses canonical chart example directives', () => {
    expect(
      parseChartExampleDirective(
        '<!-- ::chart-example id=01-line-gaps height=480 -->',
      ),
    ).toEqual({
      id: '01-line-gaps',
      height: 480,
    })
    expect(
      parseChartExampleDirective(
        '<iframe src="https://tanstack.com/charts/catalog/embed/01-line-gaps/"></iframe>',
      ),
    ).toBeNull()
  })

  it('validates chart example directives and rejects catalog iframes', () => {
    const failures = chartExampleFailures([
      [
        'first.md',
        [
          '<iframe src="https://tanstack.com/charts/catalog/embed/01-line-gaps/"></iframe>',
          '<!-- ::chart-example id=missing-case height=480 -->',
          '<!-- ::chart-example id=01-line-gaps height=479 -->',
          '<!-- ::chart-example height=480 id=01-line-gaps -->',
        ].join('\n'),
      ],
      [
        'second.md',
        [
          '<!-- ::chart-example id=01-line-gaps height=1201 -->',
          '<!-- ::chart-example id=02-multi-line-end-labels height=480 source=expanded -->',
        ].join('\n'),
      ],
    ])

    expect(failures).toEqual([
      'first.md must use a chart-example directive instead of an iframe',
      'first.md references an unknown catalog case: missing-case',
      'first.md chart-example height must be between 480 and 1200',
      'first.md has an invalid chart-example directive; expected <!-- ::chart-example id=case-id height=480 -->',
      'second.md duplicates catalog example 01-line-gaps already used by first.md',
      'second.md chart-example height must be between 480 and 1200',
      'second.md has an invalid chart-example directive; expected <!-- ::chart-example id=case-id height=480 -->',
    ])
  })

  it('ignores chart example syntax inside fenced and inline code', () => {
    const failures = chartExampleFailures([
      [
        'authoring.md',
        [
          '```md',
          '<!-- ::chart-example id=missing-case height=479 -->',
          '<iframe src="https://tanstack.com/charts/catalog/embed/01-line-gaps/"></iframe>',
          '```',
          '',
          'Use `<iframe src="https://tanstack.com/charts/catalog/embed/01-line-gaps/"></iframe>` only when documenting legacy markup.',
          'The directive is `<!-- ::chart-example id=missing-case height=479 -->`.',
          '',
          '<!-- ::chart-example id=01-line-gaps height=480 -->',
        ].join('\n'),
      ],
    ])

    expect(failures).toEqual([])
  })

  it('normalizes comparison table rows and byte ranges', () => {
    expect(
      markdownTableRows(`
| Capability | TanStack | Other |
| --- | --- | --- |
| SVG output | ✅ Default | 🔴 Canvas only |
`),
    ).toContainEqual(['SVG output', '✅ Default', '🔴 Canvas only'])
    expect(formatComparisonRange([19_481, 22_761])).toBe('19.02–22.23 KiB')
  })

  it('allows only reviewed competitor links on the comparison page', () => {
    expect(
      isPublicChartLibraryLinkAllowed(
        'comparison.md',
        'https://www.chartjs.org/docs/latest/',
      ),
    ).toBe(true)
    expect(
      isPublicChartLibraryLinkAllowed(
        'comparison.md',
        'https://www.chartjs.org/docs/latest/charts/line.html',
      ),
    ).toBe(false)
    expect(
      isPublicChartLibraryLinkAllowed(
        'overview.md',
        'https://recharts.github.io/en-US/',
      ),
    ).toBe(false)
  })

  it('rejects stale comparison baseline versions and incomplete matrices', () => {
    const libraryIds = [
      'tanstack',
      'chartjs',
      'echarts',
      'recharts',
      'observable-plot',
    ]
    const chartTypes = ['line', 'bar', 'area', 'scatter']
    const tiers = ['basic', 'interactive', 'advanced']
    const versions = {
      tanstack: '0.0.0',
      chartjs: '4.5.1',
      echarts: '6.1.0',
      recharts: '3.10.1',
      'observable-plot': '0.6.17',
    }
    const baseline = {
      schemaVersion: 3,
      packageVersions: versions,
      sources: {
        tanstack: {
          kind: 'workspace',
          revision: '1'.repeat(40),
        },
        chartjs: {
          kind: 'package',
          packageName: 'chart.js',
          version: versions.chartjs,
        },
        echarts: {
          kind: 'package',
          packageName: 'echarts',
          version: versions.echarts,
        },
        recharts: {
          kind: 'package',
          packageName: 'recharts',
          version: versions.recharts,
        },
        'observable-plot': {
          kind: 'package',
          packageName: '@observablehq/plot',
          version: versions['observable-plot'],
        },
      },
      matrix: { chartTypes, tiers },
      bundles: Object.fromEntries(
        libraryIds.flatMap((library) =>
          chartTypes.flatMap((chartType) =>
            tiers.map((tier) => [
              `${library}-${chartType}-${tier}`,
              { gzipBytes: 1, incrementalGzipBytes: 1 },
            ]),
          ),
        ),
      ),
    }

    expect(comparisonBaselineContractFailures(baseline, versions)).toEqual([])
    expect(
      comparisonBaselineContractFailures(baseline, {
        ...versions,
        tanstack: '0.0.2',
      }),
    ).toEqual([])

    const stale = structuredClone(baseline)
    stale.packageVersions.chartjs = '4.5.0'
    stale.sources.tanstack.revision = 'unknown'
    delete stale.bundles['tanstack-line-basic']
    expect(comparisonBaselineContractFailures(stale, versions)).toEqual(
      expect.arrayContaining([
        'comparison bundle baseline version is stale for Chart.js: expected 4.5.1',
        'comparison bundle baseline must record the TanStack workspace revision',
        'comparison bundle baseline must contain the complete 60-case matrix',
      ]),
    )
  })

  it('extracts named re-exports and declared exports', () => {
    expect(
      exportedNames(`
export { lineY, areaY as area } from './marks'
export type { ChartPoint } from './types'
export function defineChart() {}
export const defaultTheme = {}
`),
    ).toEqual(['lineY', 'area', 'ChartPoint', 'defineChart', 'defaultTheme'])
  })

  it('extracts original names from named and aliased imports', () => {
    expect(
      importedNamesBySpecifier(`
import { defineChart, lineY as line } from '@tanstack/charts'
import type { ChartMarkPointX } from '@tanstack/charts/mark/scale-values'
import * as d3 from 'd3-scale'
`),
    ).toEqual(
      new Map([
        ['@tanstack/charts', ['defineChart', 'lineY']],
        ['@tanstack/charts/mark/scale-values', ['ChartMarkPointX']],
      ]),
    )
  })

  it('reports syntax errors in typed code fences', () => {
    expect(
      typedCodeFenceSyntaxErrors(`
\`\`\`ts
const valid = { value: 1 }
\`\`\`

\`\`\`tsx live=broken-example file=/src/main.tsx
const invalid = {
\`\`\`
`),
    ).toEqual([
      {
        fence: 2,
        message: "'}' expected. (2:1)",
      },
    ])
  })

  it('derives stable Markdown heading fragments', () => {
    expect(
      markdownHeadingAnchors(`
## \`createChartRuntime\`
## Resource-aware SVG
## Resource-aware SVG
`),
    ).toEqual(
      new Set([
        'createchartruntime',
        'resource-aware-svg',
        'resource-aware-svg-1',
      ]),
    )
  })

  it('extracts designated standalone examples', () => {
    expect(
      documentedStandaloneExamples(`
<!-- docs-example: quick-start typecheck -->

\`\`\`tsx live=quick-start file=/src/Chart.tsx entry=/src/main.tsx
const value = <span />
\`\`\`
\`\`\`tsx live=quick-start file=/src/main.tsx
createRoot(document.getElementById('root')!).render(value)
\`\`\`
`),
    ).toEqual([
      {
        id: 'quick-start',
        mode: 'typecheck',
        language: 'tsx',
        source: 'const value = <span />\n',
      },
    ])
  })

  it('strips name-only API inventories without removing reference content', () => {
    const reference = stripNameOnlyApiInventories(
      'reference/index.md',
      `## Core reference

| API | Purpose |
| --- | --- |
| \`createThing\` | Creates a thing. |

Exports: \`InventoryOnly\`,
\`InventoryType\`.

\`\`\`text
Exports: \`CodeExample\`
\`\`\`

## Import map

| Import | Public values |
| --- | --- |
| \`@tanstack/example\` | \`ImportMapOnly\` |

## Details

\`DetailedSymbol\` has a complete contract.
`,
    )

    expect(reference).toBe(`## Core reference

| API | Purpose |
| --- | --- |
| \`createThing\` | Creates a thing. |


\`\`\`text
Exports: \`CodeExample\`
\`\`\`

## Details

\`DetailedSymbol\` has a complete contract.
`)
    expect(apiReferenceCoversExport(reference, 'createThing')).toBe(true)
    expect(apiReferenceCoversExport(reference, 'CodeExample')).toBe(true)
    expect(apiReferenceCoversExport(reference, 'DetailedSymbol')).toBe(true)
    expect(apiReferenceCoversExport(reference, 'InventoryOnly')).toBe(false)
    expect(apiReferenceCoversExport(reference, 'ImportMapOnly')).toBe(false)

    const typeReference = stripNameOnlyApiInventories(
      'reference/types.md',
      `## Capability-specific types

- \`CanvasInventoryOnly\`. See the Canvas reference.

## Host types

\`CanvasHostContract\` exposes update and destroy methods.
`,
    )

    expect(apiReferenceCoversExport(typeReference, 'CanvasInventoryOnly')).toBe(
      false,
    )
    expect(apiReferenceCoversExport(typeReference, 'CanvasHostContract')).toBe(
      true,
    )
  })
})

function chartExampleFailures(sources) {
  const cases = new Set(['01-line-gaps', '02-multi-line-end-labels'])
  const catalogExamples = new Map()
  const failures = []

  for (const [path, source] of sources) {
    validateChartExamples(path, source, cases, catalogExamples, failures)
  }

  return failures
}
