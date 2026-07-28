import { resolve } from 'node:path'
import { assertDocsContract } from './docs-contract.mjs'
import { assertPackageDocsSynced } from './sync-package-docs.mjs'

const repositoryRoot = resolve(import.meta.dirname, '..')
const result = await assertDocsContract(repositoryRoot)
await assertPackageDocsSynced(repositoryRoot)

console.log(
  `Documentation contract passed for ${result.markdownFiles.length} pages, ${result.embeddedCases.length} catalog embeds, and ${result.standaloneExamples.length} executable examples.`,
)
