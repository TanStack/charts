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
  parseHtmlAttributes,
  stripNameOnlyApiInventories,
  typedCodeFenceSyntaxErrors,
} from './docs-contract.mjs'

describe('documentation contract helpers', () => {
  it('flattens ordinary and framework navigation without section labels', () => {
    expect(
      flattenConfigPaths({
        sections: [
          {
            children: [{ label: 'Overview', to: 'overview' }],
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

  it('parses multiline iframe attributes', () => {
    expect(
      parseHtmlAttributes(`
        src="https://tanstack.com/charts/catalog/embed/01-line-gaps/"
        title='Line chart'
        loading="lazy"
      `),
    ).toEqual({
      src: 'https://tanstack.com/charts/catalog/embed/01-line-gaps/',
      title: 'Line chart',
      loading: 'lazy',
    })
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

\`\`\`tsx
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
