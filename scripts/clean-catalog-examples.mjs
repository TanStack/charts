import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { format } from 'prettier'
import { removeUnusedTypeScript } from './typescript-source.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const casesRoot = path.join(root, 'benchmarks', 'conformance', 'cases')
const directories = (await fs.readdir(casesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

let changed = 0
for (const directory of directories) {
  const examplePath = path.join(casesRoot, directory, 'example.tsx')
  const source = await fs.readFile(examplePath, 'utf8')
  const cleaned = await format(removeUnusedTypeScript(source, examplePath), {
    parser: 'typescript',
    semi: false,
    singleQuote: true,
  })
  if (cleaned === source) continue
  await fs.writeFile(examplePath, cleaned, 'utf8')
  changed += 1
}

console.log(`Cleaned ${changed} of ${directories.length} catalog examples.`)
