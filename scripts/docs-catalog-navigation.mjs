import assert from 'node:assert/strict'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(import.meta.dirname, '..')
const catalogSectionLabel = 'Individual Charts'
const catalogPageBase = '/charts/catalog/charts/'

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const changed = await syncDocsCatalogNavigation(repositoryRoot)
  console.log(
    changed
      ? 'Synchronized catalog examples into the docs navigation.'
      : 'Catalog example navigation is already synchronized.',
  )
}

export async function createDocsCatalogNavigation(root) {
  const casesRoot = resolve(root, 'benchmarks/conformance/cases')
  const directories = (await readdir(casesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  const cases = await Promise.all(
    directories.map(async (directory) => {
      const metadataPath = resolve(casesRoot, directory, 'case.json')
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
      assert.equal(metadata.id, directory, `catalog id must match ${directory}`)
      assert.equal(
        typeof metadata.title,
        'string',
        `${directory} needs a title`,
      )
      assert.equal(
        typeof metadata.order,
        'number',
        `${directory} needs an order`,
      )
      return metadata
    }),
  )

  assert.equal(
    new Set(cases.map(({ id }) => id)).size,
    cases.length,
    'catalog ids must be unique',
  )
  assert.equal(
    new Set(cases.map(({ order }) => order)).size,
    cases.length,
    'catalog orders must be unique',
  )

  return cases
    .sort((left, right) => left.order - right.order)
    .map(({ id, title }) => ({
      label: title,
      to: `${catalogPageBase}${encodeURIComponent(id)}/`,
    }))
}

export async function syncDocsCatalogNavigation(root) {
  const configPath = resolve(root, 'docs/config.json')
  const source = await readFile(configPath, 'utf8')
  const config = JSON.parse(source)
  const section = catalogSection(config)
  section.children = await createDocsCatalogNavigation(root)
  const nextSource = `${JSON.stringify(config, null, 2)}\n`

  if (source === nextSource) return false
  await writeFile(configPath, nextSource)
  return true
}

export async function assertDocsCatalogNavigationSynced(root) {
  const config = JSON.parse(
    await readFile(resolve(root, 'docs/config.json'), 'utf8'),
  )
  assert.deepEqual(
    catalogSection(config).children,
    await createDocsCatalogNavigation(root),
    'docs catalog navigation is stale; run `pnpm docs:sync`',
  )
}

function catalogSection(config) {
  const section = config.sections?.find(
    ({ label }) => label === catalogSectionLabel,
  )
  assert(section, `docs/config.json needs a ${catalogSectionLabel} section`)
  return section
}
