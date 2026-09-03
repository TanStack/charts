import { describe, expect, it } from 'vitest'
import {
  apiReferenceCoversExport,
  comparisonBaselineContractFailures,
  documentationEnvironmentBootstrap,
  documentedExampleGroupErrors,
  documentedExampleGroups,
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
  validateExampleGroups,
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
      schemaVersion: 4,
      packageVersions: versions,
      sources: {
        tanstack: {
          kind: 'workspace',
          revision: '1'.repeat(40),
          inputDigest: `sha256:${'2'.repeat(64)}`,
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
    stale.sources.tanstack.inputDigest = 'unknown'
    delete stale.bundles['tanstack-line-basic']
    expect(comparisonBaselineContractFailures(stale, versions)).toEqual(
      expect.arrayContaining([
        'comparison bundle baseline version is stale for Chart.js: expected 4.5.1',
        'comparison bundle baseline must record the TanStack workspace revision',
        'comparison bundle baseline must record the TanStack workspace input digest',
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

  it('extracts designated standalone examples that are not grouped projects', () => {
    expect(
      documentedStandaloneExamples(`
<!-- docs-example: quick-start typecheck -->

\`\`\`tsx group=quick-start env=charts-react file=/src/Chart.tsx entry
const value = <span />
\`\`\`
\`\`\`tsx group=quick-start file=/src/main.tsx
createRoot(document.getElementById('root')!).render(value)
\`\`\`
`),
    ).toEqual([])

    expect(
      documentedStandaloneExamples(`
<!-- docs-example: quick-start typecheck -->

\`\`\`tsx
const value = <span />
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

  it('groups runnable documentation files and validates their metadata', () => {
    const source = `
\`\`\`tsx group=letter-frequency env=charts-react file=/src/App.tsx entry
import { rows } from './data'
export default function App() { return <span>{rows.length}</span> }
\`\`\`

\`\`\`ts group=letter-frequency file=/src/data.ts collapsed
export const rows = [{ value: 1 }]
\`\`\`
`

    expect(documentedExampleGroupErrors(source)).toEqual([])
    expect(documentedExampleGroups(source)).toEqual([
      {
        id: 'letter-frequency',
        env: 'charts-react',
        files: [
          expect.objectContaining({
            path: '/src/App.tsx',
            entry: true,
          }),
          expect.objectContaining({
            path: '/src/data.ts',
            collapsed: true,
          }),
        ],
      },
    ])
  })

  it('rejects incomplete runnable documentation metadata', () => {
    expect(
      documentedExampleGroupErrors(`
\`\`\`ts group=broken env=unknown file=/src/chart.ts
export const chart = {}
\`\`\`

\`\`\`ts group=broken file=/src/chart.ts collapsed hidden
export const duplicate = {}
\`\`\`
`),
    ).toEqual([
      'group broken file /src/chart.ts cannot declare hidden; environments own hidden files',
      'group broken uses unknown documentation environment "unknown"',
      'group broken repeats file /src/chart.ts',
      'group broken must declare exactly one entry file',
    ])
  })

  it('rejects unknown grouped fence metadata', () => {
    expect(
      documentedExampleGroupErrors(`
\`\`\`ts group=broken env=charts file=/src/chart.ts entry collasped title=Example
export default {}
\`\`\`
`),
    ).toEqual([
      'code fence 1 uses unknown grouped metadata "collasped"',
      'code fence 1 uses unknown grouped metadata "title"',
    ])
  })

  it('recognizes CommonMark fences without parsing literal nested examples', () => {
    const groups = documentedExampleGroups(`
\`\`\`\`md
\`\`\`ts group=literal env=charts file=/src/chart.ts entry
export default {}
\`\`\`
\`\`\`\`

~~~ts group=tilde env=charts file=/src/chart.ts entry
export default {}
~~~

\`\`\`\`ts group=long-fence env=charts file=/src/chart.ts entry
export default {}
\`\`\`\`
`)

    expect(groups.map(({ id }) => id)).toEqual(['tilde', 'long-fence'])
  })

  it('rejects authored hidden files, escaped imports, and unavailable dependencies', () => {
    const errors = documentedExampleGroupErrors(`
\`\`\`ts group=isolated env=charts file=/src/chart.ts entry
import React from 'react'
import { secret } from '../../private'
export default secret ?? React
\`\`\`

\`\`\`ts group=isolated file=/src/private.ts hidden
export const secret = 1
\`\`\`
`)

    expect(errors).toEqual(
      expect.arrayContaining([
        'group isolated file /src/private.ts cannot declare hidden; environments own hidden files',
        'group isolated file /src/chart.ts imports "react", which env=charts does not provide',
        'group isolated file /src/chart.ts imports "../../private" outside /src',
      ]),
    )
  })

  it('typechecks runnable groups as isolated projects', () => {
    const failures = []
    validateExampleGroups(
      process.cwd(),
      new Map([
        [
          'first.md',
          `
\`\`\`tsx group=first env=charts-react file=/src/App.tsx entry
export default function App() { return null }
\`\`\`
\`\`\`ts group=first file=/src/globals.ts collapsed
declare const leaked: number
\`\`\`
`,
        ],
        [
          'second.md',
          `
\`\`\`tsx group=second env=charts-react file=/src/App.tsx entry
export default function App() { return leaked }
\`\`\`
`,
        ],
      ]),
      failures,
    )

    expect(failures).toEqual([
      expect.stringContaining("Cannot find name 'leaked'"),
    ])
  })

  it('validates multi-file Octane projects and their default entry semantically', () => {
    const validFailures = []
    validateExampleGroups(
      process.cwd(),
      new Map([
        [
          'valid.md',
          `
\`\`\`tsx group=octane-valid env=charts-octane file=/src/App.tsrx entry
import Child from './Child.tsrx'
export default function App() { return <Child /> }
\`\`\`
\`\`\`tsx group=octane-valid file=/src/Child.tsrx collapsed
import { value } from './data'
export default function Child() { return <span>{value}</span> }
\`\`\`
\`\`\`ts group=octane-valid file=/src/data.ts collapsed
export const value: number = 1
\`\`\`
`,
        ],
      ]),
      validFailures,
    )
    expect(validFailures).toEqual([])

    const invalidFailures = []
    validateExampleGroups(
      process.cwd(),
      new Map([
        [
          'invalid.md',
          `
\`\`\`tsx group=octane-invalid env=charts-octane file=/src/App.tsrx entry
import { value } from './data'
export function App() { return <span>{value}</span> }
\`\`\`
\`\`\`ts group=octane-invalid file=/src/data.ts collapsed
export const value: number = 'wrong'
\`\`\`
`,
        ],
      ]),
      invalidFailures,
    )
    expect(invalidFailures).toEqual(
      expect.arrayContaining([
        expect.stringContaining('must default-export'),
        expect.stringContaining(
          "Type 'string' is not assignable to type 'number'",
        ),
      ]),
    )
  })

  it('uses the group ID in the generated chart aria label', () => {
    expect(
      documentationEnvironmentBootstrap(
        'charts',
        'monthly-signups',
        './src/chart',
      ),
    ).toContain('Documentation example: monthly-signups')
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
