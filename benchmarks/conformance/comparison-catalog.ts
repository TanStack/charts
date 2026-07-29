/// <reference types="vite/client" />

import {
  loadCatalogImplementation,
  loadCatalogSource,
  rendererFileName,
} from './catalog-loader'
import type {
  ConformanceImplementationModule,
  ConformanceReferenceRenderer,
} from './types'

const implementationModules = import.meta.glob([
  './cases/*/plot.ts',
  './cases/*/recharts.ts',
  './cases/*/echarts.ts',
])
const sourceModules = import.meta.glob(
  ['./cases/*/plot.ts', './cases/*/recharts.ts', './cases/*/echarts.ts'],
  {
    query: '?raw',
    import: 'default',
  },
)

export function loadComparisonImplementation(
  id: string,
  renderer: ConformanceReferenceRenderer,
): Promise<ConformanceImplementationModule | null> {
  return loadCatalogImplementation(
    implementationModules,
    implementationPath(id, renderer),
  )
}

export function loadComparisonSource(
  id: string,
  renderer: ConformanceReferenceRenderer,
): Promise<string | null> {
  return loadCatalogSource(sourceModules, implementationPath(id, renderer))
}

function implementationPath(
  id: string,
  renderer: ConformanceReferenceRenderer,
): string {
  return `./cases/${id}/${rendererFileName(renderer)}.ts`
}
