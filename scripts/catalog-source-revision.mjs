import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'

const execFileAsync = promisify(execFile)

export async function catalogSourceRevision(
  rootDirectory = resolve(import.meta.dirname, '..'),
  environment = process.env,
) {
  const configured =
    environment.CATALOG_SOURCE_REVISION ?? environment.GITHUB_SHA
  if (configured) return configured.trim().toLowerCase()

  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
    cwd: rootDirectory,
  })
  return stdout.trim().toLowerCase()
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.stdout.write(`${await catalogSourceRevision()}\n`)
}
