import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const shadcnFamilyCounts = {
  area: 10,
  bar: 10,
  line: 10,
  pie: 11,
  radar: 14,
  radial: 6,
  tooltip: 9,
}

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const catalogPath = path.join(
  rootDirectory,
  'benchmarks',
  'conformance',
  'shadcn',
  'catalog.json',
)
const casesDirectory = path.join(
  rootDirectory,
  'benchmarks',
  'conformance',
  'cases',
)
const referenceDirectory = path.join(
  rootDirectory,
  'benchmarks',
  'conformance',
  'shadcn',
  'reference',
)
const gitShaPattern = /^[a-f0-9]{40}$/u

export function validateShadcnCatalog(catalog) {
  assert(isRecord(catalog), 'shadcn catalog must be an object')
  assert(catalog.schemaVersion === 1, 'shadcn catalog schemaVersion must be 1')
  assert(
    isRecord(catalog.upstream),
    'shadcn catalog upstream must be an object',
  )
  assert(
    catalog.upstream.repository === 'shadcn-ui/ui',
    'unexpected shadcn repository',
  )
  assert(
    gitShaPattern.test(catalog.upstream.commit),
    'shadcn commit must be pinned',
  )
  assert(
    typeof catalog.upstream.pathRoot === 'string',
    'shadcn pathRoot is required',
  )
  assert(
    typeof catalog.upstream.registryPath === 'string',
    'shadcn registryPath is required',
  )
  assert(
    gitShaPattern.test(catalog.upstream.registryBlobSha),
    'registry blob SHA is invalid',
  )
  assert(Array.isArray(catalog.cases), 'shadcn cases must be an array')
  assert(
    catalog.cases.length === 70,
    'shadcn catalog must contain all 70 chart examples',
  )

  const names = new Set()
  const paths = new Set()
  const localCaseIds = new Set()
  const familyCounts = {}
  for (const entry of catalog.cases) {
    assert(isRecord(entry), 'shadcn case must be an object')
    assert(
      /^chart-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.name),
      'invalid shadcn case name',
    )
    assert(
      entry.family === entry.name.split('-')[1],
      `invalid family for ${entry.name}`,
    )
    assert(
      entry.path === `${catalog.upstream.pathRoot}/${entry.name}.tsx`,
      `invalid path for ${entry.name}`,
    )
    assert(
      gitShaPattern.test(entry.blobSha),
      `invalid blob SHA for ${entry.name}`,
    )
    assert(!names.has(entry.name), `duplicate shadcn name ${entry.name}`)
    assert(!paths.has(entry.path), `duplicate shadcn path ${entry.path}`)
    names.add(entry.name)
    paths.add(entry.path)
    familyCounts[entry.family] = (familyCounts[entry.family] ?? 0) + 1
    if (entry.localCaseId !== undefined) {
      assert(
        typeof entry.localCaseId === 'string',
        `invalid local case for ${entry.name}`,
      )
      assert(
        !localCaseIds.has(entry.localCaseId),
        `duplicate local case ${entry.localCaseId}`,
      )
      localCaseIds.add(entry.localCaseId)
    }
  }

  assert(
    JSON.stringify(familyCounts) === JSON.stringify(shadcnFamilyCounts),
    `unexpected shadcn family counts: ${JSON.stringify(familyCounts)}`,
  )
  return {
    caseCount: catalog.cases.length,
    implementedCount: localCaseIds.size,
  }
}

export function compareShadcnCatalog(catalog, remoteTree, remoteCommit) {
  validateShadcnCatalog(catalog)
  const expected = new Map([
    [catalog.upstream.registryPath, catalog.upstream.registryBlobSha],
    ...catalog.cases.map((entry) => [entry.path, entry.blobSha]),
  ])
  const actual = new Map(
    remoteTree
      .filter((entry) => entry.type === 'blob' && expected.has(entry.path))
      .map((entry) => [entry.path, entry.sha]),
  )
  const remoteCharts = remoteTree.filter(
    (entry) =>
      entry.type === 'blob' &&
      entry.path.startsWith(`${catalog.upstream.pathRoot}/chart-`) &&
      entry.path.endsWith('.tsx'),
  )
  const knownPaths = new Set(catalog.cases.map((entry) => entry.path))
  return {
    pinnedCommit: catalog.upstream.commit,
    remoteCommit,
    changed: [...expected]
      .filter(([entryPath, sha]) => actual.get(entryPath) !== sha)
      .map(([entryPath]) => entryPath),
    added: remoteCharts
      .map((entry) => entry.path)
      .filter((entryPath) => !knownPaths.has(entryPath)),
    removed: catalog.cases
      .map((entry) => entry.path)
      .filter(
        (entryPath) =>
          !remoteCharts.some((remote) => remote.path === entryPath),
      ),
  }
}

export async function checkShadcnCatalog({
  remote = false,
  fetchImpl = fetch,
} = {}) {
  const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'))
  const summary = validateShadcnCatalog(catalog)
  for (const entry of catalog.cases) {
    if (!entry.localCaseId) continue
    const metadataPath = path.join(
      casesDirectory,
      entry.localCaseId,
      'case.json',
    )
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'))
    assert(
      metadata.id === entry.localCaseId,
      `missing local shadcn case ${entry.localCaseId}`,
    )
    assert(
      metadata.source?.url.endsWith(`/${entry.name}`),
      `source URL mismatch for ${entry.localCaseId}`,
    )
    await fs.access(path.join(referenceDirectory, `${entry.name}.png`))
  }
  const referenceManifest = JSON.parse(
    await fs.readFile(path.join(referenceDirectory, 'manifest.json'), 'utf8'),
  )
  assert(
    JSON.stringify(referenceManifest.cases) ===
      JSON.stringify(catalog.cases.map((entry) => entry.name)),
    'shadcn reference manifest must cover the pinned catalog in order',
  )

  if (!remote) {
    console.log(
      `Validated pinned shadcn inventory: ${summary.implementedCount}/${summary.caseCount} implemented.`,
    )
    return summary
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (process.env.GITHUB_TOKEN)
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const response = await fetchImpl(
    `https://api.github.com/repos/${catalog.upstream.repository}/git/trees/main?recursive=1`,
    { headers },
  )
  if (!response.ok)
    throw new Error(`GitHub tree request failed: ${response.status}`)
  const payload = await response.json()
  assert(Array.isArray(payload.tree), 'GitHub tree response is invalid')
  const drift = compareShadcnCatalog(catalog, payload.tree, payload.sha)
  const driftCount =
    drift.changed.length + drift.added.length + drift.removed.length
  if (driftCount > 0) {
    console.log(JSON.stringify(drift, null, 2))
    throw new Error(`shadcn chart catalog drifted in ${driftCount} path(s)`)
  }
  console.log(`No shadcn chart drift at ${payload.sha}.`)
  return drift
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assert(condition, message) {
  if (!condition) throw new TypeError(message)
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await checkShadcnCatalog({ remote: process.argv.includes('--remote') })
}
