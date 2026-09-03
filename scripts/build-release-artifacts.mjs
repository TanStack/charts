import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  createReleaseArtifactManifest,
  validateReleaseArtifacts,
} from './release-artifacts.mjs'
import { releaseArtifactsDirectoryName } from './release-package-config.mjs'

const repositoryRoot = resolve(import.meta.dirname, '..')
const artifactDirectory = resolve(repositoryRoot, releaseArtifactsDirectoryName)

assert.equal(
  artifactDirectory,
  resolve(repositoryRoot, '.release-artifacts'),
  'Refusing to replace an unexpected artifact directory',
)

await rm(artifactDirectory, { recursive: true, force: true })
await mkdir(artifactDirectory, { recursive: true })

await run(process.execPath, [
  resolve(repositoryRoot, 'scripts', 'check-release-packages.mjs'),
  '--artifacts-dir',
  artifactDirectory,
])

await createReleaseArtifactManifest(repositoryRoot)
const { artifacts, version } = await validateReleaseArtifacts(repositoryRoot)
console.log(
  `Validated ${artifacts.length} release artifacts for ${version} in ${artifactDirectory}.`,
)

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env: { ...process.env, CI: 'true' },
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise()
        return
      }
      reject(
        new Error(
          `${command} exited with ${code ?? `signal ${signal ?? 'unknown'}`}`,
        ),
      )
    })
  })
}
