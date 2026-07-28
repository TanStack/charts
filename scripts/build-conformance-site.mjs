import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseConformanceCaseMeta } from '../benchmarks/conformance/metadata.ts'

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const casesDirectory = path.join(
  rootDirectory,
  'benchmarks',
  'conformance',
  'cases',
)
const outputDirectory = path.join(
  rootDirectory,
  'examples',
  'conformance',
  'dist',
)
const checkOnly = process.argv.includes('--check')
const basePath = normalizeBasePath(process.env.CATALOG_BASE_PATH ?? '/')
const publicOrigin = normalizeOrigin(process.env.CATALOG_ORIGIN)

const cases = await readCases()
validateCases(cases)

if (checkOnly) {
  console.log(`Validated ${cases.length} publishable catalog cases.`)
  process.exit(0)
}

await generateSite(cases)
console.log(
  `Generated ${cases.length} chart pages, ${cases.length} embeds, and catalog.json.`,
)

async function readCases() {
  const directories = (
    await fs.readdir(casesDirectory, { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  return Promise.all(
    directories.map(async (directory) => {
      const metadataPath = path.join(casesDirectory, directory, 'case.json')
      let source
      try {
        source = await fs.readFile(metadataPath, 'utf8')
      } catch (error) {
        throw new Error(`Missing catalog metadata: ${metadataPath}`, {
          cause: error,
        })
      }

      let rawMetadata
      try {
        rawMetadata = JSON.parse(source)
      } catch (error) {
        throw new Error(`Invalid JSON in ${metadataPath}`, { cause: error })
      }
      const metadata = parseConformanceCaseMeta(rawMetadata, metadataPath)

      return { directory, metadata, metadataPath }
    }),
  )
}

function validateCases(entries) {
  const ids = new Map()
  const orders = new Map()

  for (const entry of entries) {
    const { directory, metadata, metadataPath } = entry
    if (metadata.id !== directory) {
      throw new Error(
        `Catalog id "${metadata.id}" must match directory "${directory}"`,
      )
    }
    if (ids.has(metadata.id)) {
      throw new Error(
        `Duplicate catalog id "${metadata.id}" in ${metadataPath} and ${ids.get(metadata.id)}`,
      )
    }
    if (orders.has(metadata.order)) {
      throw new Error(
        `Duplicate catalog order ${metadata.order} in ${metadataPath} and ${orders.get(metadata.order)}`,
      )
    }

    ids.set(metadata.id, metadataPath)
    orders.set(metadata.order, metadataPath)
  }
}

async function generateSite(entries) {
  const shellPath = path.join(outputDirectory, 'index.html')
  let shell
  try {
    shell = await fs.readFile(shellPath, 'utf8')
  } catch (error) {
    throw new Error(
      'Build the Vite catalog before generating its static routes.',
      { cause: error },
    )
  }

  const sorted = [...entries].sort(
    (left, right) => left.metadata.order - right.metadata.order,
  )
  const rootRoute = basePath
  const rootMetadata = {
    title: 'TanStack Charts Catalog',
    description:
      'Browse executable TanStack Charts examples, conformance comparisons, source, and embeddable proofs.',
    route: rootRoute,
    noIndex: false,
  }

  await fs.writeFile(
    shellPath,
    renderDocumentMetadata(shell, rootMetadata),
    'utf8',
  )
  await writeRoute(shell, 'all', {
    title: 'All charts · TanStack Charts Catalog',
    description:
      'Render the complete TanStack Charts conformance catalog alongside its source-library references.',
    route: routePath('all'),
    noIndex: false,
  })

  for (const { metadata } of sorted) {
    await writeRoute(shell, path.join('charts', metadata.id), {
      title: `${metadata.title} · TanStack Charts Catalog`,
      description: metadata.intent,
      route: routePath('charts', metadata.id),
      noIndex: false,
    })
    await writeRoute(shell, path.join('embed', metadata.id), {
      title: `${metadata.title} · TanStack Charts`,
      description: metadata.intent,
      route: routePath('embed', metadata.id),
      noIndex: true,
    })
  }

  await fs.writeFile(
    path.join(outputDirectory, '404.html'),
    renderDocumentMetadata(shell, {
      title: 'Chart not found · TanStack Charts Catalog',
      description: 'Chart not found.',
      route: rootRoute,
      noIndex: true,
    }),
    'utf8',
  )

  await fs.writeFile(
    path.join(outputDirectory, 'catalog.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        cases: sorted.map(({ metadata }) => ({
          ...metadata,
          routes: {
            page: routePath('charts', metadata.id),
            embed: routePath('embed', metadata.id),
          },
        })),
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  if (publicOrigin) {
    const routes = [
      rootRoute,
      routePath('all'),
      ...sorted.map(({ metadata }) => routePath('charts', metadata.id)),
    ]
    const sitemap = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...routes.map(
        (route) => `  <url><loc>${escapeXml(absoluteUrl(route))}</loc></url>`,
      ),
      '</urlset>',
      '',
    ].join('\n')
    await fs.writeFile(
      path.join(outputDirectory, 'sitemap.xml'),
      sitemap,
      'utf8',
    )
  }
}

async function writeRoute(shell, directory, metadata) {
  const routeDirectory = path.join(outputDirectory, directory)
  await fs.mkdir(routeDirectory, { recursive: true })
  await fs.writeFile(
    path.join(routeDirectory, 'index.html'),
    renderDocumentMetadata(shell, metadata),
    'utf8',
  )
}

function renderDocumentMetadata(shell, { title, description, route, noIndex }) {
  let html = shell
  html = replaceRequired(
    html,
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(title)}</title>`,
    'title',
  )
  html = replaceRequired(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeAttribute(description)}" />`,
    'description',
  )
  html = replaceRequired(
    html,
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
    `<meta name="robots" content="${noIndex ? 'noindex,follow' : 'index,follow'}" />`,
    'robots',
  )
  html = replaceRequired(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escapeAttribute(title)}" />`,
    'og:title',
  )
  html = replaceRequired(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escapeAttribute(description)}" />`,
    'og:description',
  )
  html = replaceRequired(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${escapeAttribute(absoluteUrl(route))}" />`,
    'og:url',
  )
  html = replaceRequired(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${escapeAttribute(absoluteUrl(route))}" />`,
    'canonical',
  )
  return html
}

function replaceRequired(value, pattern, replacement, label) {
  if (!pattern.test(value)) {
    throw new Error(`Catalog HTML is missing the ${label} metadata marker.`)
  }
  return value.replace(pattern, replacement)
}

function routePath(...segments) {
  return `${basePath}${segments.map(encodeURIComponent).join('/')}/`
}

function absoluteUrl(route) {
  return publicOrigin ? `${publicOrigin}${route}` : route
}

function normalizeBasePath(value) {
  const leadingSlash = value.startsWith('/') ? value : `/${value}`
  return leadingSlash.endsWith('/') ? leadingSlash : `${leadingSlash}/`
}

function normalizeOrigin(value) {
  if (!value) return ''
  const url = new URL(value)
  return url.origin
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', '&quot;')
}

function escapeXml(value) {
  return escapeAttribute(value).replaceAll("'", '&apos;')
}
