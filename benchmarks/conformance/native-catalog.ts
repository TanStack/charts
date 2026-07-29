/// <reference types="vite/client" />

import { loadCatalogImplementation, loadCatalogSource } from './catalog-loader'
import type { ConformanceImplementationModule } from './types'

const implementationModules = import.meta.glob('./cases/*/tanstack.ts')
const sourceModules = import.meta.glob('./cases/*/tanstack.ts', {
  query: '?raw',
  import: 'default',
})

export function loadTanStackImplementation(
  id: string,
): Promise<ConformanceImplementationModule | null> {
  return loadCatalogImplementation(
    implementationModules,
    `./cases/${id}/tanstack.ts`,
  )
}

export function loadTanStackSource(id: string): Promise<string | null> {
  return loadCatalogSource(sourceModules, `./cases/${id}/tanstack.ts`)
}
