import ts from 'typescript'

const localeMethods = new Set([
  'localeCompare',
  'toLocaleDateString',
  'toLocaleString',
  'toLocaleTimeString',
])
const intlFormatters = new Set(['DateTimeFormat', 'NumberFormat'])

export function catalogLocaleProblems(source, sourcePath = 'catalog.ts') {
  const file = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(sourcePath),
  )
  const problems = []

  const visit = (node) => {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const expression = unwrapExpression(node.expression)
      const method = memberName(expression)
      const formatter =
        ts.isCallExpression(node) && localeMethods.has(method)
          ? method
          : intlFormatterName(expression)
      const localeArgumentIndex = formatter === 'localeCompare' ? 1 : 0

      if (formatter && !hasFixedLocale(node.arguments?.[localeArgumentIndex])) {
        const position = file.getLineAndCharacterOfPosition(node.getStart(file))
        const argument = localeArgumentIndex === 1 ? 'second' : 'first'
        problems.push({
          column: position.character + 1,
          formatter,
          line: position.line + 1,
          message: `${formatter} must pass a fixed locale literal as its ${argument} argument`,
        })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(file)
  return problems
}

function intlFormatterName(expression) {
  if (
    !ts.isPropertyAccessExpression(expression) &&
    !ts.isElementAccessExpression(expression)
  ) {
    return undefined
  }

  if (!isIntlReceiver(expression.expression)) {
    return undefined
  }

  const formatter = memberName(expression)
  return intlFormatters.has(formatter) ? `Intl.${formatter}` : undefined
}

function isIntlReceiver(expression) {
  const receiver = unwrapExpression(expression)
  if (ts.isIdentifier(receiver)) return receiver.text === 'Intl'
  if (
    !ts.isPropertyAccessExpression(receiver) &&
    !ts.isElementAccessExpression(receiver)
  ) {
    return false
  }
  if (memberName(receiver) !== 'Intl') return false
  const root = unwrapExpression(receiver.expression)
  return (
    ts.isIdentifier(root) &&
    (root.text === 'globalThis' ||
      root.text === 'self' ||
      root.text === 'window')
  )
}

function memberName(expression) {
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text
  }
  if (
    ts.isElementAccessExpression(expression) &&
    expression.argumentExpression &&
    isStringLiteral(unwrapExpression(expression.argumentExpression))
  ) {
    return unwrapExpression(expression.argumentExpression).text
  }
  return undefined
}

function hasFixedLocale(expression) {
  if (!expression) return false
  const locale = unwrapExpression(expression)
  if (isStringLiteral(locale)) return locale.text.length > 0
  return (
    ts.isArrayLiteralExpression(locale) &&
    locale.elements.length > 0 &&
    locale.elements.every(
      (element) => isStringLiteral(element) && element.text.length > 0,
    )
  )
}

function isStringLiteral(expression) {
  return (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  )
}

function unwrapExpression(expression) {
  let current = expression
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression
  }
  return current
}

function scriptKind(sourcePath) {
  if (sourcePath.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (sourcePath.endsWith('.jsx')) return ts.ScriptKind.JSX
  if (sourcePath.endsWith('.js') || sourcePath.endsWith('.mjs')) {
    return ts.ScriptKind.JS
  }
  return ts.ScriptKind.TS
}
