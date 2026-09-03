import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const casesRoot = path.join(root, 'benchmarks', 'conformance', 'cases')
const demoDataRoot = path.join(root, 'packages', 'charts-demo-data', 'src')
const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css']
const browserModuleExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs']
const demoDataPrefixes = ['@tanstack/charts-data/']
const forbiddenPublicNames =
  /\b(?:Conformance|ExampleOptions|tanstackCase|tanstackMount|reactMount|catalogPreviewDefinition)\b/
const privatePackageName = '@charts-poc/'

const directories = (await fs.readdir(casesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

const failures = []
const closureSizes = []
const publicTypeScriptPaths = new Set()

for (const directory of directories) {
  const caseRoot = path.join(casesRoot, directory)
  const examplePath = path.join(caseRoot, 'example.tsx')
  const adapterPath = path.join(caseRoot, 'tanstack.ts')

  if (!(await isFile(examplePath))) {
    failures.push(`${directory}: missing example.tsx`)
    continue
  }
  if (!(await isFile(adapterPath))) {
    failures.push(`${directory}: missing tanstack.ts adapter`)
    continue
  }

  const adapterSource = await fs.readFile(adapterPath, 'utf8')
  if (!fromExample(adapterSource)) {
    failures.push(`${directory}: tanstack.ts does not import ./example`)
  }

  const visited = new Set()
  const pending = [examplePath]
  while (pending.length > 0) {
    const sourcePath = pending.pop()
    if (!sourcePath || visited.has(sourcePath)) continue
    visited.add(sourcePath)

    const source = await fs.readFile(sourcePath, 'utf8')
    const relativePath = path.relative(caseRoot, sourcePath)
    if (/\.(?:ts|tsx)$/u.test(sourcePath)) {
      publicTypeScriptPaths.add(sourcePath)
    }
    if (forbiddenPublicNames.test(source)) {
      failures.push(
        `${directory}/${relativePath}: contains conformance-only code`,
      )
    }
    if (source.includes(privatePackageName)) {
      failures.push(
        `${directory}/${relativePath}: exposes a private workspace package`,
      )
    }
    if (
      sourcePath === examplePath &&
      !hasDefaultComponentExport(source, sourcePath)
    ) {
      failures.push(
        `${directory}: example.tsx must default-export a React component function`,
      )
    }
    if (sourcePath === examplePath && definitionFollowsComponent(source)) {
      failures.push(
        `${directory}: put the chart definition before the component shell`,
      )
    }
    if (sourcePath === examplePath) {
      for (const problem of catalogScaffoldingProblems(source, sourcePath)) {
        failures.push(`${directory}: ${problem}`)
      }
    }

    for (const specifier of importSpecifiers(source, sourcePath)) {
      const demoDataPrefix = demoDataPrefixes.find((prefix) =>
        specifier.startsWith(prefix),
      )
      if (demoDataPrefix) {
        const demoDataSpecifier = specifier.slice(demoDataPrefix.length)
        const resolved = await resolveImport(
          demoDataRoot,
          `./${demoDataSpecifier}`,
          browserModuleExtensions,
        )
        if (!resolved) {
          failures.push(
            `${directory}/${relativePath}: demo-data import is not a browser module (${specifier})`,
          )
        }
        continue
      }
      if (!specifier.startsWith('.')) continue
      const resolved = await resolveImport(path.dirname(sourcePath), specifier)
      if (!resolved) {
        failures.push(
          `${directory}/${relativePath}: cannot resolve ${JSON.stringify(specifier)}`,
        )
        continue
      }
      const relativeTarget = path.relative(caseRoot, resolved)
      if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
        failures.push(
          `${directory}/${relativePath}: public import leaves the case directory (${specifier})`,
        )
        continue
      }
      if (/\.(?:ts|tsx|js|jsx)$/.test(resolved)) pending.push(resolved)
    }
  }
  closureSizes.push(visited.size)
}

checkUnusedPublicSource(publicTypeScriptPaths, failures)

if (failures.length > 0) {
  throw new Error(`Catalog example contract failed:\n${failures.join('\n')}`)
}

console.log(
  `Validated ${directories.length} self-contained catalog example entries (largest TypeScript closure: ${Math.max(...closureSizes)} files).`,
)

function fromExample(source) {
  return /(?:from\s*|import\s*)['"]\.\/example['"]/.test(source)
}

function hasDefaultComponentExport(source, sourcePath) {
  const file = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  return file.statements.some(
    (statement) =>
      ts.isFunctionDeclaration(statement) &&
      statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
      ),
  )
}

function definitionFollowsComponent(source) {
  const definitionIndex = source.indexOf('defineChart(')
  const componentIndex = source.indexOf('export default function')
  return (
    definitionIndex !== -1 &&
    componentIndex !== -1 &&
    definitionIndex > componentIndex
  )
}

function catalogScaffoldingProblems(source, sourcePath) {
  const file = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const problems = []
  const localFactories = new Set()
  let exampleFactory
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      localFactories.add(statement.name.text)
      if (statement.name.text === 'createExampleChart') {
        exampleFactory = statement
      }
    }
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue
      localFactories.add(declaration.name.text)
      if (declaration.name.text === 'createExampleChart') {
        exampleFactory = declaration
        if (
          declaration.initializer &&
          ts.isIdentifier(declaration.initializer)
        ) {
          problems.push(
            'createExampleChart must contain the authored definition',
          )
        }
      }
    }
  }

  let exampleFactoryHasDefinition = false
  const visit = (node, insideExampleFactory = false) => {
    const nextInside = insideExampleFactory || node === exampleFactory
    if (isDefineChartCall(node)) {
      if (nextInside) exampleFactoryHasDefinition = true
      const chart = node.arguments[0]
      if (chart && isDefineChartCall(chart)) {
        problems.push('remove nested defineChart wrappers')
      }
      if (
        chart &&
        ts.isCallExpression(chart) &&
        ts.isIdentifier(chart.expression) &&
        localFactories.has(chart.expression.text)
      ) {
        problems.push(
          `inline the local ${chart.expression.text} chart-definition wrapper`,
        )
      }
    }
    ts.forEachChild(node, (child) => visit(child, nextInside))
  }
  visit(file)

  if (exampleFactory && !exampleFactoryHasDefinition) {
    problems.push('createExampleChart must contain defineChart')
  }
  if (/\.\.\.\s*\{\s*\}/u.test(source)) {
    problems.push('remove empty object spreads')
  }
  return [...new Set(problems)]
}

function isDefineChartCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'defineChart'
  )
}

function checkUnusedPublicSource(sourcePaths, output) {
  const config = ts.readConfigFile(
    path.join(root, 'tsconfig.json'),
    ts.sys.readFile,
  )
  if (config.error) {
    output.push(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
    return
  }
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
  const program = ts.createProgram({
    rootNames: [...sourcePaths],
    options: {
      ...parsed.options,
      noEmit: true,
      noUnusedLocals: true,
      noUnusedParameters: false,
    },
  })
  const unusedCodes = new Set([6133, 6192, 6196, 6198])
  for (const diagnostic of program.getSemanticDiagnostics()) {
    if (
      !diagnostic.file ||
      !sourcePaths.has(diagnostic.file.fileName) ||
      !unusedCodes.has(diagnostic.code)
    ) {
      continue
    }
    const position = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start ?? 0,
    )
    output.push(
      `${path.relative(casesRoot, diagnostic.file.fileName)}:${position.line + 1}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
    )
  }
}

function importSpecifiers(source, sourcePath) {
  const file = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    sourcePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const specifiers = []
  for (const statement of file.statements) {
    if (
      (ts.isImportDeclaration(statement) ||
        ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      specifiers.push(statement.moduleSpecifier.text)
    }
  }
  return specifiers
}

async function resolveImport(parent, specifier, extensions = sourceExtensions) {
  const target = path.resolve(parent, specifier)
  const candidates = path.extname(target)
    ? [target]
    : [
        ...extensions.map((extension) => `${target}${extension}`),
        ...extensions.map((extension) =>
          path.join(target, `index${extension}`),
        ),
      ]
  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate
  }
  return null
}

async function isFile(filePath) {
  try {
    return (await fs.stat(filePath)).isFile()
  } catch {
    return false
  }
}
