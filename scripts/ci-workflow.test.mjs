import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const { describe, test } = process.env.VITEST
  ? await import('vitest')
  : await import('node:test')

const workflow = await readFile(
  resolve(
    import.meta.dirname,
    '../.github/workflows/chart-library-benchmarks.yml',
  ),
  'utf8',
)
const setupAction = await readFile(
  resolve(import.meta.dirname, '../.github/actions/setup/action.yml'),
  'utf8',
)

describe('CI workflow contract', () => {
  test('uses a read-only default and cancels stale validation runs', () => {
    assert.match(workflow, /^permissions:\s*\n\s+contents:\s*read\s*$/m)
    assert.equal((workflow.match(/contents:\s*write/g) ?? []).length, 1)
    assert.doesNotMatch(workflow, /id-token:\s*write/)
    assert.doesNotMatch(workflow, /pull-requests:\s*write/)
    assert.doesNotMatch(workflow, /secrets\.|NX_CLOUD_ACCESS_TOKEN/)
    assert.match(workflow, /concurrency:[\s\S]*cancel-in-progress:\s*true/)
    assertPinnedExternalActions(workflow)
  })

  test('pins every external action used by shared setup', () => {
    assertPinnedExternalActions(setupAction)
  })

  test('runs static, bundle, comparison, conformance, and stress partitions independently', () => {
    for (const name of [
      'static',
      'bundle-baseline',
      'compare',
      'conformance',
      'stress',
    ]) {
      assert.doesNotMatch(
        job(name),
        /^\s*needs:/m,
        `${name} must not wait behind another CI partition`,
      )
    }

    for (const name of ['compare', 'conformance', 'stress']) {
      assert.match(job(name), /uses:\s*\.\/\.github\/actions\/setup/)
      assert.match(job(name), /playwright:\s*['"]true['"]/)
    }
    assert.doesNotMatch(job('static'), /playwright:\s*['"]true['"]/)
    assert.doesNotMatch(job('bundle-baseline'), /playwright:\s*['"]true['"]/)
  })

  test('uses affected checks only for pull requests and builds the main catalog fully', () => {
    const staticChecks = job('static')
    assert.match(staticChecks, /fetch-depth:\s*0/)
    assert.match(staticChecks, /persist-credentials:\s*false/)
    assert.match(staticChecks, /nrwl\/nx-set-shas@[0-9a-f]{40}/)
    assert.match(staticChecks, /if:\s*github\.event_name == 'pull_request'/)
    assert.match(staticChecks, /run:\s*pnpm ci:pr/)
    assert.match(staticChecks, /if:\s*github\.event_name != 'pull_request'/)
    assert.match(staticChecks, /run:\s*pnpm ci:all/)
    assert.match(
      staticChecks,
      /if:\s*github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/,
    )
    assert.match(staticChecks, /name:\s*charts-catalog-\${{ github\.sha }}/)
    assert.match(staticChecks, /path:\s*\.catalog-artifact/)
  })

  test('shards comparison by chart and conformance into eight partitions', () => {
    const comparison = job('compare')
    assert.match(comparison, /fail-fast:\s*false/)
    assert.deepEqual(scalarList(comparison, 'chart'), [
      'line',
      'bar',
      'area',
      'scatter',
    ])
    assert.match(comparison, /--profile=ci --chart=\${{ matrix\.chart }}/)
    assert.match(
      comparison,
      /name:\s*chart-library-comparison-\${{ matrix\.chart }}-\${{ github\.run_id }}/,
    )

    const conformance = job('conformance')
    assert.match(conformance, /fail-fast:\s*false/)
    assert.deepEqual(scalarList(conformance, 'shard'), [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
    ])
    assert.match(conformance, /Conformance \(\${{ matrix\.shard }}\/8\)/)
    assert.match(
      conformance,
      /pnpm conformance:quick -- --shard=\${{ matrix\.shard }}\/8/,
    )
    assert.match(
      conformance,
      /pnpm conformance -- --shard=\${{ matrix\.shard }}\/8/,
    )
    assert.match(
      conformance,
      /name:\s*chart-library-conformance-\${{ matrix\.shard }}-\${{ github\.run_id }}/,
    )
  })

  test('covers every stress workload exactly once across named shards', () => {
    const stress = job('stress')
    assert.match(stress, /fail-fast:\s*false/)
    assert.deepEqual(matrixIncludes(stress), [
      {
        name: 'raw',
        workloads: 'raw-line,raw-scatter,interactive-scatter',
      },
      {
        name: 'envelopes',
        workloads: 'binned-density,pixel-envelope,viewport-envelope',
      },
      {
        name: 'transforms',
        workloads: 'stats-multi-series-line,rolling-keyed-window,histogram-128',
      },
      {
        name: 'collections',
        workloads: 'top-categories,dashboard-lines',
      },
    ])
    assert.match(
      stress,
      /benchmark:stress:quick -- --workload=\${{ matrix\.workloads }}/,
    )
    assert.match(
      stress,
      /benchmark:stress:standard -- --workload=\${{ matrix\.workloads }}/,
    )
    assert.match(
      stress,
      /name:\s*chart-library-stress-\${{ matrix\.name }}-\${{ github\.run_id }}/,
    )

    const workloads = matrixIncludes(stress).flatMap((entry) =>
      entry.workloads.split(','),
    )
    assert.equal(workloads.length, new Set(workloads).size)
  })

  test('exposes one stable CI gate that requires every partition', () => {
    const aggregate = job('ci')
    assert.match(aggregate, /if:\s*always\(\)/)
    assert.deepEqual(needs(aggregate), [
      'static',
      'bundle-baseline',
      'compare',
      'conformance',
      'stress',
    ])
    for (const [variable, dependency] of [
      ['STATIC_RESULT', 'static'],
      ['BUNDLE_RESULT', 'bundle-baseline'],
      ['COMPARISON_RESULT', 'compare'],
      ['CONFORMANCE_RESULT', 'conformance'],
      ['STRESS_RESULT', 'stress'],
    ]) {
      assert.match(
        aggregate,
        new RegExp(
          `${variable}:\\s*\\$\\{\\{\\s*needs\\.${escapeRegExp(dependency)}\\.result\\s*\\}\\}`,
        ),
      )
    }
    assert.match(aggregate, /test "\$result" = success/)
    assert.doesNotMatch(aggregate, /contents:\s*write/)
  })

  test('publishes the catalog only from a successful exact-main CI artifact', () => {
    const publish = job('publish-catalog')
    assert.match(
      publish,
      /if:\s*github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/,
    )
    assert.deepEqual(needs(publish), ['static', 'ci'])
    assert.match(publish, /contents:\s*write/)
    assert.match(publish, /cancel-in-progress:\s*false/)
    assert.match(publish, /name:\s*charts-catalog-\${{ github\.sha }}/)
    assert.match(publish, /path:\s*\.catalog-artifact/)
    assert.match(publish, /if \[ "\$source_revision" != "\$GITHUB_SHA" \]/)
    assert.match(
      publish,
      /git merge-base --is-ancestor "\$source_revision" origin\/main/,
    )
    assert.match(
      publish,
      /git(?: -C "\$publication_dir")? push origin "HEAD:\$CATALOG_BRANCH"/,
    )
    assert.doesNotMatch(publish, /id-token:\s*write/)
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

function matrixIncludes(block) {
  const lines = block.split(/\r?\n/)
  const includeIndex = lines.findIndex((line) => /^\s*include:\s*$/.test(line))
  assert.notEqual(includeIndex, -1, 'stress matrix must use include entries')
  const includeIndent = indentation(lines[includeIndex])
  const entries = []
  let current
  for (let index = includeIndex + 1; index < lines.length; index += 1) {
    if (!lines[index].trim() || lines[index].trimStart().startsWith('#')) {
      continue
    }
    if (indentation(lines[index]) <= includeIndent) break
    const name = lines[index].match(/^\s*-\s*name:\s*([^#]+?)\s*$/)
    if (name) {
      current = { name: unquote(name[1]) }
      entries.push(current)
      continue
    }
    const workloads = lines[index].match(/^\s*workloads:\s*([^#]+?)\s*$/)
    if (workloads && current) current.workloads = unquote(workloads[1])
  }
  return entries
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

function unquote(value) {
  return value.replace(/^['"]|['"]$/g, '')
}

function indentation(line) {
  return line.match(/^\s*/)[0].length
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
