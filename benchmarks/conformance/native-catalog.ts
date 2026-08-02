/// <reference types="vite/client" />

import {
  loadCatalogImplementation,
  loadCatalogSourceClosure,
} from './catalog-loader'
import type { ConformanceImplementationModule } from './types'

const implementationModules = import.meta.glob('./cases/*/tanstack.ts')
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

export function loadTanStackImplementation(
  id: string,
): Promise<ConformanceImplementationModule | null> {
  return loadCatalogImplementation(
    implementationModules,
    `./cases/${id}/tanstack.ts`,
  )
}

export function loadTanStackSources(id: string) {
  return loadCatalogSourceClosure(sourceModules, `./cases/${id}/tanstack.ts`)
}
