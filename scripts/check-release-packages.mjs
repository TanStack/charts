import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import {
  assembleUnifiedCoreArtifact,
  verifyUnifiedCoreArtifact,
} from './unified-package-artifact.mjs'

const repositoryRoot = resolve(import.meta.dirname, '..')
const configuredArtifactDirectory = parseArtifactDirectory(
  process.argv.slice(2),
)
const temporaryDirectory = configuredArtifactDirectory
  ? null
  : await mkdtemp(resolve(tmpdir(), 'tanstack-charts-package-check-'))
const artifactDirectory = configuredArtifactDirectory ?? temporaryDirectory

assert.ok(artifactDirectory)

try {
  await mkdir(artifactDirectory, { recursive: true })
  for (const script of [
    'check-packed-consumers.mjs',
    'check-framework-adapters.mjs',
  ]) {
    await run(process.execPath, [
      resolve(repositoryRoot, 'scripts', script),
      '--artifacts-dir',
      artifactDirectory,
    ])
  }

  await assembleUnifiedCoreArtifact({ repositoryRoot, artifactDirectory })
  await verifyUnifiedCoreArtifact({ repositoryRoot, artifactDirectory })
  console.log('Unified @tanstack/charts artifact gate passed.')
} finally {
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

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

function parseArtifactDirectory(args) {
  if (args.length === 0) return null
  assert.deepEqual(
    args.slice(0, 1),
    ['--artifacts-dir'],
    'Usage: node scripts/check-release-packages.mjs [--artifacts-dir <path>]',
  )
  assert.equal(
    args.length,
    2,
    'Usage: node scripts/check-release-packages.mjs [--artifacts-dir <path>]',
  )
  return resolve(process.cwd(), args[1])
}
