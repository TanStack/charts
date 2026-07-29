import type {
  ConformanceImplementationModule,
  ConformanceRenderer,
} from './types'

type ModuleLoader = () => Promise<unknown>
type ModuleRegistry = Record<string, ModuleLoader>

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

export function rendererFileName(renderer: ConformanceRenderer): string {
  return renderer === 'observable-plot' ? 'plot' : renderer
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
