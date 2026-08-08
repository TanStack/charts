import { createHash } from 'node:crypto'
import path from 'node:path'
import { loadCatalogSourceClosure } from '../benchmarks/conformance/catalog-loader.ts'
import { catalogSourceClosureMetadata } from './catalog-source-files.mjs'

export const catalogArtifactSchemaVersion = 5
export const catalogModuleContractVersion = 1
export const catalogSourceRepository = 'tanstack/charts'
export const catalogSourcePathRoot = 'benchmarks/conformance/'
export const catalogBasePath = '/charts/catalog/'
export const catalogOrigin = 'https://tanstack.com'
export const catalogArtifactFileLimit = 1_000
export const catalogArtifactFileSizeLimit = 1024 * 1024
export const catalogArtifactManifestSizeLimit = 1280 * 1024
export const catalogModuleTotalSizeLimit = 6 * 1024 * 1024
export const catalogPreviewFileSizeLimit = 256 * 1024
export const catalogPreviewTotalSizeLimit = 2 * 1024 * 1024
export const catalogArtifactTotalSizeLimit = 8 * 1024 * 1024
export const catalogPreviewWidth = 288
export const catalogPreviewHeight = 192
export const catalogPreviewMediaType = 'image/svg+xml'
export const catalogBuildGraphPath = '.vite/catalog-graph.json'
export const catalogBuildGraphSchemaVersion = 1
export const expectedCatalogImplementationCounts = Object.freeze({
  tanstack: 110,
  'observable-plot': 76,
  recharts: 23,
  echarts: 11,
})

const revisionPattern = /^[a-f0-9]{40}$/
const caseIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const assetPathPattern =
  /^assets\/[A-Za-z0-9][A-Za-z0-9._-]*-[A-Za-z0-9_-]{5,}\.js$/
const previewPathPattern =
  /^previews\/([a-z0-9]+(?:-[a-z0-9]+)*)-([a-f0-9]{64})\.svg$/

export async function createCatalogArtifact({
  cases,
  revision,
  viteManifest,
  readAsset,
  sourceModules,
  previewContents,
}) {
  assertRevision(revision)
  validateCaseEntries(cases)

  const manifestEntries = new Map(Object.entries(viteManifest))
  const rootKeys = new Set()
  const publishedCases = []
  const publishedDatasets = new Map()
  const previewAssetContents = new Map()

  for (const { metadata } of [...cases].sort(
    (left, right) => left.metadata.order - right.metadata.order,
  )) {
    const referenceRenderer = metadata.referenceRenderer ?? 'observable-plot'
    const referenceFile = rendererFileName(referenceRenderer)
    const tanstackSource = caseSourcePath(metadata.id, 'tanstack')
    const referenceSource = caseSourcePath(metadata.id, referenceFile)
    const tanstackEntryPath = `./cases/${metadata.id}/tanstack.ts`
    const referenceEntryPath = `./cases/${metadata.id}/${referenceFile}.ts`
    const tanstackKey = findManifestKey(manifestEntries, tanstackSource)
    const referenceKey = findManifestKey(manifestEntries, referenceSource)
    rootKeys.add(tanstackKey)
    rootKeys.add(referenceKey)

    const tanstackEntry = requiredManifestEntry(manifestEntries, tanstackKey)
    const referenceEntry = requiredManifestEntry(manifestEntries, referenceKey)
    const tanstackClosure = await loadCatalogSourceClosure(
      sourceModules,
      tanstackEntryPath,
    )
    const referenceClosure = await loadCatalogSourceClosure(
      sourceModules,
      referenceEntryPath,
    )
    for (const dataset of [
      ...tanstackClosure.datasets,
      ...referenceClosure.datasets,
    ]) {
      publishedDatasets.set(dataset.id, dataset)
    }
    const authoredSource = {
      tanstack: catalogSourceClosureMetadata(
        tanstackClosure,
        tanstackEntryPath,
      ),
      reference: catalogSourceClosureMetadata(
        referenceClosure,
        referenceEntryPath,
      ),
    }
    const previewContent = previewContents.get(metadata.id)
    assert(
      ArrayBuffer.isView(previewContent) &&
        previewContent.BYTES_PER_ELEMENT === 1,
      `catalog preview generator did not return bytes for ${metadata.id}`,
    )
    const previewSha256 = createHash('sha256')
      .update(previewContent)
      .digest('hex')
    const previewPath = `previews/${metadata.id}-${previewSha256}.svg`
    assert(
      !previewAssetContents.has(previewPath),
      `multiple catalog cases emit ${previewPath}`,
    )
    previewAssetContents.set(previewPath, previewContent)

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
      authoredSource,
      preview: {
        path: previewPath,
        mediaType: catalogPreviewMediaType,
        width: catalogPreviewWidth,
        height: catalogPreviewHeight,
        bytes: previewContent.byteLength,
        sha256: previewSha256,
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

  assert(
    previewContents.size === publishedCases.length,
    'catalog preview output contains cases outside the catalog',
  )

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
      pathRoot: catalogSourcePathRoot,
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
    datasets: Object.fromEntries(
      [...publishedDatasets]
        .sort(([left], [right]) => compareStrings(left, right))
        .map(([id, metadata]) => [id, metadata]),
    ),
    assets: Object.fromEntries(assetRecords),
    cases: publishedCases,
  }

  return {
    assetContents: new Map([...assetContents, ...previewAssetContents]),
    catalog,
  }
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
      catalog.source.ref === catalog.revision &&
      catalog.source.pathRoot === catalogSourcePathRoot,
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
  assert(isRecord(catalog.datasets), 'catalog.json datasets must be an object')
  validateCatalogDatasets(
    Object.values(catalog.datasets),
    'catalog.json datasets',
  )
  for (const [id, dataset] of Object.entries(catalog.datasets)) {
    assert(dataset.id === id, `catalog dataset key ${id} does not match its id`)
  }
  assert(isRecord(catalog.assets), 'catalog.json assets must be an object')
  assert(Array.isArray(catalog.cases), 'catalog.json cases must be an array')
  assert(catalog.cases.length > 0, 'catalog.json must contain cases')

  const assetEntries = Object.entries(catalog.assets)
  assert(
    assetEntries.length + catalog.cases.length + 1 <= catalogArtifactFileLimit,
    `catalog has ${assetEntries.length + catalog.cases.length + 1} files; limit is ${catalogArtifactFileLimit}`,
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
    totalAssetBytes <= catalogModuleTotalSizeLimit,
    `catalog modules total ${totalAssetBytes} bytes; limit is ${catalogModuleTotalSizeLimit}`,
  )

  const ids = new Set()
  const orders = new Set()
  const roots = new Set()
  const previewPaths = new Set()
  let totalPreviewBytes = 0
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
    assert(
      isRecord(entry.authoredSource),
      `catalog case ${entry.id} has invalid authored source`,
    )
    validatePreviewReference(entry.preview, entry.id)
    assert(
      !previewPaths.has(entry.preview.path),
      `duplicate catalog preview path ${entry.preview.path}`,
    )
    previewPaths.add(entry.preview.path)
    totalPreviewBytes += entry.preview.bytes
    validateCatalogSourceClosure(
      entry.authoredSource.tanstack,
      `catalog case ${entry.id} TanStack authored source`,
      entry.code.tanstack.slice(catalogSourcePathRoot.length),
      catalog.datasets,
    )
    validateCatalogSourceClosure(
      entry.authoredSource.reference,
      `catalog case ${entry.id} reference authored source`,
      entry.code.reference.slice(catalogSourcePathRoot.length),
      catalog.datasets,
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
  assert(
    totalPreviewBytes <= catalogPreviewTotalSizeLimit,
    `catalog previews total ${totalPreviewBytes} bytes; limit is ${catalogPreviewTotalSizeLimit}`,
  )
  assert(
    totalAssetBytes + totalPreviewBytes <= catalogArtifactTotalSizeLimit,
    `catalog artifact totals ${totalAssetBytes + totalPreviewBytes} bytes; limit is ${catalogArtifactTotalSizeLimit}`,
  )

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
    previewBytes: totalPreviewBytes,
    previewCount: previewPaths.size,
    totalBytes: totalAssetBytes + totalPreviewBytes,
    fileCount: assetEntries.length + previewPaths.size + 1,
    caseCount: catalog.cases.length,
    referenceCounts,
  }
}

function validatePreviewReference(preview, caseId) {
  assert(isRecord(preview), `catalog case ${caseId} has invalid preview`)
  assertExactKeys(
    preview,
    ['path', 'mediaType', 'width', 'height', 'bytes', 'sha256'],
    `catalog case ${caseId} preview`,
  )
  const match =
    typeof preview.path === 'string'
      ? preview.path.match(previewPathPattern)
      : null
  assert(
    match?.[1] === caseId && match[2] === preview.sha256,
    `catalog case ${caseId} has invalid preview path`,
  )
  assert(
    preview.mediaType === catalogPreviewMediaType &&
      preview.width === catalogPreviewWidth &&
      preview.height === catalogPreviewHeight,
    `catalog case ${caseId} has invalid preview contract`,
  )
  assert(
    Number.isSafeInteger(preview.bytes) &&
      preview.bytes > 0 &&
      preview.bytes <= catalogPreviewFileSizeLimit,
    `catalog case ${caseId} has invalid preview bytes`,
  )
  assert(
    typeof preview.sha256 === 'string' && /^[a-f0-9]{64}$/.test(preview.sha256),
    `catalog case ${caseId} has invalid preview sha256`,
  )
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

function validateCatalogSourceClosure(closure, label, entryPath, datasets) {
  assert(isRecord(closure), `${label} must be an object`)
  assertExactKeys(
    closure,
    ['totalFiles', 'totalLines', 'totalBytes', 'datasetIds', 'roles'],
    label,
  )
  assert(
    Array.isArray(closure.datasetIds) &&
      closure.datasetIds.every(
        (id) => typeof id === 'string' && isRecord(datasets[id]),
      ) &&
      JSON.stringify(closure.datasetIds) ===
        JSON.stringify([...new Set(closure.datasetIds)].sort(compareStrings)),
    `${label} dataset ids are invalid`,
  )
  assert(isRecord(closure.roles), `${label} roles must be an object`)
  validateSourceMetrics(closure, label, [
    'totalFiles',
    'totalLines',
    'totalBytes',
  ])

  const expectedRoles = ['entry', 'support', 'fixture', 'harness']
  assert(
    JSON.stringify(Object.keys(closure.roles).sort(compareStrings)) ===
      JSON.stringify([...expectedRoles].sort(compareStrings)),
    `${label} roles are invalid`,
  )
  const paths = new Set()
  for (const role of expectedRoles) {
    validateSourceRole(
      closure.roles[role],
      role,
      `${label} ${role} role`,
      paths,
    )
  }

  assert(
    closure.roles.entry.files === 1 &&
      closure.roles.entry.paths[0] === entryPath,
    `${label} must contain one entry file`,
  )

  const visibleTotals = ['entry', 'support', 'fixture'].reduce(
    (totals, role) => ({
      files: totals.files + closure.roles[role].files,
      lines: totals.lines + closure.roles[role].lines,
      bytes: totals.bytes + closure.roles[role].bytes,
    }),
    { files: 0, lines: 0, bytes: 0 },
  )
  assert(
    visibleTotals.files === closure.totalFiles &&
      visibleTotals.lines === closure.totalLines &&
      visibleTotals.bytes === closure.totalBytes,
    `${label} totals include excluded or missing files`,
  )
}

function validateCatalogDatasets(datasets, label) {
  assert(Array.isArray(datasets), `${label} must be an array`)
  const ids = new Set()
  for (const dataset of datasets) {
    assert(isRecord(dataset), `${label} contains an invalid dataset`)
    assertExactKeys(
      dataset,
      [
        'id',
        'title',
        'specifier',
        'format',
        'records',
        'fields',
        'schema',
        'bytes',
        'sha256',
        'selection',
        'source',
        'sourceUrl',
        'observablePackage',
        'observableRevision',
        'observableFile',
        'observableUrl',
        'license',
      ],
      `${label} ${String(dataset.id)}`,
    )
    assert(
      typeof dataset.id === 'string' &&
        !ids.has(dataset.id) &&
        typeof dataset.title === 'string' &&
        dataset.specifier === `@charts-poc/demo-data/${dataset.id}` &&
        (dataset.format === 'CSV' || dataset.format === 'JSON') &&
        Number.isSafeInteger(dataset.records) &&
        dataset.records >= 0 &&
        Number.isSafeInteger(dataset.bytes) &&
        dataset.bytes >= 0 &&
        /^[a-f0-9]{64}$/u.test(dataset.sha256) &&
        Array.isArray(dataset.fields) &&
        dataset.fields.every((field) => typeof field === 'string') &&
        Array.isArray(dataset.schema) &&
        dataset.schema.every(
          (field) =>
            isRecord(field) &&
            typeof field.name === 'string' &&
            Array.isArray(field.types) &&
            field.types.every((type) => typeof type === 'string'),
        ) &&
        [
          'selection',
          'source',
          'sourceUrl',
          'observablePackage',
          'observableRevision',
          'observableFile',
          'observableUrl',
          'license',
        ].every((field) => typeof dataset[field] === 'string'),
      `${label} contains invalid metadata`,
    )
    ids.add(dataset.id)
  }
}

function validateSourceRole(role, roleName, label, seenPaths) {
  assert(isRecord(role), `${label} must be an object`)
  assertExactKeys(role, ['files', 'lines', 'bytes', 'paths'], label)
  validateSourceMetrics(role, label, ['files', 'lines', 'bytes'])
  assert(
    Array.isArray(role.paths) &&
      role.paths.every((sourcePath) => typeof sourcePath === 'string'),
    `${label} paths are invalid`,
  )
  assert(
    role.files === role.paths.length,
    `${label} file count does not match paths`,
  )
  assert(
    role.files > 0 || (role.lines === 0 && role.bytes === 0),
    `${label} has metrics without files`,
  )
  assert(
    JSON.stringify(role.paths) ===
      JSON.stringify([...role.paths].sort(compareStrings)),
    `${label} paths must be sorted`,
  )
  for (const sourcePath of role.paths) {
    assertCatalogSourcePath(sourcePath, label)
    assert(
      !seenPaths.has(sourcePath),
      `${label} has duplicate path ${sourcePath}`,
    )
    seenPaths.add(sourcePath)
    if (roleName === 'harness') {
      assert(
        isCatalogHarnessSourcePath(sourcePath),
        `${label} has invalid harness path`,
      )
    } else {
      assert(
        !isCatalogHarnessSourcePath(sourcePath),
        `${label} assigns a harness path to ${roleName}`,
      )
    }
  }
}

function validateSourceMetrics(metrics, label, fields) {
  assert(
    fields.every(
      (field) => Number.isSafeInteger(metrics[field]) && metrics[field] >= 0,
    ),
    `${label} is invalid`,
  )
}

function assertCatalogSourcePath(sourcePath, label) {
  assert(
    isSafeRepositoryPath(sourcePath) &&
      (sourcePath.startsWith('cases/') || sourcePath.startsWith('shared/')) &&
      /\.tsx?$/.test(sourcePath) &&
      !/\.test\.tsx?$/.test(sourcePath) &&
      !sourcePath.includes('\\') &&
      !sourcePath.includes('?') &&
      !sourcePath.includes('#'),
    `${label} has invalid source path`,
  )
}

function isCatalogHarnessSourcePath(sourcePath) {
  return /^shared\/(?:mount|react-mount|recharts-mount|echarts-mount)\.tsx?$/.test(
    sourcePath,
  )
}

function assertExactKeys(value, expectedKeys, label) {
  assert(
    JSON.stringify(Object.keys(value).sort(compareStrings)) ===
      JSON.stringify([...expectedKeys].sort(compareStrings)),
    `${label} fields are invalid`,
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

export function validateCaseEntries(entries) {
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
