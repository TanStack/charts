import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { format } from 'prettier'
import ts from 'typescript'
import { removeUnusedTypeScript } from './typescript-source.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const casesRoot = path.join(root, 'benchmarks', 'conformance', 'cases')
const directories = (await fs.readdir(casesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

let changed = 0
let collapsed = 0
for (const directory of directories) {
  const examplePath = path.join(casesRoot, directory, 'example.tsx')
  const source = await fs.readFile(examplePath, 'utf8')
  const collapsedWrapper = collapseDefinitionWrapper(source, examplePath)
  const normalized = {
    ...collapsedWrapper,
    source: renameIdentifier(
      pruneUnusedExampleOptions(
        splitBehaviorOptions(
          flattenNestedDefineCharts(collapsedWrapper.source, examplePath),
          examplePath,
        ),
        examplePath,
      ),
      examplePath,
      'ExampleOptions',
      'ChartOptions',
    ),
  }
  if (normalized.source === source) continue
  const cleaned = await format(
    removeUnusedTypeScript(normalized.source, examplePath),
    {
      parser: 'typescript',
      semi: false,
      singleQuote: true,
    },
  )
  if (normalized.renamedFrom) {
    collapsed += 1
    await renameCaseReferences(directory, normalized.renamedFrom)
  }
  if (cleaned === source) continue
  await fs.writeFile(examplePath, cleaned, 'utf8')
  changed += 1
}

function pruneUnusedExampleOptions(source, filePath) {
  const file = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const declaration = file.statements.find(
    (statement) =>
      ts.isInterfaceDeclaration(statement) &&
      ['ExampleOptions', 'ChartOptions'].includes(statement.name.text),
  )
  if (!declaration) return source
  const optionsTypeName = declaration.name.text
  const factory = functionLikeDeclaration(file, 'createExampleChart')
  const factoryUsesOptions = factory?.functionLike.parameters.some(
    (parameter) => isOptionsType(parameter.type, optionsTypeName),
  )

  const parameterNames = new Set()
  const usedProperties = new Set()
  const visitParameters = (node) => {
    if (ts.isParameter(node) && isOptionsType(node.type, optionsTypeName)) {
      if (ts.isIdentifier(node.name)) {
        parameterNames.add(node.name.text)
      } else if (ts.isObjectBindingPattern(node.name)) {
        for (const element of node.name.elements) {
          const name = element.propertyName ?? element.name
          if (ts.isIdentifier(name)) usedProperties.add(name.text)
        }
      }
    }
    ts.forEachChild(node, visitParameters)
  }
  visitParameters(file)

  const visitUses = (node) => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      parameterNames.has(node.expression.text)
    ) {
      usedProperties.add(node.name.text)
    }
    ts.forEachChild(node, visitUses)
  }
  visitUses(file)

  const declaredProperties = new Set(
    declaration.members.flatMap((member) => {
      if (!ts.isPropertySignature(member) || !member.name) return []
      const name = propertyNameText(member.name)
      return name ? [name] : []
    }),
  )
  const unusedProperties = new Set(
    [...declaredProperties].filter((name) => !usedProperties.has(name)),
  )
  if (unusedProperties.size === 0 && declaration.members.length > 0) {
    return source
  }

  const edits = []
  const removesOptions = unusedProperties.size === declaration.members.length
  if (removesOptions) {
    edits.push({
      start: declaration.getFullStart(),
      end: declaration.end,
    })
    if (factoryUsesOptions) {
      const parameter = factory.functionLike.parameters.find((candidate) =>
        isOptionsType(candidate.type, optionsTypeName),
      )
      if (parameter) {
        edits.push({ start: parameter.getStart(file), end: parameter.end })
      }
    }
  }
  if (!removesOptions) {
    for (const member of declaration.members) {
      if (!ts.isPropertySignature(member) || !member.name) continue
      const name = propertyNameText(member.name)
      if (name && unusedProperties.has(name)) {
        edits.push(removalEdit(member, declaration.members, source, file))
      }
    }
  }

  const visitCalls = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      factoryUsesOptions &&
      node.expression.text === 'createExampleChart' &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const object = node.arguments[0]
      if (removesOptions) {
        edits.push({ start: object.getStart(file), end: object.end })
        return
      }
      for (const property of object.properties) {
        if (!ts.isPropertyAssignment(property) || !property.name) continue
        const name = propertyNameText(property.name)
        if (name && unusedProperties.has(name)) {
          edits.push(removalEdit(property, object.properties, source, file))
        }
      }
    }
    ts.forEachChild(node, visitCalls)
  }
  visitCalls(file)

  let result = source
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    result = result.slice(0, edit.start) + result.slice(edit.end)
  }
  return result
}

function isOptionsType(node, typeName) {
  return (
    node &&
    ts.isTypeReferenceNode(node) &&
    ts.isIdentifier(node.typeName) &&
    node.typeName.text === typeName
  )
}

function propertyNameText(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text
  return undefined
}

function removalEdit(node, siblings, source, file) {
  const index = siblings.indexOf(node)
  const next = siblings[index + 1]
  if (next) {
    return { start: node.getFullStart(), end: next.getFullStart() }
  }
  const previous = siblings[index - 1]
  if (previous) {
    const between = source.slice(previous.end, node.getFullStart())
    const comma = between.lastIndexOf(',')
    if (comma !== -1) {
      return {
        start: previous.end + comma,
        end: node.end,
      }
    }
  }
  return { start: node.getFullStart(), end: node.end }
}

console.log(
  `Cleaned ${changed} of ${directories.length} catalog examples; collapsed ${collapsed} generated definition wrappers.`,
)

function collapseDefinitionWrapper(source, filePath) {
  const file = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const wrapper = functionLikeDeclaration(file, 'createExampleChart')
  const wrapperFunction = wrapper?.functionLike
  const outerCall =
    wrapperFunction && isFactoryFunction(wrapperFunction)
      ? returnedExpression(wrapperFunction)
      : undefined
  if (
    !wrapper ||
    !wrapperFunction ||
    !isFactoryFunction(wrapperFunction) ||
    !outerCall ||
    !isDefineChartCall(outerCall)
  ) {
    return { source }
  }

  const delegatedCall = outerCall.arguments[0]
  const behaviorOptions = outerCall.arguments[1]
  if (
    outerCall.arguments.length !== 2 ||
    !delegatedCall ||
    !ts.isCallExpression(delegatedCall) ||
    !ts.isIdentifier(delegatedCall.expression) ||
    !behaviorOptions ||
    !ts.isObjectLiteralExpression(behaviorOptions)
  ) {
    return { source }
  }

  const targetName = delegatedCall.expression.text
  const target = functionLikeDeclaration(file, targetName)
  const targetFunction = target?.functionLike
  if (!target || !targetFunction) {
    return { source }
  }

  const resultExpression = returnedExpression(targetFunction)
  if (!resultExpression) return { source }

  const replacement = definitionWithBehavior(
    source,
    resultExpression,
    behaviorOptions,
  )
  const wrapperBody = inlinedFactoryBody(
    source,
    file,
    wrapperFunction,
    outerCall,
    targetFunction,
    delegatedCall.arguments,
    resultExpression,
    replacement,
  )
  if (!wrapperBody) return { source }
  const edits = [
    {
      start: wrapperFunction.body.getStart(file),
      end: wrapperFunction.body.end,
      text: wrapperBody,
    },
    {
      start: target.statement.getStart(file),
      end: target.statement.end,
      text: '',
    },
  ].sort((left, right) => right.start - left.start)

  let result = source
  for (const edit of edits) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end)
  }
  return { source: result, renamedFrom: targetName }
}

function isFactoryFunction(node) {
  return (
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isFunctionDeclaration(node)
  )
}

function functionLikeDeclaration(file, name) {
  const variable = variableDeclaration(file, name)
  const initializer = variable?.declaration.initializer
  if (
    variable &&
    initializer &&
    (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
  ) {
    return { functionLike: initializer, statement: variable.statement }
  }
  for (const statement of file.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === name &&
      statement.body
    ) {
      return { functionLike: statement, statement }
    }
  }
  return undefined
}

function inlinedFactoryBody(
  source,
  file,
  wrapper,
  outerCall,
  factory,
  argumentsList,
  resultExpression,
  replacement,
) {
  if (factory.parameters.length !== argumentsList.length) return undefined
  const prefix = statementsBeforeReturn(source, file, wrapper, outerCall)
  const bindings = []
  for (let index = 0; index < factory.parameters.length; index += 1) {
    const parameter = factory.parameters[index]
    const argument = argumentsList[index]
    if (!parameter || !argument || !ts.isIdentifier(parameter.name)) {
      return undefined
    }
    if (ts.isIdentifier(argument) && argument.text === parameter.name.text) {
      continue
    }
    const value = parameter.initializer
      ? `${sourceText(source, argument)} ?? ${sourceText(source, parameter.initializer)}`
      : sourceText(source, argument)
    bindings.push(`const ${parameter.name.text} = ${value}`)
  }

  let body
  if (ts.isBlock(factory.body)) {
    body = source.slice(factory.body.getStart(file) + 1, factory.body.end - 1)
    const expressionStart =
      resultExpression.getStart(file) - (factory.body.getStart(file) + 1)
    const expressionEnd =
      resultExpression.end - (factory.body.getStart(file) + 1)
    body =
      body.slice(0, expressionStart) + replacement + body.slice(expressionEnd)
  } else {
    body = `return ${replacement}`
  }
  return `{\n${prefix}\n${bindings.join('\n')}\n${body}\n}`
}

function statementsBeforeReturn(source, file, factory, expression) {
  if (!ts.isBlock(factory.body)) return ''
  const returnStatement = factory.body.statements.find(
    (statement) =>
      ts.isReturnStatement(statement) && statement.expression === expression,
  )
  if (!returnStatement) return ''
  return source.slice(
    factory.body.getStart(file) + 1,
    returnStatement.getStart(file),
  )
}

function variableDeclaration(file, name) {
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
        return { declaration, statement }
      }
    }
  }
  return undefined
}

function returnedExpression(factory) {
  if (!ts.isBlock(factory.body)) return factory.body
  for (const statement of factory.body.statements) {
    if (ts.isReturnStatement(statement) && statement.expression) {
      return statement.expression
    }
  }
  return undefined
}

function isDefineChartCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'defineChart'
  )
}

function definitionWithBehavior(source, expression, behaviorOptions) {
  const behaviorText = sourceText(source, behaviorOptions)
  if (!isDefineChartCall(expression)) {
    return `defineChart(${sourceText(source, expression)}, ${behaviorText})`
  }

  if (expression.arguments.length !== 1) {
    throw new Error('Expected the delegated definition to have one argument.')
  }
  return `defineChart(${sourceText(source, expression.arguments[0])}, ${behaviorText})`
}

function sourceText(source, node) {
  return source.slice(node.getStart(), node.end)
}

function flattenNestedDefineCharts(source, filePath) {
  let result = source
  for (let pass = 0; pass < 4; pass += 1) {
    const file = ts.createSourceFile(
      filePath,
      result,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const edits = []
    const visit = (node) => {
      if (
        isDefineChartCall(node) &&
        node.arguments.length === 2 &&
        isDefineChartCall(node.arguments[0]) &&
        node.arguments[0].arguments.length === 1
      ) {
        edits.push({
          start: node.getStart(file),
          end: node.end,
          text: `defineChart(${sourceText(result, node.arguments[0].arguments[0])}, ${sourceText(result, node.arguments[1])})`,
        })
        return
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
    if (edits.length === 0) return result
    for (const edit of edits.sort((left, right) => right.start - left.start)) {
      result = result.slice(0, edit.start) + edit.text + result.slice(edit.end)
    }
  }
  return result
}

function splitBehaviorOptions(source, filePath) {
  const file = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const factory = functionLikeDeclaration(file, 'createExampleChart')
  const definition = factory
    ? returnedExpression(factory.functionLike)
    : undefined

  if (
    definition &&
    isDefineChartCall(definition) &&
    (definition.arguments.length === 1 || definition.arguments.length === 2) &&
    ts.isObjectLiteralExpression(definition.arguments[0])
  ) {
    const config = definition.arguments[0]
    const chartProperty = config.properties.find(
      (property) =>
        ts.isPropertyAssignment(property) &&
        property.name &&
        ts.isIdentifier(property.name) &&
        property.name.text === 'chart',
    )
    const behavior = definition.arguments[1]
    if (
      chartProperty &&
      ts.isPropertyAssignment(chartProperty) &&
      (!behavior || ts.isObjectLiteralExpression(behavior))
    ) {
      const options = config.properties.filter(
        (property) => property !== chartProperty,
      )
      if (behavior && ts.isObjectLiteralExpression(behavior)) {
        options.push(...behavior.properties)
      }
      const replacement =
        options.length === 0
          ? `defineChart(${sourceText(source, chartProperty.initializer)})`
          : `defineChart(${sourceText(source, chartProperty.initializer)}, {${options.map((property) => sourceText(source, property)).join(',\n')}})`
      return (
        source.slice(0, definition.getStart(file)) +
        replacement +
        source.slice(definition.end)
      )
    }
  }

  if (
    !definition ||
    !isDefineChartCall(definition) ||
    definition.arguments.length !== 1 ||
    !ts.isObjectLiteralExpression(definition.arguments[0])
  ) {
    return source
  }

  const chart = definition.arguments[0]
  const behaviorNames = new Set(['keyboard', 'tooltip'])
  const behaviorProperties = chart.properties.filter(
    (property) =>
      property.name &&
      ts.isIdentifier(property.name) &&
      behaviorNames.has(property.name.text),
  )
  if (behaviorProperties.length !== behaviorNames.size) return source
  const chartProperties = chart.properties.filter(
    (property) => !behaviorProperties.includes(property),
  )
  const propertyText = (property) => sourceText(source, property)
  const replacement = `defineChart({${chartProperties.map(propertyText).join(',\n')}}, {${behaviorProperties.map(propertyText).join(',\n')}})`
  return (
    source.slice(0, definition.getStart(file)) +
    replacement +
    source.slice(definition.end)
  )
}

async function renameCaseReferences(directory, from) {
  if (from === 'createExampleChart') return
  const caseRoot = path.join(casesRoot, directory)
  const entries = await fs.readdir(caseRoot, { withFileTypes: true })
  for (const entry of entries) {
    if (
      !entry.isFile() ||
      entry.name === 'example.tsx' ||
      !/\.(?:ts|tsx)$/u.test(entry.name)
    ) {
      continue
    }
    const filePath = path.join(caseRoot, entry.name)
    const source = await fs.readFile(filePath, 'utf8')
    const renamed = renameIdentifier(
      source,
      filePath,
      from,
      'createExampleChart',
    )
    if (renamed === source) continue
    const formatted = await format(renamed, {
      parser: 'typescript',
      semi: false,
      singleQuote: true,
    })
    await fs.writeFile(filePath, formatted, 'utf8')
  }
}

function renameIdentifier(source, filePath, from, to) {
  const file = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const edits = []
  const visit = (node) => {
    if (ts.isIdentifier(node) && node.text === from) {
      edits.push({ start: node.getStart(file), end: node.end })
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  let result = source
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    result = result.slice(0, edit.start) + to + result.slice(edit.end)
  }
  return result
}
