import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const productionCatalogUrl = 'https://tanstack.com/charts/catalog/'

export async function checkCatalogDeployment({
  catalogUrl = productionCatalogUrl,
  fetchImplementation = fetch,
  minimumCaseCount = 100,
} = {}) {
  const baseUrl = new URL(catalogUrl)
  assert(
    baseUrl.pathname.endsWith('/'),
    `catalog URL must end in a slash: ${baseUrl}`,
  )

  const bareUrl = new URL(baseUrl)
  bareUrl.pathname = bareUrl.pathname.slice(0, -1)
  await assertCanonicalRedirect(fetchImplementation, bareUrl, baseUrl)

  const queriedBareUrl = new URL(bareUrl)
  queriedBareUrl.searchParams.set('deployment-smoke', '1')
  await assertCanonicalRedirect(fetchImplementation, queriedBareUrl, baseUrl)

  const root = await fetchOk(fetchImplementation, baseUrl)
  const rootHtml = await root.text()
  assertSecurityHeaders(root, { frameable: false })
  assert(
    rootHtml.includes(
      `<link rel="canonical" href="${baseUrl.origin}${baseUrl.pathname}"`,
    ),
    'catalog root canonical URL is missing',
  )

  const catalogJsonUrl = new URL('catalog.json', baseUrl)
  const catalogResponse = await fetchOk(fetchImplementation, catalogJsonUrl)
  assertSecurityHeaders(catalogResponse, { frameable: false })
  const catalog = await catalogResponse.json()
  assert(
    catalog.site?.origin === baseUrl.origin,
    'deployed catalog origin is incorrect',
  )
  assert(
    catalog.site?.basePath === baseUrl.pathname,
    'deployed catalog base path is incorrect',
  )
  assert(
    Array.isArray(catalog.cases) && catalog.cases.length >= minimumCaseCount,
    `deployed catalog has fewer than ${minimumCaseCount} cases`,
  )

  const sample = catalog.cases[0]
  assert(
    typeof sample?.routes?.page === 'string' &&
      typeof sample?.routes?.embed === 'string',
    'catalog sample routes are missing',
  )

  const detailUrl = new URL(sample.routes.page, baseUrl.origin)
  const detail = await fetchOk(fetchImplementation, detailUrl)
  assertSecurityHeaders(detail, { frameable: false })
  assert(
    (await detail.text()).includes(
      `<link rel="canonical" href="${detailUrl.href}"`,
    ),
    'sample detail canonical URL is missing',
  )

  const embedUrl = new URL(sample.routes.embed, baseUrl.origin)
  const embed = await fetchOk(fetchImplementation, embedUrl)
  assertSecurityHeaders(embed, { frameable: true })
  assert(
    (await embed.text()).includes(
      '<meta name="robots" content="noindex,follow"',
    ),
    'sample embed must be noindex',
  )

  const assetPath = readHashedAssetPath(rootHtml, baseUrl.pathname)
  const asset = await fetchOk(
    fetchImplementation,
    new URL(assetPath, baseUrl.origin),
  )
  assertSecurityHeaders(asset, { frameable: false })
  assert(
    /\bimmutable\b/.test(requiredHeader(asset, 'cache-control')),
    'fingerprinted catalog assets must be immutable',
  )

  const missingUrl = new URL('__deployment-smoke-missing__/', baseUrl)
  const missing = await fetchImplementation(missingUrl)
  assert(
    missing.status === 404,
    `missing catalog route returned ${missing.status}`,
  )
  assertSecurityHeaders(missing, { frameable: false })
  assert(
    (await missing.text()).includes(
      '<meta name="robots" content="noindex,follow"',
    ),
    'catalog 404 must be noindex',
  )

  return {
    assetPath,
    caseCount: catalog.cases.length,
    sampleId: sample.id,
  }
}

async function fetchOk(fetchImplementation, url) {
  const response = await fetchImplementation(url)
  assert(response.ok, `${url} returned ${response.status}`)
  return response
}

async function assertCanonicalRedirect(fetchImplementation, url, canonical) {
  const response = await fetchImplementation(url, {
    redirect: 'manual',
  })
  assert(
    [301, 302, 307, 308].includes(response.status),
    `${url.pathname}${url.search} must redirect to the canonical trailing-slash route`,
  )
  const target = new URL(requiredHeader(response, 'location'), url)
  assert(
    target.pathname === canonical.pathname,
    `catalog redirect points to ${target.pathname}`,
  )
  assert(
    target.search === url.search,
    `catalog redirect changed the query from ${url.search} to ${target.search}`,
  )
}

function assertSecurityHeaders(response, { frameable }) {
  assert(
    requiredHeader(response, 'x-content-type-options') === 'nosniff',
    'catalog responses must disable content sniffing',
  )
  const frameOptions = response.headers.get('x-frame-options')
  if (frameable) {
    assert(frameOptions === null, 'catalog embeds must remain frameable')
  } else {
    assert(frameOptions === 'DENY', 'catalog pages must deny framing')
  }
}

function readHashedAssetPath(html, basePath) {
  const matches = html.matchAll(
    /(?:href|src)="(\/charts\/catalog\/assets\/[^"]+)"/g,
  )
  for (const match of matches) {
    const value = match[1]
    if (value?.startsWith(`${basePath}assets/`)) return value
  }
  throw new Error('catalog root does not reference a built asset')
}

function requiredHeader(response, name) {
  const value = response.headers.get(name)
  assert(value, `response is missing ${name}`)
  return value
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function checkWithRetries(attempts = 30) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await checkCatalogDeployment()
    } catch (error) {
      lastError = error
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 3_000))
      }
    }
  }
  throw lastError
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) {
  const result = await checkWithRetries()
  console.log(
    `Verified ${result.caseCount} live catalog cases, sample ${result.sampleId}, and ${result.assetPath}.`,
  )
}
