/// <reference types="vite/client" />

import { parseConformanceCaseMeta } from './metadata'
import type {
  ConformanceCaseMeta,
  ConformanceImplementationModule,
  ConformanceReferenceRenderer,
  ConformanceRenderer,
} from './types'

const metadataModules = import.meta.glob('./cases/*/case.json', {
  eager: true,
  import: 'default',
})
const implementationModules = import.meta.glob('./cases/*/*.ts')
const sourceModules = import.meta.glob('./cases/*/*.ts', {
  query: '?raw',
  import: 'default',
})

export const conformanceCases = Object.entries(metadataModules)
  .map(([path, value]) => parseConformanceCaseMeta(value, path))
  .sort((left, right) => left.order - right.order)

export function getConformanceReferenceRenderer(
  entry: ConformanceCaseMeta,
): ConformanceReferenceRenderer {
  return entry.referenceRenderer ?? 'observable-plot'
}

export async function loadConformanceImplementation(
  id: string,
  renderer: ConformanceRenderer,
): Promise<ConformanceImplementationModule | null> {
  const path = `./cases/${id}/${rendererFileName(renderer)}.ts`
  const load = implementationModules[path]
  if (!load) return null
  const implementation = await load()
  if (!isImplementationModule(implementation)) {
    throw new TypeError(`Conformance implementation "${path}" has no mount`)
  }
  return implementation
}

export async function loadConformanceSource(
  id: string,
  renderer: ConformanceRenderer,
): Promise<string | null> {
  const path = `./cases/${id}/${rendererFileName(renderer)}.ts`
  const load = sourceModules[path]
  if (!load) return null
  const source = await load()
  if (typeof source !== 'string') {
    throw new TypeError(`Conformance source "${path}" did not load as text`)
  }
  return source
}

function rendererFileName(renderer: ConformanceRenderer): string {
  if (renderer === 'observable-plot') return 'plot'
  return renderer
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
