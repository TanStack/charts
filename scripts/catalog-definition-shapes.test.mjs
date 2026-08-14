import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const casesDirectory = path.resolve(
  import.meta.dirname,
  '../benchmarks/conformance/cases',
)

const responsiveDefinitions = [
  '137-shadcn-area-interactive/example.tsx',
  '152-shadcn-line-default/example.tsx',
  '153-shadcn-line-dots-colors/example.tsx',
  '154-shadcn-line-dots-custom/example.tsx',
  '155-shadcn-line-dots/example.tsx',
  '156-shadcn-line-interactive/example.tsx',
  '157-shadcn-line-label-custom/example.tsx',
  '158-shadcn-line-label/example.tsx',
  '159-shadcn-line-linear/example.tsx',
  '160-shadcn-line-multiple/example.tsx',
  '161-shadcn-line-step/example.tsx',
  '181-shadcn-radar-label-custom/example.tsx',
  '186-shadcn-radial-label/example.tsx',
  '29-waterfall/example.tsx',
  '85-scrollable-resource-lanes/example.tsx',
  '92-editable-event-range/example.tsx',
  'bar-grouped/example.tsx',
  'bar-vertical-sorted/example.tsx',
]

const indirectDefinitions = [
  '130-shadcn-radar-multiple/example.tsx',
  '172-shadcn-radar-default/example.tsx',
  '173-shadcn-radar-dots/example.tsx',
  '174-shadcn-radar-grid-circle-fill/example.tsx',
  '175-shadcn-radar-grid-circle-no-lines/example.tsx',
  '176-shadcn-radar-grid-circle/example.tsx',
  '177-shadcn-radar-grid-custom/example.tsx',
  '178-shadcn-radar-grid-fill/example.tsx',
  '179-shadcn-radar-grid-none/example.tsx',
  '180-shadcn-radar-icons/example.tsx',
  '182-shadcn-radar-legend/example.tsx',
  '183-shadcn-radar-lines-only/example.tsx',
  '184-shadcn-radar-radius/example.tsx',
  '185-shadcn-radial-grid/example.tsx',
  '188-shadcn-radial-simple/example.tsx',
]

describe('catalog definition shapes', () => {
  it('uses static definitions unless the chart reads build context', async () => {
    const entries = await readdir(casesDirectory, { withFileTypes: true })
    const caseDirectories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(casesDirectory, entry.name))
    const files = (
      await Promise.all(
        caseDirectories.map(async (directory) => {
          const caseEntries = await readdir(directory, { withFileTypes: true })
          return caseEntries
            .filter((entry) => entry.isFile() && entry.name === 'example.tsx')
            .map((entry) => path.join(directory, entry.name))
        }),
      )
    ).flat()

    const classification = {
      indirect: [],
      parameterless: [],
      responsive: [],
      static: 0,
      staticFiles: [],
    }

    await Promise.all(
      files.map(async (file) => {
        const source = await readFile(file, 'utf8')
        classifyDefinitions(
          path.relative(casesDirectory, file),
          source,
          classification,
        )
      }),
    )

    expect(classification.parameterless).toEqual([])
    expect(classification.static).toBe(160)
    expect(classification.responsive.sort()).toEqual(responsiveDefinitions)
    expect(classification.indirect.sort()).toEqual(indirectDefinitions)
    expect(classification.staticFiles).toHaveLength(155)
    expect(
      new Set([
        ...classification.staticFiles,
        ...classification.responsive,
        ...classification.indirect,
      ]).size,
    ).toBe(files.length)
  })

  it('classifies the base definition once when options are added', () => {
    const classification = {
      indirect: [],
      parameterless: [],
      responsive: [],
      static: 0,
      staticFiles: [],
    }

    classifyDefinitions(
      'two-argument.ts',
      `
        defineChart({ marks: [] }, { focus: 'nearest' })
        defineChart(defineChart({ marks: [] }), { keyboard: true })
        defineChart(
          defineChart(({ width }) => ({ marks: [], width })),
          { keyboard: true },
        )
      `,
      classification,
    )

    expect(classification).toEqual({
      indirect: [],
      parameterless: [],
      responsive: ['two-argument.ts'],
      static: 2,
      staticFiles: ['two-argument.ts'],
    })
  })
})

function classifyDefinitions(relativePath, source, classification) {
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
  )
  let hasIndirectDefinition = false
  let hasResponsiveDefinition = false
  let hasStaticDefinition = false

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'facetChart'
    ) {
      classification.static += 1
      hasStaticDefinition = true
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'defineChart' &&
      (node.arguments.length === 1 || node.arguments.length === 2)
    ) {
      const definition = unwrapParentheses(node.arguments[0])

      if (ts.isObjectLiteralExpression(definition)) {
        classification.static += 1
        hasStaticDefinition = true
      } else if (ts.isArrowFunction(definition)) {
        if (definition.parameters.length === 0) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(
            definition.getStart(sourceFile),
          )
          classification.parameterless.push(`${relativePath}:${line + 1}`)
        } else {
          classification.responsive.push(relativePath)
          hasResponsiveDefinition = true
        }
      } else if (!(
        ts.isCallExpression(definition) &&
        ts.isIdentifier(definition.expression) &&
        definition.expression.text === 'defineChart'
      )) {
        hasIndirectDefinition = true
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  if (hasStaticDefinition) classification.staticFiles.push(relativePath)
  if (
    hasIndirectDefinition &&
    !hasStaticDefinition &&
    !hasResponsiveDefinition
  ) {
    classification.indirect.push(relativePath)
  }
}

function unwrapParentheses(node) {
  while (ts.isParenthesizedExpression(node)) node = node.expression
  return node
}
