import assert from 'node:assert/strict'
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { flattenConfigPaths, parseFrontmatter } from './docs-contract.mjs'
import {
  assertDocsCatalogNavigationSynced,
  syncDocsCatalogNavigation,
} from './docs-catalog-navigation.mjs'

const repositoryRoot = resolve(import.meta.dirname, '..')
const canonicalDocs = resolve(repositoryRoot, 'docs')
const packageDocs = resolve(repositoryRoot, 'packages/charts-core/docs')
const rootLlms = resolve(repositoryRoot, 'llms.txt')
const packageLlms = resolve(repositoryRoot, 'packages/charts-core/llms.txt')

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await syncPackageDocs(repositoryRoot)
  console.log('Synchronized canonical docs into @tanstack/charts.')
}

export async function syncPackageDocs(root) {
  await syncDocsCatalogNavigation(root)
  const source = resolve(root, 'docs')
  const destination = resolve(root, 'packages/charts-core/docs')
  await rm(destination, { recursive: true, force: true })
  await cp(source, destination, { recursive: true })
  const llms = await createLlmsIndex(root)
  await writeFile(resolve(root, 'llms.txt'), llms)
  await writeFile(resolve(root, 'packages/charts-core/llms.txt'), llms)
}

export async function assertPackageDocsSynced(root) {
  await assertDocsCatalogNavigationSynced(root)
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'charts-docs-check-'))
  try {
    const expectedDocs = resolve(temporaryRoot, 'docs')
    await cp(resolve(root, 'docs'), expectedDocs, { recursive: true })
    await assertDirectoriesEqual(
      expectedDocs,
      resolve(root, 'packages/charts-core/docs'),
      'packages/charts-core/docs is stale; run pnpm docs:sync',
    )
    const expectedLlms = await createLlmsIndex(root)
    assert.equal(
      await readFile(resolve(root, 'llms.txt'), 'utf8'),
      expectedLlms,
      'llms.txt is stale; run pnpm docs:sync',
    )
    assert.equal(
      await readFile(resolve(root, 'packages/charts-core/llms.txt'), 'utf8'),
      expectedLlms,
      'packages/charts-core/llms.txt is stale; run pnpm docs:sync',
    )
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

export async function createLlmsIndex(root) {
  const docsRoot = resolve(root, 'docs')
  const config = JSON.parse(
    await readFile(resolve(docsRoot, 'config.json'), 'utf8'),
  )
  const lines = [
    '# TanStack Charts documentation',
    '',
    'TanStack Charts is a framework-agnostic, type-safe visualization grammar with thin framework adapters.',
    '',
    'Read the canonical pages below. Each concept is documented once; guides and examples link back to its owner page.',
    '',
  ]

  for (const path of flattenConfigPaths(config)) {
    const source = await readFile(resolve(docsRoot, `${path}.md`), 'utf8')
    const frontmatter = parseFrontmatter(source)
    lines.push(
      `- docs/${path}.md — ${frontmatter?.title ?? path}: ${frontmatter?.description ?? ''}`,
    )
  }

  lines.push(
    '',
    'Authoring rules:',
    '',
    '- Use TanStack data transforms for common group, bin, window, cumulative, rank, normalize, select, and row-stack preparation.',
    '- Start with exact @tanstack/charts/scales/linear, @tanstack/charts/scales/band, @tanstack/charts/scales/point, or @tanstack/charts/scales/ordinal entries. Upgrade only the mapping that needs temporal, nonlinear, radial, interpolated, statistical, or other complete D3 semantics; never import the d3 umbrella.',
    '- Treat Date values on compact band or point scales as equally spaced categories. Use d3-scale scaleTime or scaleUtc when elapsed-time spacing or calendar-aware ticks matter.',
    '- Let TanStack Charts own responsive pixel ranges. Scale factories infer domains from mark channels; configured instances preserve application-owned domains.',
    '- Put Cartesian scale and guide options under scales.x and scales.y; never generate deprecated root x or y properties.',
    '- Put polar position scales under scales.angle and scales.radius inside polar(); never generate deprecated direct angle or radius properties.',
    '- Keep data in its application shape. Map fields or accessors into marks instead of creating a library-owned series model.',
    '- Memoize the complete definition against captured application values; definition identity is the application update boundary.',
    '- Preserve inferable datum identity across updates; add explicit keys only when IDs or unique positions are unavailable.',
    '- Prefer built-in marks, then composition, then a custom mark or application-owned overlay.',
    "- Keep the default SVG renderer unless a measured paint-heavy mark benefits from Canvas. Import canvasChartRenderer from @tanstack/charts/canvas and set only that mark's renderer option when mixing surfaces.",
    '- Treat docs/concepts/scales-and-d3.md as the sole scale-selection and D3 integration contract and follow its official D3 links for D3 API details.',
    '- Reference a canonical catalog case with `<!-- ::chart-example id=case-id height=480 -->`. The documentation site resolves its source-backed workspace; never author a catalog iframe or duplicate the case source in a docs page.',
    '- Do not use casts, suppression comments, private imports, or adapter generics to force a chart through TypeScript.',
  )

  return `${lines.join('\n')}\n`
}

async function assertDirectoriesEqual(expected, actual, message) {
  const expectedFiles = await fileMap(expected)
  const actualFiles = await fileMap(actual)
  assert.deepEqual([...actualFiles.keys()], [...expectedFiles.keys()], message)
  for (const [path, source] of expectedFiles) {
    assert.equal(actualFiles.get(path), source, `${message}: ${path}`)
  }
}

async function fileMap(root) {
  const output = new Map()
  await visit(root, '')
  return output

  async function visit(directory, prefix) {
    const entries = await readdir(directory, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) await visit(path, relativePath)
      else if (entry.isFile())
        output.set(relativePath, await readFile(path, 'utf8'))
    }
  }
}
