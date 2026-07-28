import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chartEmbedContract } from '../examples/conformance/src/embed-contract.ts'

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const outputDirectory = path.join(
  rootDirectory,
  'examples',
  'conformance',
  'dist',
)
const basePath = normalizeBasePath(process.env.CATALOG_BASE_PATH ?? '/')
const publicOrigin = normalizeOrigin(process.env.CATALOG_ORIGIN)

const catalog = JSON.parse(
  await fs.readFile(path.join(outputDirectory, 'catalog.json'), 'utf8'),
)

assert(catalog.schemaVersion === 1, 'catalog.json schemaVersion must be 1')
assert(
  catalog.site?.origin === (publicOrigin || null),
  'catalog.json origin does not match CATALOG_ORIGIN',
)
assert(
  catalog.site?.basePath === basePath,
  'catalog.json basePath does not match CATALOG_BASE_PATH',
)
assert(
  JSON.stringify(catalog.embed) === JSON.stringify(chartEmbedContract),
  'catalog.json embed contract drifted from the runtime contract',
)
assert(
  Array.isArray(catalog.cases) && catalog.cases.length > 0,
  'catalog.json must contain cases',
)

await verifyRoute(basePath, 'index,follow')
await verifyRoute(`${basePath}all/`, 'index,follow')

for (const entry of catalog.cases) {
  assert(
    typeof entry.id === 'string' && entry.id.length > 0,
    'every catalog case needs an id',
  )
  assert(
    entry.routes?.page === `${basePath}charts/${encodeURIComponent(entry.id)}/`,
    `invalid page route for ${entry.id}`,
  )
  assert(
    entry.routes?.embed === `${basePath}embed/${encodeURIComponent(entry.id)}/`,
    `invalid embed route for ${entry.id}`,
  )
  await verifyRoute(entry.routes.page, 'index,follow')
  await verifyRoute(entry.routes.embed, 'noindex,follow')
}

const notFound = await fs.readFile(
  path.join(outputDirectory, '404.html'),
  'utf8',
)
assert(
  hasMetaContent(notFound, 'robots', 'noindex,follow'),
  '404.html must be noindex,follow',
)

const shell = await fs.readFile(
  path.join(outputDirectory, 'index.html'),
  'utf8',
)
if (basePath !== '/') {
  assert(
    shell.includes(`${basePath}assets/`),
    `built assets must use deployment base ${basePath}`,
  )
}

console.log(
  `Verified ${catalog.cases.length} catalog pages and ${catalog.cases.length} direct embeds at ${basePath}.`,
)

async function verifyRoute(route, robots) {
  assert(
    route.startsWith(basePath) && route.endsWith('/'),
    `route must stay below ${basePath} and end in a slash: ${route}`,
  )
  const relativeRoute = route.slice(basePath.length)
  const filePath = relativeRoute
    ? path.join(outputDirectory, relativeRoute, 'index.html')
    : path.join(outputDirectory, 'index.html')
  const html = await fs.readFile(filePath, 'utf8')
  const canonical = publicOrigin ? `${publicOrigin}${route}` : route
  assert(
    html.includes(
      `<link rel="canonical" href="${escapeAttribute(canonical)}" />`,
    ),
    `canonical URL mismatch in ${filePath}`,
  )
  assert(
    hasMetaContent(html, 'robots', robots),
    `robots metadata mismatch in ${filePath}`,
  )
}

function hasMetaContent(html, name, content) {
  return html.includes(`<meta name="${name}" content="${content}" />`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function normalizeBasePath(value) {
  const leadingSlash = value.startsWith('/') ? value : `/${value}`
  return leadingSlash.endsWith('/') ? leadingSlash : `${leadingSlash}/`
}

function normalizeOrigin(value) {
  if (!value) return ''
  return new URL(value).origin
}

function escapeAttribute(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
