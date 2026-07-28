export type CatalogRoute =
  | { view: 'index' }
  | { view: 'all' }
  | { view: 'case'; caseId: string }
  | { view: 'embed'; caseId: string }
  | { view: 'not-found' }

export function parseCatalogRoute(
  pathname: string,
  basePath = '/',
): CatalogRoute {
  const base = normalizeBasePath(basePath)
  const path = normalizePathname(pathname)

  if (!path.startsWith(base)) return { view: 'not-found' }

  const relativePath = path.slice(base.length)
  const segments = relativePath.split('/').filter(Boolean).map(decodeSegment)

  if (segments.some((segment) => segment === null)) {
    return { view: 'not-found' }
  }

  if (segments.length === 0) return { view: 'index' }
  if (segments.length === 1 && segments[0] === 'all') return { view: 'all' }

  if (segments.length === 2 && segments[0] === 'charts' && segments[1]) {
    return { view: 'case', caseId: segments[1] }
  }

  if (segments.length === 2 && segments[0] === 'embed' && segments[1]) {
    return { view: 'embed', caseId: segments[1] }
  }

  return { view: 'not-found' }
}

export function catalogRouteHref(
  route: Exclude<CatalogRoute, { view: 'not-found' }>,
  basePath = '/',
): string {
  const base = normalizeBasePath(basePath)

  if (route.view === 'index') return base
  if (route.view === 'all') return `${base}all/`
  if (route.view === 'case') {
    return `${base}charts/${encodeURIComponent(route.caseId)}/`
  }
  return `${base}embed/${encodeURIComponent(route.caseId)}/`
}

export function normalizeBasePath(basePath: string): string {
  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`
  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`
}

function normalizePathname(pathname: string): string {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`
}

function decodeSegment(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}
