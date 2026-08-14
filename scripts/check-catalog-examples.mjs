import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const casesRoot = path.join(root, 'benchmarks', 'conformance', 'cases')
const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css']
const forbiddenPublicNames =
  /\b(?:Conformance|tanstackCase|tanstackMount|reactMount|catalogPreviewDefinition)\b/

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

    for (const specifier of importSpecifiers(source, sourcePath)) {
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

async function resolveImport(parent, specifier) {
  const target = path.resolve(parent, specifier)
  const candidates = path.extname(target)
    ? [target]
    : [
        ...sourceExtensions.map((extension) => `${target}${extension}`),
        ...sourceExtensions.map((extension) =>
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
