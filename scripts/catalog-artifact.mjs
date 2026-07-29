import { createHash } from 'node:crypto'
import path from 'node:path'

export const catalogArtifactSchemaVersion = 2
export const catalogModuleContractVersion = 1
export const catalogSourceRepository = 'tanstack/charts'
export const catalogBasePath = '/charts/catalog/'
export const catalogOrigin = 'https://tanstack.com'
export const catalogArtifactFileLimit = 1_000
export const catalogArtifactFileSizeLimit = 1024 * 1024
export const catalogArtifactTotalSizeLimit = 5 * 1024 * 1024

const revisionPattern = /^[a-f0-9]{40}$/
const caseIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const assetPathPattern =
  /^assets\/[A-Za-z0-9][A-Za-z0-9._-]*-[A-Za-z0-9_-]{5,}\.js$/

export async function createCatalogArtifact({
  cases,
  revision,
  viteManifest,
  readAsset,
}) {
  assertRevision(revision)
  validateCaseEntries(cases)

  const manifestEntries = new Map(Object.entries(viteManifest))
  const rootKeys = new Set()
  const publishedCases = []

  for (const { metadata } of [...cases].sort(
    (left, right) => left.metadata.order - right.metadata.order,
  )) {
    const referenceRenderer = metadata.referenceRenderer ?? 'observable-plot'
    const referenceFile = rendererFileName(referenceRenderer)
    const tanstackSource = caseSourcePath(metadata.id, 'tanstack')
    const referenceSource = caseSourcePath(metadata.id, referenceFile)
    const tanstackKey = findManifestKey(manifestEntries, tanstackSource)
    const referenceKey = findManifestKey(manifestEntries, referenceSource)
    rootKeys.add(tanstackKey)
    rootKeys.add(referenceKey)

    const tanstackEntry = requiredManifestEntry(manifestEntries, tanstackKey)
    const referenceEntry = requiredManifestEntry(manifestEntries, referenceKey)

    publishedCases.push({
      ...metadata,
      routes: {
        page: `${catalogBasePath}charts/${encodeURIComponent(metadata.id)}/`,
        embed: `${catalogBasePath}embed/${encodeURIComponent(metadata.id)}/`,
      },
      code: {
        tanstack: tanstackSource,
        reference: referenceSource,
      },
      modules: {
        tanstack: {
          path: normalizeAssetPath(tanstackEntry.file),
          preload: staticClosure(tanstackKey, manifestEntries, false).map(
            (key) =>
              normalizeAssetPath(
                requiredManifestEntry(manifestEntries, key).file,
              ),
          ),
        },
        comparison: {
          renderer: referenceRenderer,
          path: normalizeAssetPath(referenceEntry.file),
          preload: staticClosure(referenceKey, manifestEntries, false).map(
            (key) =>
              normalizeAssetPath(
                requiredManifestEntry(manifestEntries, key).file,
              ),
          ),
          visibility: 'debug',
        },
      },
    })
  }

  const assetKeys = new Set()
  for (const rootKey of rootKeys) {
    for (const key of completeClosure(rootKey, manifestEntries)) {
      assetKeys.add(key)
    }
  }

  const assetContents = new Map()
  const assetRecords = []

  for (const key of [...assetKeys].sort((left, right) => {
    const leftFile = requiredManifestEntry(manifestEntries, left).file
    const rightFile = requiredManifestEntry(manifestEntries, right).file
    return compareStrings(leftFile, rightFile)
  })) {
    const entry = requiredManifestEntry(manifestEntries, key)
    const assetPath = normalizeAssetPath(entry.file)
    assert(
      !assetContents.has(assetPath),
      `multiple Vite entries emit ${assetPath}`,
    )
    assert(
      !entry.css?.length,
      `catalog implementation asset ${assetPath} unexpectedly requires CSS`,
    )
    assert(
      !entry.assets?.length,
      `catalog implementation asset ${assetPath} unexpectedly requires a non-module asset`,
    )

    const content = await readAsset(assetPath)
    assert(
      ArrayBuffer.isView(content) && content.BYTES_PER_ELEMENT === 1,
      `catalog asset reader did not return bytes for ${assetPath}`,
    )
    assetContents.set(assetPath, content)
    assetRecords.push([
      assetPath,
      {
        bytes: content.byteLength,
        sha256: createHash('sha256').update(content).digest('hex'),
        imports: manifestImportPaths(entry.imports, manifestEntries),
        dynamicImports: manifestImportPaths(
          entry.dynamicImports,
          manifestEntries,
        ),
      },
    ])
  }

  const catalog = {
    schemaVersion: catalogArtifactSchemaVersion,
    revision,
    source: {
      repo: catalogSourceRepository,
      ref: revision,
    },
    runtime: {
      contractVersion: catalogModuleContractVersion,
      export: 'mount',
    },
    site: {
      origin: catalogOrigin,
      basePath: catalogBasePath,
      assetBasePath: `${catalogBasePath}assets/`,
    },
    embed: undefined,
    assets: Object.fromEntries(assetRecords),
    cases: publishedCases,
  }

  return { assetContents, catalog }
}

export function attachEmbedContract(catalog, embed) {
  return {
    ...catalog,
    embed,
  }
}

export function validateCatalogArtifactManifest(catalog) {
  assert(isRecord(catalog), 'catalog.json must contain an object')
  assert(
    catalog.schemaVersion === catalogArtifactSchemaVersion,
    `catalog.json schemaVersion must be ${catalogArtifactSchemaVersion}`,
  )
  assertRevision(catalog.revision)
  assert(
    isRecord(catalog.source) &&
      catalog.source.repo === catalogSourceRepository &&
      catalog.source.ref === catalog.revision,
    'catalog.json source must identify the exact Charts revision',
  )
  assert(
    isRecord(catalog.runtime) &&
      catalog.runtime.contractVersion === catalogModuleContractVersion &&
      catalog.runtime.export === 'mount',
    'catalog.json runtime contract is invalid',
  )
  assert(
    isRecord(catalog.site) &&
      catalog.site.origin === catalogOrigin &&
      catalog.site.basePath === catalogBasePath &&
      catalog.site.assetBasePath === `${catalogBasePath}assets/`,
    'catalog.json site contract is invalid',
  )
  assert(isRecord(catalog.embed), 'catalog.json embed contract is missing')
  assert(isRecord(catalog.assets), 'catalog.json assets must be an object')
  assert(Array.isArray(catalog.cases), 'catalog.json cases must be an array')
  assert(catalog.cases.length > 0, 'catalog.json must contain cases')

  const assetEntries = Object.entries(catalog.assets)
  assert(
    assetEntries.length <= catalogArtifactFileLimit,
    `catalog has ${assetEntries.length} assets; limit is ${catalogArtifactFileLimit}`,
  )

  let totalAssetBytes = 0
  for (const [assetPath, value] of assetEntries) {
    assertAssetPath(assetPath)
    assert(isRecord(value), `catalog asset ${assetPath} must be an object`)
    assert(
      Number.isSafeInteger(value.bytes) &&
        value.bytes >= 0 &&
        value.bytes <= catalogArtifactFileSizeLimit,
      `catalog asset ${assetPath} has invalid bytes`,
    )
    totalAssetBytes += value.bytes
    assert(
      typeof value.sha256 === 'string' && /^[a-f0-9]{64}$/.test(value.sha256),
      `catalog asset ${assetPath} has invalid sha256`,
    )
    for (const field of ['imports', 'dynamicImports']) {
      assert(
        Array.isArray(value[field]) &&
          value[field].every((entry) => typeof entry === 'string'),
        `catalog asset ${assetPath} has invalid ${field}`,
      )
      for (const importedPath of value[field]) {
        assertAssetPath(importedPath)
        assert(
          importedPath in catalog.assets,
          `catalog asset ${assetPath} imports missing ${importedPath}`,
        )
      }
    }
  }
  assert(
    totalAssetBytes <= catalogArtifactTotalSizeLimit,
    `catalog assets total ${totalAssetBytes} bytes; limit is ${catalogArtifactTotalSizeLimit}`,
  )

  const ids = new Set()
  const orders = new Set()
  const roots = new Set()
  const referenceCounts = {
    'observable-plot': 0,
    recharts: 0,
    echarts: 0,
  }

  for (const entry of catalog.cases) {
    assert(isRecord(entry), 'every catalog case must be an object')
    assert(
      typeof entry.id === 'string' && caseIdPattern.test(entry.id),
      'every catalog case must have a URL-safe id',
    )
    assert(!ids.has(entry.id), `duplicate catalog case id ${entry.id}`)
    ids.add(entry.id)
    assert(
      Number.isSafeInteger(entry.order),
      `catalog case ${entry.id} has invalid order`,
    )
    assert(
      !orders.has(entry.order),
      `duplicate catalog case order ${entry.order}`,
    )
    orders.add(entry.order)
    assert(
      isRecord(entry.routes) &&
        entry.routes.page ===
          `${catalogBasePath}charts/${encodeURIComponent(entry.id)}/` &&
        entry.routes.embed ===
          `${catalogBasePath}embed/${encodeURIComponent(entry.id)}/`,
      `catalog case ${entry.id} has invalid routes`,
    )
    assert(
      isRecord(entry.code) &&
        entry.code.tanstack === caseSourcePath(entry.id, 'tanstack') &&
        typeof entry.code.reference === 'string' &&
        isSafeRepositoryPath(entry.code.reference),
      `catalog case ${entry.id} has invalid source paths`,
    )
    assert(
      isRecord(entry.modules) &&
        isRecord(entry.modules.tanstack) &&
        isRecord(entry.modules.comparison),
      `catalog case ${entry.id} has invalid modules`,
    )
    validateModuleReference(
      entry.modules.tanstack,
      catalog.assets,
      `catalog case ${entry.id} TanStack module`,
    )
    const comparison = entry.modules.comparison
    validateModuleReference(
      comparison,
      catalog.assets,
      `catalog case ${entry.id} comparison module`,
    )
    assert(
      comparison.visibility === 'debug',
      `catalog case ${entry.id} comparison must be debug-only`,
    )
    assert(
      comparison.renderer === 'observable-plot' ||
        comparison.renderer === 'recharts' ||
        comparison.renderer === 'echarts',
      `catalog case ${entry.id} has invalid comparison renderer`,
    )
    assert(
      entry.code.reference ===
        caseSourcePath(entry.id, rendererFileName(comparison.renderer)),
      `catalog case ${entry.id} comparison source does not match its renderer`,
    )
    referenceCounts[comparison.renderer] += 1
    roots.add(entry.modules.tanstack.path)
    roots.add(comparison.path)
  }

  const reachableAssets = new Set()
  const visit = (assetPath) => {
    if (reachableAssets.has(assetPath)) return
    reachableAssets.add(assetPath)
    const asset = catalog.assets[assetPath]
    for (const dependency of [...asset.imports, ...asset.dynamicImports]) {
      visit(dependency)
    }
  }
  for (const root of roots) visit(root)
  assert(
    reachableAssets.size === assetEntries.length,
    'catalog artifact contains assets outside the implementation closure',
  )

  return {
    assetBytes: totalAssetBytes,
    assetCount: assetEntries.length,
    caseCount: catalog.cases.length,
    referenceCounts,
  }
}

export function serializeCatalogManifest(catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`
}

function validateModuleReference(module, assets, label) {
  assertAssetPath(module.path)
  assert(module.path in assets, `${label} is not in the asset allowlist`)
  assert(
    Array.isArray(module.preload) &&
      module.preload.every((entry) => typeof entry === 'string'),
    `${label} has invalid preload entries`,
  )
  for (const preload of module.preload) {
    assertAssetPath(preload)
    assert(preload in assets, `${label} preloads missing ${preload}`)
  }

  const expected = staticAssetClosure(module.path, assets)
  assert(
    JSON.stringify(module.preload) === JSON.stringify(expected),
    `${label} preload closure is invalid`,
  )
}

function staticAssetClosure(root, assets) {
  const visited = new Set([root])
  const visit = (assetPath) => {
    for (const importedPath of assets[assetPath].imports) {
      if (visited.has(importedPath)) continue
      visited.add(importedPath)
      visit(importedPath)
    }
  }
  visit(root)
  visited.delete(root)
  return [...visited].sort(compareStrings)
}

function validateCaseEntries(entries) {
  const ids = new Set()
  const orders = new Set()

  for (const { directory, metadata } of entries) {
    assert(
      metadata.id === directory,
      `catalog id "${metadata.id}" must match directory "${directory}"`,
    )
    assert(
      caseIdPattern.test(metadata.id),
      `catalog id "${metadata.id}" must use lowercase URL-safe words separated by hyphens`,
    )
    assert(!ids.has(metadata.id), `duplicate catalog id "${metadata.id}"`)
    assert(
      !orders.has(metadata.order),
      `duplicate catalog order ${metadata.order}`,
    )
    ids.add(metadata.id)
    orders.add(metadata.order)
  }
}

function completeClosure(root, entries) {
  const visited = new Set()
  const visit = (key) => {
    if (visited.has(key)) return
    visited.add(key)
    const entry = requiredManifestEntry(entries, key)
    for (const dependency of [
      ...(entry.imports ?? []),
      ...(entry.dynamicImports ?? []),
    ]) {
      visit(dependency)
    }
  }
  visit(root)
  return [...visited]
}

function staticClosure(root, entries, includeRoot = true) {
  const visited = new Set()
  const visit = (key) => {
    if (visited.has(key)) return
    visited.add(key)
    const entry = requiredManifestEntry(entries, key)
    for (const dependency of entry.imports ?? []) visit(dependency)
  }
  visit(root)
  if (!includeRoot) visited.delete(root)
  return [...visited].sort((left, right) => {
    const leftFile = requiredManifestEntry(entries, left).file
    const rightFile = requiredManifestEntry(entries, right).file
    return compareStrings(leftFile, rightFile)
  })
}

function manifestImportPaths(keys, entries) {
  return [...(keys ?? [])]
    .map((key) => normalizeAssetPath(requiredManifestEntry(entries, key).file))
    .sort(compareStrings)
}

function findManifestKey(entries, sourcePath) {
  const matches = [...entries].filter(([, entry]) => {
    const source = normalizeRepositoryPath(entry.src ?? '')
    return source.endsWith(`/${sourcePath}`) || source === sourcePath
  })
  assert(
    matches.length === 1,
    `expected one Vite entry for ${sourcePath}, received ${matches.length}`,
  )
  const [key, entry] = matches[0]
  assert(
    entry.isDynamicEntry === true,
    `Vite entry for ${sourcePath} must be dynamic`,
  )
  return key
}

function requiredManifestEntry(entries, key) {
  const entry = entries.get(key)
  assert(entry, `Vite manifest is missing ${key}`)
  assert(isRecord(entry), `Vite manifest entry ${key} is invalid`)
  assert(
    typeof entry.file === 'string',
    `Vite manifest entry ${key} has no file`,
  )
  return entry
}

function rendererFileName(renderer) {
  return renderer === 'observable-plot' ? 'plot' : renderer
}

function caseSourcePath(id, rendererFile) {
  return `benchmarks/conformance/cases/${id}/${rendererFile}.ts`
}

function normalizeAssetPath(value) {
  const normalized = normalizeRepositoryPath(value)
  assertAssetPath(normalized)
  return normalized
}

function assertAssetPath(value) {
  assert(
    typeof value === 'string' &&
      assetPathPattern.test(value) &&
      isSafeRepositoryPath(value),
    `invalid catalog asset path ${String(value)}`,
  )
}

function normalizeRepositoryPath(value) {
  return value.replaceAll('\\', '/').replace(/^\.?\//, '')
}

function isSafeRepositoryPath(value) {
  if (typeof value !== 'string' || value.length === 0) return false
  const normalized = path.posix.normalize(value)
  return (
    normalized === value &&
    !normalized.startsWith('/') &&
    normalized !== '..' &&
    !normalized.startsWith('../') &&
    !normalized.includes('/../')
  )
}

function assertRevision(value) {
  assert(
    typeof value === 'string' && revisionPattern.test(value),
    'catalog revision must be a lowercase 40-character Git SHA',
  )
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
