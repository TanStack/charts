import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const { describe, test } = process.env.VITEST
  ? await import('vitest')
  : await import('node:test')

const workflow = await readFile(
  resolve(import.meta.dirname, '../.github/workflows/conformance.yml'),
  'utf8',
)

describe('conformance monitoring workflow contract', () => {
  test('runs outside ordinary pull-request and main validation', () => {
    assert.match(workflow, /^name:\s*Conformance monitoring$/m)
    assert.doesNotMatch(workflow, /^\s{2}push:\s*$/m)
    assert.doesNotMatch(workflow, /pull_request_target/)
    assert.match(
      workflow,
      /pull_request:\s*\n\s+types:\s*\n(?:\s+-\s+(?:opened|labeled|synchronize|reopened|ready_for_review)\s*\n){5}/,
    )
    assert.match(
      job('select'),
      /contains\(github\.event\.pull_request\.labels\.\*\.name, 'full-conformance'\)/,
    )
    assert.match(
      job('select'),
      /github\.event\.action != 'labeled' \|\| github\.event\.label\.name == 'full-conformance'/,
    )
  })

  test('rotates one nightly shard and runs all shards weekly', () => {
    assert.deepEqual(
      [...workflow.matchAll(/^\s+- cron:\s*'([^']+)'\s*$/gm)].map(
        (match) => match[1],
      ),
      ['43 7 * * *', '13 9 * * 1'],
    )

    const select = job('select')
    assert.match(select, /epoch_day=\$\(\( \$\(date -u \+%s\) \/ 86400 \)\)/)
    assert.match(select, /shard=\$\(\( epoch_day % 8 \+ 1 \)\)/)
    assert.match(select, /mode=nightly\s*\n\s+shards="\[\$shard\]"/)
    assert.match(select, /mode=weekly\s*\n\s+shards='\[1,2,3,4,5,6,7,8\]'/)
    assert.match(select, /mode:\s*\${{ steps\.selection\.outputs\.mode }}/)
    assert.match(select, /shards:\s*\${{ steps\.selection\.outputs\.shards }}/)
  })

  test('supports a full manual run and exact-shard reproduction', () => {
    assert.match(workflow, /workflow_dispatch:\s*\n\s+inputs:/)
    assert.match(
      workflow,
      /shard:[\s\S]*description:\s*Standard conformance scope[\s\S]*default:\s*full/,
    )
    assert.deepEqual(scalarList(workflow, 'options'), [
      'full',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
    ])

    const select = job('select')
    assert.match(
      select,
      /EVENT_NAME" = workflow_dispatch \] && \[ "\$REQUESTED_SHARD" != full/,
    )
    assert.match(select, /shards="\[\$REQUESTED_SHARD\]"/)
    assert.match(select, /mode=manual\s*\n\s+shards='\[1,2,3,4,5,6,7,8\]'/)
  })

  test('runs the standard browser profile through a dynamic shard matrix', () => {
    const conformance = job('conformance')
    assert.deepEqual(needs(conformance), ['select'])
    assert.match(
      conformance,
      /shard:\s*\${{ fromJSON\(needs\.select\.outputs\.shards\) }}/,
    )
    assert.match(conformance, /playwright:\s*['"]true['"]/)
    assert.match(
      conformance,
      /pnpm conformance -- --shard=\${{ matrix\.shard }}\/8/,
    )
    assert.doesNotMatch(conformance, /conformance:quick|--profile=full/)
    assert.match(
      conformance,
      /group:\s*charts-conformance-\${{ github\.event_name == 'pull_request' && github\.event\.pull_request\.number \|\| github\.run_id }}-\${{ matrix\.shard }}/,
    )
    assert.match(
      conformance,
      /cancel-in-progress:\s*\${{ github\.event_name == 'pull_request' }}/,
    )
    assert.match(
      conformance,
      /name:\s*chart-library-conformance-\${{ needs\.select\.outputs\.mode }}-\${{ matrix\.shard }}-\${{ github\.run_id }}/,
    )
    assert.match(conformance, /retention-days:\s*14/)
  })

  test('uses only read access and immutable external actions', () => {
    assert.match(workflow, /^permissions:\s*\n\s+contents:\s*read\s*$/m)
    assert.doesNotMatch(
      workflow,
      /contents:\s*write|id-token:\s*write|pull-requests:\s*write|secrets\.|NPM_TOKEN/,
    )
    assert.doesNotMatch(
      workflow,
      /publish-catalog|changesets\/action|npm publish/,
    )
    assertPinnedExternalActions(workflow)
  })
})

function job(name) {
  const lines = workflow.split(/\r?\n/)
  const jobsIndex = lines.findIndex((line) => /^\s*jobs:\s*$/.test(line))
  assert.notEqual(jobsIndex, -1, 'workflow must define jobs')
  const jobsIndent = indentation(lines[jobsIndex])
  const start = lines.findIndex(
    (line, index) =>
      index > jobsIndex &&
      indentation(line) > jobsIndent &&
      new RegExp(`^\\s*${escapeRegExp(name)}:\\s*$`).test(line),
  )
  assert.notEqual(start, -1, `workflow must define job ${name}`)
  const jobIndent = indentation(lines[start])
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (!lines[index].trim() || lines[index].trimStart().startsWith('#')) {
      continue
    }
    const indent = indentation(lines[index])
    if (indent < jobIndent) {
      end = index
      break
    }
    if (indent === jobIndent && /^\s*[A-Za-z0-9_-]+:\s*$/.test(lines[index])) {
      end = index
      break
    }
  }
  return lines.slice(start, end).join('\n')
}

function needs(block) {
  const scalar = block.match(/^\s*needs:\s*([A-Za-z0-9_-]+)\s*$/m)
  if (scalar) return [scalar[1]]
  return scalarList(block, 'needs')
}

function scalarList(block, key) {
  const lines = block.split(/\r?\n/)
  const start = lines.findIndex((line) =>
    new RegExp(`^\\s*${escapeRegExp(key)}:\\s*$`).test(line),
  )
  assert.notEqual(start, -1, `expected ${key} list`)
  const keyIndent = indentation(lines[start])
  const values = []
  for (let index = start + 1; index < lines.length; index += 1) {
    if (!lines[index].trim() || lines[index].trimStart().startsWith('#')) {
      continue
    }
    if (indentation(lines[index]) <= keyIndent) break
    const item = lines[index].match(/^\s*-\s*([^#]+?)\s*$/)
    if (item) values.push(item[1].replace(/^['"]|['"]$/g, ''))
  }
  return values
}

function assertPinnedExternalActions(source) {
  const uses = [...source.matchAll(/^\s*uses:\s*([^\s#]+)\s*(?:#.*)?$/gm)].map(
    (match) => match[1],
  )
  assert.ok(uses.length > 0, 'workflow must use actions')
  for (const action of uses) {
    if (action.startsWith('./')) continue
    assert.match(
      action,
      /@[0-9a-f]{40}$/,
      `${action} must be pinned to an immutable commit`,
    )
  }
}

function indentation(line) {
  return line.match(/^\s*/)[0].length
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
