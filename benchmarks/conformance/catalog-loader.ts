import type {
  ConformanceImplementationModule,
  ConformanceRenderer,
} from './types'

type ModuleLoader = () => Promise<unknown>
type ModuleRegistry = Record<string, ModuleLoader>

export interface CatalogSourceFile {
  path: string
  source: string
}

export async function loadCatalogImplementation(
  modules: ModuleRegistry,
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
  modules: ModuleRegistry,
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
  modules: ModuleRegistry,
  entryPath: string,
): Promise<CatalogSourceFile[]> {
  const caseDirectory = entryPath.slice(0, entryPath.lastIndexOf('/') + 1)
  const files: CatalogSourceFile[] = []
  const visited = new Set<string>()

  async function visit(path: string) {
    if (visited.has(path) || !path.startsWith(caseDirectory)) return
    visited.add(path)

    const source = await loadCatalogSource(modules, path)
    if (source === null) return
    files.push({
      path: path.slice(caseDirectory.length),
      source,
    })

    for (const specifier of relativeImports(source)) {
      const dependency = resolveSourcePath(path, specifier, modules)
      if (dependency) await visit(dependency)
    }
  }

  await visit(entryPath)
  return files
}

export function rendererFileName(renderer: ConformanceRenderer): string {
  return renderer === 'observable-plot' ? 'plot' : renderer
}

function relativeImports(source: string): string[] {
  const imports: string[] = []
  const pattern = /(?:\bfrom\s*|\bimport\s*)['"](?<specifier>\.[^'"]+)['"]/gu
  for (const match of source.matchAll(pattern)) {
    const specifier = match.groups?.specifier
    if (specifier) imports.push(specifier)
  }
  return imports
}

function resolveSourcePath(
  importer: string,
  specifier: string,
  modules: ModuleRegistry,
): string | null {
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
  for (const candidate of [base, `${base}.ts`, `${base}/index.ts`]) {
    if (candidate in modules && !candidate.endsWith('.test.ts')) {
      return candidate
    }
  }
  return null
}

function normalizeSourcePath(path: string): string {
  return path.startsWith('.') ? path : `./${path}`
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
