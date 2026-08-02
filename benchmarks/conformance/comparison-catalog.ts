/// <reference types="vite/client" />

import {
  loadCatalogImplementation,
  loadCatalogSourceClosure,
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
  [
    './cases/**/*.ts',
    './cases/**/*.tsx',
    './shared/**/*.ts',
    './shared/**/*.tsx',
    '!./cases/**/*.test.ts',
    '!./cases/**/*.test.tsx',
    '!./shared/**/*.test.ts',
    '!./shared/**/*.test.tsx',
  ],
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

export function loadComparisonSources(
  id: string,
  renderer: ConformanceReferenceRenderer,
) {
  return loadCatalogSourceClosure(
    sourceModules,
    implementationPath(id, renderer),
  )
}

function implementationPath(
  id: string,
  renderer: ConformanceReferenceRenderer,
): string {
  return `./cases/${id}/${rendererFileName(renderer)}.ts`
}
