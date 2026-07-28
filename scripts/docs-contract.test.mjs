import { describe, expect, it } from 'vitest'
import {
  exportedNames,
  documentedStandaloneExamples,
  flattenConfigPaths,
  importedNamesBySpecifier,
  markdownHeadingAnchors,
  parseFrontmatter,
  parseHtmlAttributes,
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
})
