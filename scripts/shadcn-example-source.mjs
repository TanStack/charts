import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import { format } from 'prettier'
import { removeUnusedTypeScript } from './typescript-source.mjs'

const root = path.resolve(import.meta.dirname, '..')
const implementationPath = path.join(
  root,
  'benchmarks/conformance/shared/shadcn-catalog-tanstack.tsx',
)
const cardPath = path.join(
  root,
  'benchmarks/conformance/shared/shadcn-chart-card.tsx',
)
const implementationSource = await readFile(implementationPath, 'utf8')
const implementationFile = ts.createSourceFile(
  implementationPath,
  implementationSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
)
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })

const functions = new Map()
const variables = new Map()
for (const statement of implementationFile.statements) {
  if (ts.isFunctionDeclaration(statement) && statement.name) {
    functions.set(statement.name.text, statement)
  }
  if (
    ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.length === 1
  ) {
    const declaration = statement.declarationList.declarations[0]
    if (ts.isIdentifier(declaration.name)) {
      variables.set(declaration.name.text, statement)
    }
  }
}

const horizontalVariants = new Set(['horizontal', 'label-custom', 'mixed'])

export async function shadcnExampleSource(spec) {
  const definitionSource = definitionFor(spec)
  const componentSource = componentFor(spec)
  const body = `${definitionSource}\n\n${componentSource}`
    .replaceAll(/\.\.\.\[\],?/gu, '')
    .replaceAll(/\.\.\.\{\},?/gu, '')
  const imports = importsFor(body)
  const formatted = await format(
    `${imports}\nimport './styles.css'\n\n${body}`,
    { parser: 'typescript', semi: false, singleQuote: true },
  )
  const cleaned = await cleanupGeneratedSource(formatted)
  return format(
    removeUnusedTypeScript(
      cleaned,
      path.join(
        root,
        'benchmarks/conformance/cases',
        `generated-${spec.name}`,
        'example.tsx',
      ),
    ),
    { parser: 'typescript', semi: false, singleQuote: true },
  )
}

async function cleanupGeneratedSource(source) {
  let file = ts.createSourceFile(
    'example.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  for (let pass = 0; pass < 3; pass += 1) {
    const result = ts.transform(file, [
      (context) => {
        const visit = (node) => {
          const visited = ts.visitEachChild(node, visit, context)
          if (ts.isArrayLiteralExpression(visited)) {
            return ts.factory.updateArrayLiteralExpression(
              visited,
              visited.elements.flatMap((element) =>
                ts.isSpreadElement(element) &&
                ts.isArrayLiteralExpression(element.expression)
                  ? [...element.expression.elements]
                  : [element],
              ),
            )
          }
          return visited
        }
        return (node) => ts.visitNode(node, visit)
      },
    ])
    file = result.transformed[0]
    result.dispose()
  }
  return format(printer.printFile(file), {
    parser: 'typescript',
    semi: false,
    singleQuote: true,
  })
}

export async function shadcnExampleStyles() {
  const cardSource = await readFile(cardPath, 'utf8')
  const match = cardSource.match(
    /export const shadcnChartCardStyles = `([\s\S]*?)`\s*$/u,
  )
  if (!match) throw new Error('Could not read the shadcn chart-card styles.')
  return format(`${match[1].trim()}\n`, { parser: 'css', singleQuote: true })
}

function definitionFor(spec) {
  const interactive = spec.variant === 'interactive'
  const rootName = interactive
    ? {
        area: 'buildInteractiveAreaDefinition',
        bar: 'buildInteractiveBarDefinition',
        line: 'buildInteractiveLineDefinition',
        pie: 'buildInteractivePieDefinition',
      }[spec.family]
    : {
        area: 'buildAreaDefinition',
        bar: 'buildBarDefinition',
        line: 'buildLineDefinition',
        pie: 'buildPieDefinition',
        radar: 'buildRadarDefinition',
        radial: 'buildRadialDefinition',
        tooltip: 'buildTooltipDefinition',
      }[spec.family]
  if (!rootName) throw new Error(`Unsupported shadcn example ${spec.name}`)

  const functionNames = new Set([rootName])
  if (!interactive && spec.family === 'area') {
    functionNames.add('shadcnPointXAxis').add('shadcnTheme')
  }
  if (!interactive && spec.family === 'bar') {
    if (spec.variant === 'multiple') functionNames.add('groupedBarDefinition')
    functionNames
      .add('shadcnXAxis')
      .add('shadcnBrowserXAxis')
      .add('shadcnBrowserYAxis')
      .add('shadcnTheme')
      .add('titleCase')
  }
  if (!interactive && spec.family === 'line') {
    functionNames.add('shadcnPointXAxis').add('shadcnTheme').add('titleCase')
  }
  if (!interactive && spec.family === 'pie') {
    if (spec.variant === 'stacked')
      functionNames.add('buildStackedPieDefinition')
    functionNames.add('titleCase')
  }
  if (spec.family === 'radial') {
    functionNames
      .add('buildSingleRadialDefinition')
      .add('buildStackedRadialDefinition')
      .add('radialCenterLabels')
      .add('rechartsPolarAngle')
      .add('titleCase')
  }
  if (interactive && spec.family === 'area') {
    functionNames
      .add('filterInteractiveAreaRows')
      .add('interactiveDateTicks')
      .add('formatMonthDay')
      .add('shadcnTheme')
  }
  if (interactive && (spec.family === 'bar' || spec.family === 'line')) {
    functionNames.add('formatMonthDay').add('shadcnTheme')
  }
  if (spec.family === 'tooltip') {
    functionNames.add('formatWeekday').add('shadcnTheme').add('titleCase')
  } else {
    functionNames
      .add('shadcnTooltipContent')
      .add('browserMetric')
      .add('titleCase')
  }
  if (spec.family === 'tooltip') {
    functionNames.add('ShadcnTooltipBody').add('ShadcnActivityIcon')
  }

  const variableNames = new Set([
    'monthSeries',
    'twoSeries',
    'browserNames',
    'activityNames',
    'horizontalVariants',
    'interactiveAreaRows',
    'interactiveBarRows',
    'interactivePieRows',
  ])
  const printedFunctions = [...functionNames]
    .map((name) => {
      const declaration = functions.get(name)
      if (!declaration) throw new Error(`Missing shadcn helper ${name}`)
      return printSpecializedFunction(declaration, spec, name === rootName)
    })
    .join('\n\n')
  const selectedVariables = new Set()
  let variableSearchSource = printedFunctions
  for (let pass = 0; pass < variableNames.size; pass += 1) {
    for (const name of variableNames) {
      if (
        selectedVariables.has(name) ||
        !new RegExp(`\\b${name}\\b`, 'u').test(variableSearchSource)
      ) {
        continue
      }
      selectedVariables.add(name)
      variableSearchSource += `\n${printer.printNode(
        ts.EmitHint.Unspecified,
        variables.get(name),
        implementationFile,
      )}`
    }
  }
  const usedVariables = [...selectedVariables]
    .sort(
      (left, right) =>
        variables.get(left).getStart(implementationFile) -
        variables.get(right).getStart(implementationFile),
    )
    .map((name) =>
      printer.printNode(
        ts.EmitHint.Unspecified,
        variables.get(name),
        implementationFile,
      ),
    )
    .join('\n')

  const state = interactiveState(spec)
  const focus =
    spec.family === 'pie' || spec.family === 'radar' || spec.family === 'radial'
      ? 'focusGroupAngle'
      : "'group-x'"
  const tooltipContent =
    spec.family === 'tooltip'
      ? '() => ({ rows: [] })'
      : '(points) => shadcnTooltipContent(points)'
  const createCall = state
    ? `createDefinition(${state.parameter})`
    : 'createDefinition()'
  const createSignature = state
    ? `(${state.parameter}: ${state.type} = ${state.defaultValue})`
    : '()'

  return `${typeAliasesFor(spec)}${usedVariables}\n\n${printedFunctions}\n\nexport function createExampleChart${createSignature} {
  return defineChart(${createCall}, {
    svgAnimation: false,
    focus: ${focus},
    keyboard: ${spec.family !== 'radial'},
    tooltip: {
      use: tooltip,
      className: 'sc-chart-tooltip',
      anchor: ${spec.family === 'tooltip' ? '(_points, context) => ({ x: context.surface.width * 0.271, y: context.surface.height * 0.554 })' : "'group-center'"},
      placement: ${spec.family === 'tooltip' ? "'bottom-right'" : "'auto'"},
      offset: ${spec.family === 'tooltip' ? '0' : 'undefined'},
      sort: 'color-domain',
      content: ${tooltipContent},
    },
  })
}

export const definition = createExampleChart()

type ExampleDefinition = ReturnType<typeof createExampleChart>
type ExampleDatum = ExampleDefinition extends DomChartDefinition<infer TDatum, infer _TXValue, infer _TYValue> ? TDatum : never
type ExampleXValue = ExampleDefinition extends DomChartDefinition<infer _TDatum, infer TXValue extends ChartValue, infer _TYValue> ? TXValue : never
type ExampleYValue = ExampleDefinition extends DomChartDefinition<infer _TDatum, infer _TXValue, infer TYValue extends ChartValue> ? TYValue : never`
}

function printSpecializedFunction(declaration, spec, isRoot) {
  let transformed = declaration
  for (let index = 0; index < 3; index += 1) {
    transformed = transformFunction(transformed, spec)
  }
  transformed = removeSpecParameter(transformed)
  transformed = removeUnusedFunctionConstants(transformed)
  let source = printer.printNode(
    ts.EmitHint.Unspecified,
    transformed,
    implementationFile,
  )
  if (isRoot) {
    source = source.replace(
      /^function\s+[A-Za-z_$][\w$]*/u,
      'function createDefinition',
    )
  }
  if (spec.family === 'bar' && spec.variant === 'negative') {
    source = source.replace(
      /\n\s*text:\s*\(row\)\s*=>\s*row\.desktop\.toLocaleString\(["']en-US["']\),/u,
      '',
    )
  }
  for (const name of ['dotMarks', 'labelMarks']) {
    const emptyDeclaration = new RegExp(
      `\\n?\\s*const\\s+${name}\\s*=\\s*\\[\\];?`,
      'u',
    )
    if (!emptyDeclaration.test(source)) continue
    source = source
      .replace(emptyDeclaration, '')
      .replace(new RegExp(`\\.\\.\\.${name},?`, 'gu'), '')
  }
  source = source.replaceAll(/,?\s*\.\.\.\[\]/gu, '')
  return source
}

function transformFunction(declaration, spec) {
  const constants = collectPrimitiveConstants(declaration, spec)
  const result = ts.transform(declaration, [
    (context) => {
      const visit = (node) => {
        if (
          ts.isPropertyAccessExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'spec'
        ) {
          return literal(spec[node.name.text])
        }
        const visited = ts.visitEachChild(node, visit, context)
        if (ts.isIfStatement(visited)) {
          const value = evaluate(visited.expression, constants)
          if (typeof value === 'boolean') {
            const selected = value
              ? visited.thenStatement
              : visited.elseStatement
            if (!selected) return ts.factory.createEmptyStatement()
            return ts.isBlock(selected) ? [...selected.statements] : selected
          }
        }
        if (ts.isConditionalExpression(visited)) {
          const value = evaluate(visited.condition, constants)
          if (typeof value === 'boolean') {
            return value ? visited.whenTrue : visited.whenFalse
          }
        }
        if (ts.isBinaryExpression(visited)) {
          const value = evaluate(visited, constants)
          if (typeof value === 'boolean') return literal(value)
        }
        if (ts.isArrayLiteralExpression(visited)) {
          return ts.factory.updateArrayLiteralExpression(
            visited,
            visited.elements.flatMap((element) =>
              ts.isSpreadElement(element) &&
              ts.isArrayLiteralExpression(element.expression)
                ? [...element.expression.elements]
                : [element],
            ),
          )
        }
        if (ts.isObjectLiteralExpression(visited)) {
          const flattened = visited.properties.flatMap((property) =>
            ts.isSpreadAssignment(property) &&
            ts.isObjectLiteralExpression(property.expression)
              ? [...property.expression.properties]
              : [property],
          )
          const lastPropertyIndex = new Map()
          flattened.forEach((property, index) => {
            if (
              (ts.isPropertyAssignment(property) ||
                ts.isShorthandPropertyAssignment(property)) &&
              (ts.isIdentifier(property.name) ||
                ts.isStringLiteral(property.name))
            ) {
              lastPropertyIndex.set(property.name.text, index)
            }
          })
          return ts.factory.updateObjectLiteralExpression(
            visited,
            flattened.filter((property, index) => {
              if (
                (ts.isPropertyAssignment(property) ||
                  ts.isShorthandPropertyAssignment(property)) &&
                (ts.isIdentifier(property.name) ||
                  ts.isStringLiteral(property.name))
              ) {
                return lastPropertyIndex.get(property.name.text) === index
              }
              return true
            }),
          )
        }
        if (ts.isBlock(visited)) {
          const statements = []
          for (const statement of visited.statements) {
            if (ts.isEmptyStatement(statement)) continue
            statements.push(statement)
            if (
              ts.isReturnStatement(statement) ||
              ts.isThrowStatement(statement)
            )
              break
          }
          return ts.factory.updateBlock(visited, statements)
        }
        return visited
      }
      return (node) => ts.visitNode(node, visit)
    },
  ])
  const transformed = result.transformed[0]
  result.dispose()
  return transformed
}

function removeSpecParameter(declaration) {
  return ts.factory.updateFunctionDeclaration(
    declaration,
    declaration.modifiers,
    declaration.asteriskToken,
    declaration.name,
    declaration.typeParameters,
    declaration.parameters.filter(
      (parameter) =>
        !(ts.isIdentifier(parameter.name) && parameter.name.text === 'spec'),
    ),
    declaration.type,
    declaration.body,
  )
}

function removeUnusedFunctionConstants(declaration) {
  if (!declaration.body) return declaration
  let statements = [...declaration.body.statements]
  for (let pass = 0; pass < 4; pass += 1) {
    const used = identifierNames(
      statements
        .map((statement) =>
          printer.printNode(
            ts.EmitHint.Unspecified,
            statement,
            implementationFile,
          ),
        )
        .join('\n'),
      { excludeDeclarations: true },
    )
    statements = statements.filter((statement) => {
      if (
        !ts.isVariableStatement(statement) ||
        statement.declarationList.declarations.length !== 1
      ) {
        return true
      }
      const item = statement.declarationList.declarations[0]
      return !ts.isIdentifier(item.name) || used.has(item.name.text)
    })
  }
  return ts.factory.updateFunctionDeclaration(
    declaration,
    declaration.modifiers,
    declaration.asteriskToken,
    declaration.name,
    declaration.typeParameters,
    declaration.parameters,
    declaration.type,
    ts.factory.updateBlock(declaration.body, statements),
  )
}

function collectPrimitiveConstants(declaration, spec) {
  const constants = new Map()
  const body = declaration.body
  if (!body) return constants
  for (let pass = 0; pass < 4; pass += 1) {
    for (const statement of body.statements) {
      if (!ts.isVariableStatement(statement)) continue
      for (const item of statement.declarationList.declarations) {
        if (!ts.isIdentifier(item.name) || !item.initializer) continue
        const value = evaluate(item.initializer, constants, spec)
        if (
          typeof value === 'boolean' ||
          typeof value === 'string' ||
          typeof value === 'number'
        ) {
          constants.set(item.name.text, value)
        }
      }
    }
  }
  return constants
}

function evaluate(node, constants, spec) {
  if (ts.isParenthesizedExpression(node)) {
    return evaluate(node.expression, constants, spec)
  }
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (ts.isIdentifier(node)) return constants.get(node.text)
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'spec'
  ) {
    return spec?.[node.name.text]
  }
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.ExclamationToken
  ) {
    const value = evaluate(node.operand, constants, spec)
    return typeof value === 'boolean' ? !value : undefined
  }
  if (ts.isBinaryExpression(node)) {
    const left = evaluate(node.left, constants, spec)
    const right = evaluate(node.right, constants, spec)
    if (
      left !== undefined &&
      right !== undefined &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
    )
      return left === right
    if (
      left !== undefined &&
      right !== undefined &&
      node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
    )
      return left !== right
    if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
      return typeof left === 'boolean' && typeof right === 'boolean'
        ? left || right
        : undefined
    }
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return typeof left === 'boolean' && typeof right === 'boolean'
        ? left && right
        : undefined
    }
  }
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.arguments.length === 1
  ) {
    const receiver = evaluate(node.expression.expression, constants, spec)
    const argument = evaluate(node.arguments[0], constants, spec)
    if (typeof receiver === 'string' && typeof argument === 'string') {
      if (node.expression.name.text === 'includes')
        return receiver.includes(argument)
      if (node.expression.name.text === 'startsWith')
        return receiver.startsWith(argument)
    }
    if (
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'horizontalVariants' &&
      node.expression.name.text === 'has' &&
      typeof argument === 'string'
    ) {
      return horizontalVariants.has(argument)
    }
  }
  return undefined
}

function literal(value) {
  if (typeof value === 'string') return ts.factory.createStringLiteral(value)
  if (typeof value === 'number') return ts.factory.createNumericLiteral(value)
  if (typeof value === 'boolean')
    return value ? ts.factory.createTrue() : ts.factory.createFalse()
  return ts.factory.createIdentifier('undefined')
}

function typeAliasesFor(spec) {
  if (spec.variant !== 'interactive') return ''
  if (spec.family === 'area') {
    return "type InteractiveTimeRange = '90d' | '30d' | '7d'\n\n"
  }
  if (spec.family === 'bar' || spec.family === 'line') {
    return "type InteractiveSeries = 'desktop' | 'mobile'\n\n"
  }
  return ''
}

function interactiveState(spec) {
  if (spec.variant !== 'interactive') return undefined
  if (spec.family === 'area') {
    return {
      parameter: 'timeRange',
      type: 'InteractiveTimeRange',
      defaultValue: "'90d'",
    }
  }
  if (spec.family === 'bar' || spec.family === 'line') {
    return {
      parameter: 'activeSeries',
      type: 'InteractiveSeries',
      defaultValue: "'desktop'",
    }
  }
  return { parameter: 'activeMonth', type: 'string', defaultValue: "'january'" }
}

function importsFor(source) {
  const usedIdentifiers = identifierNames(source)
  const groups = new Map()
  const imports = {
    react: ['useMemo', 'useRef', 'useState'],
    '@tanstack/charts': [
      'areaY',
      'barX',
      'barY',
      'd3Curve',
      'defineChart',
      'dot',
      'group',
      'lineY',
      'stack',
      'text',
      'type ChartPoint',
      'type ChartValue',
      'type DomChartDefinition',
    ],
    '@tanstack/charts/polar': [
      'angleGrid',
      'focusGroupAngle',
      'pie',
      'polar',
      'radialArc',
      'radialArea',
      'radialBarAngle',
      'radialDot',
      'radialGrid',
      'radialRule',
      'radialText',
    ],
    '@tanstack/charts/react/tooltip': ['RendererChart'],
    '@tanstack/charts/tooltip': ['tooltip'],
    '@tanstack/charts/motion': ['motion'],
    'd3-scale': ['scaleBand', 'scaleLinear', 'scalePoint'],
    'd3-shape': [
      'curveLinear',
      'curveLinearClosed',
      'curveMonotoneX',
      'curveNatural',
      'curveStep',
    ],
    '@charts-poc/demo-data/shadcn': [
      'shadcnActivities',
      'shadcnBrowsers',
      'shadcnColors',
      'shadcnMonths',
      'shadcnRadarDefault',
      'shadcnRadarFilled',
      'shadcnRadarLines',
      'shadcnRadarMultiple',
      'shadcnSeriesRows',
      'type ShadcnActivityDatum',
      'type ShadcnBrowserDatum',
      'type ShadcnMonthDatum',
      'type ShadcnSeriesDatum',
    ],
  }
  for (const [module, names] of Object.entries(imports)) {
    const used = names.filter((entry) => {
      const name = entry.replace(/^type\s+/u, '')
      return usedIdentifiers.has(name)
    })
    if (used.length > 0) groups.set(module, used)
  }
  if (/\binteractiveAreaData\b/u.test(source)) {
    groups.set('@charts-poc/demo-data/shadcn-area-interactive-data', [
      'default:interactiveAreaData',
    ])
  }
  return [...groups]
    .map(([module, names]) => {
      const defaultImport = names.find((name) => name.startsWith('default:'))
      const named = names.filter((name) => !name.startsWith('default:'))
      if (defaultImport)
        return `import ${defaultImport.slice(8)} from '${module}'`
      return `import { ${named.join(', ')} } from '${module}'`
    })
    .join('\n')
}

function identifierNames(source, options = {}) {
  const file = ts.createSourceFile(
    'generated.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const names = new Set()
  const visit = (node) => {
    if (ts.isIdentifier(node)) {
      const parent = node.parent
      const declarationName =
        (ts.isVariableDeclaration(parent) ||
          ts.isParameter(parent) ||
          ts.isFunctionDeclaration(parent)) &&
        parent.name === node
      const propertyName =
        (ts.isPropertyAssignment(parent) ||
          ts.isMethodDeclaration(parent) ||
          ts.isPropertyAccessExpression(parent)) &&
        parent.name === node
      if ((!options.excludeDeclarations || !declarationName) && !propertyName) {
        names.add(node.text)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return names
}

function componentFor(spec) {
  const interactive = spec.variant === 'interactive'
  const state = interactiveState(spec)
  const stateSetup = !state
    ? ''
    : spec.family === 'area'
      ? "const [timeRange, setTimeRange] = useState<InteractiveTimeRange>('90d')"
      : spec.family === 'bar' || spec.family === 'line'
        ? "const [activeSeries, setActiveSeries] = useState<InteractiveSeries>('desktop')"
        : "const [activeMonth, setActiveMonth] = useState('january')"
  const stateValue = state?.parameter
  const chartDefinition = state
    ? `useMemo(() => createExampleChart(${stateValue}), [${stateValue}])`
    : 'definition'
  const headerAction = !interactive
    ? 'null'
    : spec.family === 'area'
      ? `<SelectControl value={timeRange} onChange={(value) => setTimeRange(value as InteractiveTimeRange)} options={[{ value: '90d', label: 'Last 3 months' }, { value: '30d', label: 'Last 30 days' }, { value: '7d', label: 'Last 7 days' }]} />`
      : spec.family === 'bar' || spec.family === 'line'
        ? '<BarMetrics active={activeSeries} onChange={setActiveSeries} />'
        : `<SelectControl value={activeMonth} onChange={setActiveMonth} options={interactivePieRows.map((row, index) => ({ value: row.browser, label: titleCase(row.browser), swatch: shadcnColors[index] }))} />`
  const square = spec.square
  const variant = interactive ? `interactive-${spec.family}` : 'default'
  const footer =
    spec.family === 'tooltip' ||
    interactive ||
    (spec.family === 'pie' && spec.variant === 'legend')
      ? 'null'
      : `<TrendFooter note=${JSON.stringify(spec.footerNote)} />`
  const legend = spec.legend ? '<Legend />' : 'null'
  const chartProps =
    spec.family === 'tooltip'
      ? `onRender={({ scene, interaction }) => {
            if (seededTooltip.current) return
            const point = scene.points.find((candidate) => (candidate.datum as ShadcnActivityDatum).date === '2024-07-16')
            if (!point) return
            seededTooltip.current = true
            interaction.setControlledFocus(point, { source: 'programmatic' })
          }}
          renderTooltipBody={({ points }) => <ShadcnTooltipBody points={points as readonly ChartPoint<ShadcnActivityDatum>[]} variant=${JSON.stringify(spec.variant)} />}`
      : ''
  const tooltipRef =
    spec.family === 'tooltip' ? 'const seededTooltip = useRef(false)' : ''
  const helperSource = componentHelpers(spec)

  return `export interface ExampleProps { width?: number; height?: number }

export default function Example({ width = 640, height = 600 }: ExampleProps) {
  ${stateSetup}
  ${tooltipRef}
  const chartDefinition = ${chartDefinition}
  const renderer = useMemo(() => motion<ExampleDatum, ExampleXValue, ExampleYValue>({ initial: 'always', transition: { type: 'spring', stiffness: 170, damping: 18, mass: 1 } }), [])
  const contentWidth = Math.max(1, width - 50)
  const chartWidth = ${square ? `Math.min(${interactive && spec.family === 'pie' ? 300 : 250}, contentWidth)` : 'contentWidth'}
  const chartHeight = ${
    square
      ? 'chartWidth'
      : interactive && ['area', 'bar', 'line'].includes(spec.family)
        ? '250'
        : spec.legend
          ? '(contentWidth * 9) / 16 - 27'
          : '(contentWidth * 9) / 16'
  }
  const headerAction = ${headerAction}
  const legend = ${legend}
  const footer = ${footer}

  return (
    <div className="sc-example" style={{ width, height }}>
      <article className="sc-card sc-${variant}" style={{ width }}>
        <header className="sc-card-header"${spec.family === 'radar' && spec.variant !== 'dots' && spec.variant !== 'legend' ? ' style={{ paddingBottom: 16 }}' : ''}>
          <div className="sc-card-heading"><h2>${escapeJsx(spec.title)}</h2><p>${escapeJsx(spec.description)}</p></div>
          {headerAction ? <div className="sc-card-action">{headerAction}</div> : null}
        </header>
        <div className="sc-card-content${square ? ' sc-centered' : ''}">
          <div className="sc-chart${spec.name === 'chart-radar-label-custom' ? ' sc-chart-clip' : ''}" style={{ width: chartWidth, height: chartHeight }}>
            <RendererChart definition={chartDefinition} renderer={renderer} initialWidth={chartWidth} height={chartHeight} ariaLabel=${JSON.stringify(spec.title)} ${chartProps} />
          </div>
          {legend ? <div className="sc-chart-footer">{legend}</div> : null}
        </div>
        {footer ? <footer className="sc-card-footer${square ? ' sc-centered' : ''}">{footer}</footer> : null}
      </article>
    </div>
  )
}

${helperSource}`
}

function componentHelpers(spec) {
  const helpers = []
  if (spec.legend) {
    const labels =
      spec.family === 'pie' || spec.family === 'radial'
        ? "['chrome', 'safari', 'firefox', 'edge', 'other']"
        : "['desktop', 'mobile']"
    helpers.push(`function Legend() {
  return <>{${labels}.map((label, index) => <span className="sc-legend-item" key={label}>${spec.variant === 'icons' ? '<svg className="sc-legend-icon" viewBox="0 0 24 24" aria-hidden><path d={index === 0 ? \'M12 3v18m-4-4 4 4 4-4M5 7h14\' : \'M12 21V3m-4 4 4-4 4 4M5 17h14\'} /></svg>' : '<span className="sc-legend-dot" style={{ background: shadcnColors[index] }} />'}{titleCase(label)}</span>)}</>
}`)
  }
  if (
    spec.family !== 'tooltip' &&
    spec.variant !== 'interactive' &&
    !(spec.family === 'pie' && spec.variant === 'legend')
  ) {
    helpers.push(`function TrendFooter({ note }: { note: string }) {
  return <><div className="sc-trend">Trending up by 5.2% this month <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 17 6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg></div><div className="sc-footer-note">{note}</div></>
}`)
  }
  if (
    spec.variant === 'interactive' &&
    (spec.family === 'area' || spec.family === 'pie')
  ) {
    helpers.push(`function SelectControl({ value, options, onChange }: { value: string; options: readonly { value: string; label: string; swatch?: string }[]; onChange: (value: string) => void }) {
  const selected = options.find((option) => option.value === value)
  return <label className="sc-select-display">{selected?.swatch ? <span className="sc-select-swatch" style={{ background: selected.swatch }} /> : null}<select aria-label="Select a value" value={value} onChange={(event) => onChange(event.currentTarget.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" /></svg></label>
}`)
  }
  if (
    spec.variant === 'interactive' &&
    (spec.family === 'bar' || spec.family === 'line')
  ) {
    helpers.push(`function BarMetrics({ active, onChange }: { active: InteractiveSeries; onChange: (series: InteractiveSeries) => void }) {
  const totals = { desktop: interactiveBarRows.reduce((sum, row) => sum + row.desktop, 0), mobile: interactiveBarRows.reduce((sum, row) => sum + row.mobile, 0) }
  return <>{twoSeries.map((series) => <button key={series} type="button" className="sc-bar-metric" data-active={active === series} aria-pressed={active === series} onClick={() => onChange(series)}><span>{titleCase(series)}</span><strong>{totals[series].toLocaleString('en-US')}</strong></button>)}</>
}`)
  }
  return helpers.join('\n\n')
}

function escapeJsx(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
