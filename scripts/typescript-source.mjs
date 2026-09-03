import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const unusedDiagnosticCodes = new Set([6133, 6192, 6196, 6198])

const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  noEmit: true,
  noUnusedLocals: true,
  skipLibCheck: true,
  allowImportingTsExtensions: true,
  allowArbitraryExtensions: true,
  resolveJsonModule: true,
}

export function removeUnusedTypeScript(source, filePath) {
  const normalizedPath = path.resolve(filePath)
  let result = source

  for (let pass = 0; pass < 8; pass += 1) {
    const service = createLanguageService(normalizedPath, result, pass)
    try {
      const textChanges = service
        .getSemanticDiagnostics(normalizedPath)
        .filter((diagnostic) => unusedDiagnosticCodes.has(diagnostic.code))
        .filter(
          (diagnostic) =>
            !diagnosticTargetsParameter(
              service.getProgram(),
              normalizedPath,
              diagnostic.start ?? 0,
            ),
        )
        .flatMap((diagnostic) =>
          service.getCodeFixesAtPosition(
            normalizedPath,
            diagnostic.start ?? 0,
            (diagnostic.start ?? 0) + (diagnostic.length ?? 0),
            [diagnostic.code],
            {},
            {},
          ),
        )
        .filter((fix) => fix.fixName === 'unusedIdentifier')
        .flatMap((fix) => fix.changes)
        .filter((change) => path.resolve(change.fileName) === normalizedPath)
        .flatMap((change) => change.textChanges)
        .filter(
          (change, index, all) =>
            all.findIndex(
              (candidate) =>
                candidate.span.start === change.span.start &&
                candidate.span.length === change.span.length &&
                candidate.newText === change.newText,
            ) === index,
        )
        .sort((left, right) => right.span.start - left.span.start)
      if (textChanges.length === 0) return result
      for (const change of textChanges) {
        result =
          result.slice(0, change.span.start) +
          change.newText +
          result.slice(change.span.start + change.span.length)
      }
    } finally {
      service.dispose()
    }
  }

  throw new Error(`unused TypeScript cleanup did not converge for ${filePath}`)
}

function diagnosticTargetsParameter(program, filePath, position) {
  const sourceFile = program?.getSourceFile(filePath)
  if (!sourceFile) return false
  let node = ts.getTokenAtPosition(sourceFile, position)
  while (node && node !== sourceFile) {
    if (ts.isParameter(node)) return true
    node = node.parent
  }
  return false
}

function createLanguageService(filePath, source, version) {
  const host = {
    getScriptFileNames: () => [filePath],
    getScriptVersion: () => String(version),
    getScriptSnapshot(candidate) {
      if (path.resolve(candidate) === filePath) {
        return ts.ScriptSnapshot.fromString(source)
      }
      if (!fs.existsSync(candidate)) return undefined
      return ts.ScriptSnapshot.fromString(fs.readFileSync(candidate, 'utf8'))
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  }
  return ts.createLanguageService(host)
}
