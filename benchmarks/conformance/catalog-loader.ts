import { demoDatasetForSpecifier } from '@charts-poc/demo-data/metadata'
import type {
  ConformanceImplementationModule,
  ConformanceRenderer,
} from './types'
import type { DemoDatasetMetadata } from '@charts-poc/demo-data/metadata'

export type CatalogModuleLoader = () => Promise<unknown>
export type CatalogModuleRegistry = Record<string, CatalogModuleLoader>

export type CatalogSourceKind = 'entry' | 'support' | 'fixture'
export type CatalogSourceRole = CatalogSourceKind | 'harness'

export interface CatalogSourceMetrics {
  files: number
  lines: number
  bytes: number
}

export interface CatalogSourceFile {
  path: string
  source: string
  kind: CatalogSourceKind
  lines: number
  bytes: number
}

export interface CatalogHarnessSourceFile {
  path: string
  lines: number
  bytes: number
}

export interface CatalogSourceClosure {
  files: CatalogSourceFile[]
  datasets: DemoDatasetMetadata[]
  totalFiles: number
  totalLines: number
  totalBytes: number
  roles: Record<CatalogSourceRole, CatalogSourceMetrics>
  harnessFiles: CatalogHarnessSourceFile[]
  excludedHarnessPaths: string[]
}

export async function loadCatalogImplementation(
  modules: CatalogModuleRegistry,
  path: string,
): Promise<ConformanceImplementationModule | null> {
  const load = modules[path]
  if (!load) return null
  const implementation = await load()
  if (!isImplementationModule(implementation)) {
    throw new TypeError(`Conformance implementation "${path}" has no mount`)
  }
  return implementation
}

export async function loadCatalogSource(
  modules: CatalogModuleRegistry,
  path: string,
): Promise<string | null> {
  const load = modules[path]
  if (!load) return null
  const source = await load()
  if (typeof source !== 'string') {
    throw new TypeError(`Conformance source "${path}" did not load as text`)
  }
  return source
}

export async function loadCatalogSourceClosure(
  modules: CatalogModuleRegistry,
  entryPath: string,
): Promise<CatalogSourceClosure> {
  const caseDirectory = entryPath.slice(0, entryPath.lastIndexOf('/') + 1)
  const files: CatalogSourceFile[] = []
  const harnessFiles: CatalogHarnessSourceFile[] = []
  const visited = new Set<string>()
  const visitedHarness = new Set<string>()
  const excludedHarnessPaths = new Set<string>()
  const datasets = new Map<string, DemoDatasetMetadata>()

  async function visitHarness(path: string) {
    const displayPath = displaySourcePath(path, caseDirectory)
    excludedHarnessPaths.add(displayPath)
    if (visitedHarness.has(path)) return
    visitedHarness.add(path)

    const source = await loadCatalogSource(modules, path)
    if (source === null) return
    harnessFiles.push({
      path: displayPath,
      lines: countCatalogSourceLines(source),
      bytes: countCatalogSourceBytes(source),
    })
  }

  async function visit(path: string) {
    const kind = catalogSourceKind(path, entryPath, caseDirectory)
    if (visited.has(path) || kind === null) return
    visited.add(path)

    const source = await loadCatalogSource(modules, path)
    if (source === null) return
    files.push({
      path: displaySourcePath(path, caseDirectory),
      source,
      kind,
      lines: countCatalogSourceLines(source),
      bytes: countCatalogSourceBytes(source),
    })

    for (const specifier of importedSpecifiers(source)) {
      const dataset = demoDatasetForSpecifier(specifier)
      if (dataset) datasets.set(dataset.id, dataset)
    }

    for (const specifier of relativeImports(source)) {
      const candidates = sourcePathCandidates(path, specifier)
      const harnessPath = candidates.find(isHarnessSourcePath)
      if (harnessPath) {
        await visitHarness(harnessPath)
        continue
      }
      const dependency = candidates.find(
        (candidate) => candidate in modules && !candidate.endsWith('.test.ts'),
      )
      if (!dependency) continue
      await visit(dependency)
    }
  }

  await visit(entryPath)
  files.sort(compareCatalogSourceFiles)
  harnessFiles.sort((left, right) => left.path.localeCompare(right.path))
  const roles = catalogSourceRoleMetrics(files, harnessFiles)
  const totalFiles =
    roles.entry.files + roles.support.files + roles.fixture.files
  const totalLines =
    roles.entry.lines + roles.support.lines + roles.fixture.lines
  const totalBytes =
    roles.entry.bytes + roles.support.bytes + roles.fixture.bytes

  return {
    files,
    datasets: [...datasets.values()].sort((left, right) =>
      left.title.localeCompare(right.title),
    ),
    totalFiles,
    totalLines,
    totalBytes,
    roles,
    harnessFiles,
    excludedHarnessPaths: [...excludedHarnessPaths].sort((left, right) =>
      left.localeCompare(right),
    ),
  }
}

export function rendererFileName(renderer: ConformanceRenderer): string {
  return renderer === 'observable-plot' ? 'plot' : renderer
}

export function countCatalogSourceLines(source: string): number {
  if (source.length === 0) return 0
  const lineBreaks = source.match(/\r\n|\r|\n/gu)?.length ?? 0
  return lineBreaks + (/(?:\r\n|\r|\n)$/u.test(source) ? 0 : 1)
}

export function countCatalogSourceBytes(source: string): number {
  return new TextEncoder().encode(source).byteLength
}

function relativeImports(source: string): string[] {
  return importedSpecifiers(source).filter((specifier) =>
    specifier.startsWith('.'),
  )
}

function importedSpecifiers(source: string): string[] {
  const imports: Array<{ index: number; specifier: string }> = []
  const patterns = [
    /(?:\bfrom\s*|\bimport\s*)['"](?<specifier>[^'"]+)['"]/gu,
    /\bimport\s*\(\s*['"](?<specifier>[^'"]+)['"]\s*\)/gu,
  ]

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match.groups?.specifier
      if (specifier) imports.push({ index: match.index, specifier })
    }
  }

  return imports
    .sort((left, right) => left.index - right.index)
    .map(({ specifier }) => specifier)
}

function sourcePathCandidates(importer: string, specifier: string): string[] {
  const importerParts = importer.split('/')
  importerParts.pop()
  const parts = [...importerParts]

  for (const part of specifier.split('/')) {
    if (part === '.' || part === '') continue
    if (part === '..') {
      parts.pop()
    } else {
      parts.push(part)
    }
  }

  const base = normalizeSourcePath(parts.join('/'))
  return [base, `${base}.ts`, `${base}/index.ts`]
}

function normalizeSourcePath(path: string): string {
  return path.startsWith('.') ? path : `./${path}`
}

function catalogSourceKind(
  path: string,
  entryPath: string,
  caseDirectory: string,
): CatalogSourceKind | null {
  if (path === entryPath) return 'entry'
  if (isImplementationEntryPath(path)) return null
  if (path.startsWith(caseDirectory)) {
    return isFixtureSourcePath(path) ? 'fixture' : 'support'
  }
  if (path.startsWith('./shared/transforms/')) {
    return 'support'
  }
  if (path === './shared/data.ts' || path.startsWith('./shared/fixtures/')) {
    return 'fixture'
  }
  if (path.startsWith('./cases/') && isFixtureSourcePath(path)) {
    return 'fixture'
  }
  return null
}

function isImplementationEntryPath(path: string): boolean {
  return /\/(?:tanstack|plot|recharts|echarts)\.ts$/u.test(path)
}

function isFixtureSourcePath(path: string): boolean {
  return /\/(?:data|[^/]+-data)\.ts$/u.test(path)
}

function isHarnessSourcePath(path: string): boolean {
  return /^\.\/shared\/(?:mount|recharts-mount|echarts-mount)\.ts$/u.test(path)
}

function displaySourcePath(path: string, caseDirectory: string): string {
  return path.startsWith(caseDirectory)
    ? path.slice(caseDirectory.length)
    : path.replace(/^\.\//u, '')
}

function compareCatalogSourceFiles(
  left: CatalogSourceFile,
  right: CatalogSourceFile,
): number {
  const kindOrder: Record<CatalogSourceKind, number> = {
    entry: 0,
    support: 1,
    fixture: 2,
  }
  return (
    kindOrder[left.kind] - kindOrder[right.kind] ||
    left.path.localeCompare(right.path)
  )
}

function catalogSourceRoleMetrics(
  files: readonly CatalogSourceFile[],
  harnessFiles: readonly CatalogHarnessSourceFile[],
): Record<CatalogSourceRole, CatalogSourceMetrics> {
  const roles: Record<CatalogSourceRole, CatalogSourceMetrics> = {
    entry: { files: 0, lines: 0, bytes: 0 },
    support: { files: 0, lines: 0, bytes: 0 },
    fixture: { files: 0, lines: 0, bytes: 0 },
    harness: { files: 0, lines: 0, bytes: 0 },
  }

  for (const file of files) {
    addSourceMetrics(roles[file.kind], file)
  }
  for (const file of harnessFiles) {
    addSourceMetrics(roles.harness, file)
  }
  return roles
}

function addSourceMetrics(
  metrics: CatalogSourceMetrics,
  file: Pick<CatalogSourceMetrics, 'lines' | 'bytes'>,
) {
  metrics.files += 1
  metrics.lines += file.lines
  metrics.bytes += file.bytes
}

function isImplementationModule(
  value: unknown,
): value is ConformanceImplementationModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    'mount' in value &&
    typeof value.mount === 'function'
  )
}
