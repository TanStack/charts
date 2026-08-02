import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const casesDirectory = path.resolve(
  import.meta.dirname,
  '../benchmarks/conformance/cases',
)

const responsiveDefinitions = [
  '111-basic-sankey/tanstack.ts',
  '111-sankey-flow/tanstack.ts',
  '29-waterfall/tanstack.ts',
  '41-waffle-unit-chart/tanstack.ts',
  '43-hexbin-density/tanstack.ts',
  '52-beeswarm-dodge/tanstack.ts',
  '70-composed-chart/tanstack.ts',
  '85-scrollable-resource-lanes/tanstack.ts',
  '92-editable-event-range/tanstack.ts',
  '93-labeled-pie/tanstack.ts',
  'bar-grouped/tanstack.ts',
  'bar-vertical-sorted/tanstack.ts',
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
            .filter(
              (entry) =>
                entry.isFile() &&
                (entry.name === 'tanstack.ts' || entry.name === 'view.tsx'),
            )
            .map((entry) => path.join(directory, entry.name))
        }),
      )
    ).flat()

    const classification = {
      parameterless: [],
      responsive: [],
      static: 0,
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
    expect(classification.static).toBe(98)
    expect(classification.responsive.sort()).toEqual(responsiveDefinitions)
    expect(classification.static + classification.responsive.length).toBe(110)
  })
})

function classifyDefinitions(relativePath, source, classification) {
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
  )

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'defineChart' &&
      node.arguments.length === 1
    ) {
      const definition = unwrapParentheses(node.arguments[0])

      if (ts.isObjectLiteralExpression(definition)) {
        classification.static += 1
      } else if (ts.isArrowFunction(definition)) {
        if (definition.parameters.length === 0) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(
            definition.getStart(sourceFile),
          )
          classification.parameterless.push(`${relativePath}:${line + 1}`)
        } else {
          classification.responsive.push(relativePath)
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

function unwrapParentheses(node) {
  while (ts.isParenthesizedExpression(node)) node = node.expression
  return node
}
