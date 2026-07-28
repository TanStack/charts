import assert from 'node:assert/strict'
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { flattenConfigPaths, parseFrontmatter } from './docs-contract.mjs'

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
  const source = resolve(root, 'docs')
  const destination = resolve(root, 'packages/charts-core/docs')
  await rm(destination, { recursive: true, force: true })
  await cp(source, destination, { recursive: true })
  const llms = await createLlmsIndex(root)
  await writeFile(resolve(root, 'llms.txt'), llms)
  await writeFile(resolve(root, 'packages/charts-core/llms.txt'), llms)
}

export async function assertPackageDocsSynced(root) {
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
    'TanStack Charts is a framework-agnostic, type-safe visualization grammar with thin React and Octane adapters.',
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
    '- Use direct, granular d3-* imports for scales and analytical preparation; never import the d3 umbrella.',
    '- Let TanStack Charts own responsive pixel ranges while configured D3 scales own domains, ticks, and formatting.',
    '- Keep data in its application shape. Map fields or accessors into marks instead of creating a library-owned series model.',
    '- Keep definitions stable and pass changing state through typed dynamic input.',
    '- Use stable datum keys for updates, animation, and selection.',
    '- Prefer built-in marks, then composition, then a custom mark or application-owned overlay.',
    '- Treat docs/concepts/scales-and-d3.md as the sole D3 integration contract and follow its official D3 links for D3 API details.',
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
