import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, it } from 'vitest'

const workflow = await readFile(
  resolve(
    import.meta.dirname,
    '../.github/workflows/bootstrap-release-package.yml',
  ),
  'utf8',
)
const normalReleaseWorkflow = await readFile(
  resolve(import.meta.dirname, '../.github/workflows/release.yml'),
  'utf8',
)
const bootstrapScript = await readFile(
  resolve(import.meta.dirname, './bootstrap-release-package.mjs'),
  'utf8',
)

describe('npm bootstrap workflow contract', () => {
  it('is a guarded one-shot workflow on exact main', () => {
    assert.match(workflow, /workflow_dispatch:\s*\n\s+inputs:/)
    assert.doesNotMatch(workflow, /\bpush:|pull_request:|schedule:/)
    assert.match(
      workflow,
      /package:\s*\n\s+description: Exact missing fixed-set package@version/,
    )
    assert.match(workflow, /github\.repository == 'TanStack\/charts'/)
    assert.match(workflow, /github\.event_name == 'workflow_dispatch'/)
    assert.match(workflow, /github\.ref_type == 'branch'/)
    assert.match(workflow, /github\.ref == 'refs\/heads\/main'/)
    assert.match(workflow, /environment:\s*npm-bootstrap/)
    assert.match(workflow, /runs-on:\s*ubuntu-24\.04/)
    assert.match(workflow, /group:\s*charts-npm-bootstrap/)
    assert.match(workflow, /cancel-in-progress:\s*false/)
  })

  it('uses read-only contents, OIDC provenance, and no checkout credentials', () => {
    assert.match(workflow, /^permissions:\s*\n\s+contents:\s*read\s*$/m)
    assert.equal((workflow.match(/contents:\s*read/g) ?? []).length, 2)
    assert.equal((workflow.match(/id-token:\s*write/g) ?? []).length, 1)
    assert.doesNotMatch(workflow, /contents:\s*write|pull-requests:\s*write/)
    assert.match(workflow, /persist-credentials:\s*false/)
    assert.match(workflow, /ref:\s*\${{ github\.sha }}/)
    assertPinnedExternalActions(workflow)
  })

  it('exposes the bootstrap token only to the conditional publish step', () => {
    assert.equal((workflow.match(/NODE_AUTH_TOKEN/g) ?? []).length, 1)
    assert.equal((workflow.match(/NPM_BOOTSTRAP_TOKEN/g) ?? []).length, 1)
    const publishStep = step('Publish the confirmed package')
    assert.match(
      publishStep,
      /if:\s*steps\.prepare\.outputs\.publish_needed == 'true'/,
    )
    assert.match(
      publishStep,
      /NODE_AUTH_TOKEN:\s*\${{ secrets\.NPM_BOOTSTRAP_TOKEN }}/,
    )
    assert.match(
      publishStep,
      /node scripts\/bootstrap-release-package\.mjs publish/,
    )
    assert.doesNotMatch(
      normalReleaseWorkflow,
      /NPM_BOOTSTRAP_TOKEN|NODE_AUTH_TOKEN/,
    )
  })

  it('builds and derives the candidate before publication', () => {
    const prepareStep = step('Build and identify the sole missing package')
    assert.match(prepareStep, /id:\s*prepare/)
    assert.match(
      prepareStep,
      /BOOTSTRAP_PACKAGE_SPEC:\s*\${{ inputs\.package }}/,
    )
    assert.match(
      prepareStep,
      /node scripts\/bootstrap-release-package\.mjs prepare/,
    )
    assert.ok(
      workflow.indexOf('bootstrap-release-package.mjs prepare') <
        workflow.indexOf('bootstrap-release-package.mjs publish'),
    )
  })

  it('publishes one prepared tarball and verifies registry provenance', () => {
    assert.match(
      bootstrapScript,
      /'publish',\s*artifact\.tarball,\s*'--access',\s*'public',\s*'--tag',\s*'latest',\s*'--provenance'/,
    )
    assert.match(
      bootstrapScript,
      /await waitForRegistryPackage\(selection\.artifact\)/,
    )
    assert.match(
      bootstrapScript,
      /validatePublishedArtifact\(selection\.artifact, registry\)/,
    )
    assert.match(bootstrapScript, /attempt < 60/)
    assert.match(bootstrapScript, /setTimeout\(resolvePromise, 2_000\)/)
    assert.match(bootstrapScript, /delete sanitized\.NODE_AUTH_TOKEN/)
    assert.match(bootstrapScript, /'bootstrap-plan\.json'/)
    assert.match(bootstrapScript, /revision: process\.env\.GITHUB_SHA/)
    assert.match(
      bootstrapScript,
      /execFileAsync\('git', \['rev-parse', 'HEAD'\]/,
    )
    assert.match(
      bootstrapScript,
      /'Checked-out revision differs from GITHUB_SHA'/,
    )
  })
})

function step(name) {
  const lines = workflow.split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === `- name: ${name}`)
  assert.notEqual(start, -1, `workflow must define step ${name}`)
  const indent = indentation(lines[start])
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (
      /^\s*- name:/.test(lines[index]) &&
      indentation(lines[index]) === indent
    ) {
      end = index
      break
    }
  }
  return lines.slice(start, end).join('\n')
}

function assertPinnedExternalActions(source) {
  const uses = [...source.matchAll(/^\s*uses:\s*([^\s#]+)\s*(?:#.*)?$/gm)].map(
    (match) => match[1],
  )
  assert.ok(uses.length > 0, 'workflow must use actions')
  for (const action of uses) {
    if (action.startsWith('./')) continue
    assert.match(action, /@[0-9a-f]{40}$/, `${action} must be immutable`)
  }
}

function indentation(line) {
  return line.match(/^\s*/)[0].length
}
