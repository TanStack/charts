import type {
  ConformanceReferenceRenderer,
  ConformanceRenderer,
} from '../../../benchmarks/conformance/types'

const comparisonParameter = 'compare'
const comparisonValue = '1'

export function isCatalogComparisonMode(search: string): boolean {
  return (
    new URLSearchParams(search).get(comparisonParameter) === comparisonValue
  )
}

export function withCatalogComparisonMode(
  href: string,
  enabled: boolean,
): string {
  if (!enabled) return href
  const url = new URL(href, 'https://catalog.invalid')
  url.searchParams.set(comparisonParameter, comparisonValue)
  return `${url.pathname}${url.search}${url.hash}`
}

export function catalogRenderers(
  reference: ConformanceReferenceRenderer,
  comparisonMode: boolean,
): readonly ConformanceRenderer[] {
  return comparisonMode ? [reference, 'tanstack'] : ['tanstack']
}
