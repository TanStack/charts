/// <reference types="vite/client" />

import { parseConformanceCaseMeta } from './metadata'
import type { ConformanceCaseMeta, ConformanceReferenceRenderer } from './types'

const metadataModules = import.meta.glob('./cases/*/case.json', {
  eager: true,
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
