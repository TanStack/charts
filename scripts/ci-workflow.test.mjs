import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { classifyCiChanges } from './classify-ci-changes.mjs'

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
const comparisonRunner = await readFile(
  resolve(import.meta.dirname, './compare-chart-libraries.mjs'),
  'utf8',
)
const packedConsumer = await readFile(
  resolve(import.meta.dirname, './check-packed-consumers.mjs'),
  'utf8',
)
const nxDistribution = await readFile(
  resolve(import.meta.dirname, '../.nx/workflows/distribution.yaml'),
  'utf8',
)
const nxConfig = JSON.parse(
  await readFile(resolve(import.meta.dirname, '../nx.json'), 'utf8'),
)
const projectConfig = JSON.parse(
  await readFile(resolve(import.meta.dirname, '../project.json'), 'utf8'),
)
const packageManifest = JSON.parse(
  await readFile(resolve(import.meta.dirname, '../package.json'), 'utf8'),
)

describe('CI workflow contract', () => {
  test('uses least-privilege permissions and public Nx Cloud access', () => {
    assert.match(workflow, /^permissions:\s*\n\s+contents:\s*read\s*$/m)
    assert.match(workflow, /^\s+actions:\s*read\s*$/m)
    assert.equal((workflow.match(/contents:\s*write/g) ?? []).length, 1)
    assert.doesNotMatch(workflow, /id-token:\s*write/)
    assert.doesNotMatch(workflow, /pull-requests:\s*write/)
    assert.doesNotMatch(workflow, /secrets\.|NX_CLOUD_ACCESS_TOKEN/)
    assert.match(
      job('static'),
      /NX_CLOUD_CONTINUOUS_ASSIGNMENT:\s*['"]true['"]/,
    )
    assert.match(workflow, /concurrency:[\s\S]*cancel-in-progress:\s*true/)
    assertPinnedExternalActions(workflow)
  })

  test('pins every external action used by shared setup', () => {
    assertPinnedExternalActions(setupAction)
    assert.match(setupAction, /uses:\s*pnpm\/action-setup@[0-9a-f]{40}/)
    assert.match(setupAction, /uses:\s*actions\/setup-node@[0-9a-f]{40}/)
    assert.match(setupAction, /cache:\s*pnpm/)
    assert.match(setupAction, /cache-dependency-path:\s*pnpm-lock\.yaml/)
    assert.match(setupAction, /pnpm install --frozen-lockfile/)
    assert.doesNotMatch(setupAction, /TanStack\/config/)
    assert.doesNotMatch(setupAction, /\.nx\/cache|\bos-[^\n]*-nx-/)
    assert.match(
      setupAction,
      /key:\s*\${{ runner\.os }}-\${{ runner\.arch }}-playwright-\${{ hashFiles\('node_modules\/\.pnpm\/playwright-core@\*\/node_modules\/playwright-core\/browsers\.json'\) }}/,
    )
    assert.doesNotMatch(setupAction, /playwright-\${{ hashFiles\('pnpm-lock/)
    assert.doesNotMatch(setupAction, /playwright-\d+\.\d+\.\d+/)
  })

  test('keeps packed-consumer installs offline without resolving optional peers', () => {
    assert.equal(
      (packedConsumer.match(/autoInstallPeers: false/g) ?? []).length,
      2,
    )
    assert.equal(
      (
        packedConsumer.match(
          /\['install', '--offline', '--ignore-scripts', '--frozen-lockfile=false'\]/g,
        ) ?? []
      ).length,
      2,
    )
  })

  test('starts static checks immediately and gates expensive pull request partitions', () => {
    assert.doesNotMatch(job('changes'), /^\s*needs:/m)
    assert.doesNotMatch(job('static'), /^\s*needs:/m)

    for (const [name, output] of [
      ['compare', 'compare'],
      ['stress', 'stress'],
    ]) {
      assert.deepEqual(needs(job(name)), ['changes'])
      assert.match(
        job(name),
        new RegExp(
          `if:\\s*needs\\.changes\\.outputs\\.${output} == ['"]true['"]`,
        ),
      )
    }

    for (const name of ['compare', 'stress']) {
      assert.match(job(name), /uses:\s*\.\/\.github\/actions\/setup/)
      assert.match(job(name), /playwright:\s*['"]true['"]/)
    }
    assert.doesNotMatch(job('static'), /playwright:\s*['"]true['"]/)
    assert.doesNotMatch(workflow, /^\s{2}bundle-baseline:\s*$/m)
    assert.doesNotMatch(workflow, /^\s{2}conformance:\s*$/m)
    assert.doesNotMatch(workflow, /pnpm conformance/)
  })

  test('classifies only benchmark-relevant pull request changes', () => {
    const readmePullRequest = [
      'README.md',
      'media/header_charts.png',
      'packages/alpine-charts/README.md',
      'packages/angular-charts/README.md',
      'packages/charts-core/README.md',
      'packages/charts-scales/README.md',
      'packages/lit-charts/README.md',
      'packages/octane-charts/README.md',
      'packages/preact-charts/README.md',
      'packages/react-charts/README.md',
      'packages/react-native-charts/README.md',
      'packages/solid-charts/README.md',
      'packages/svelte-charts/README.md',
      'packages/vue-charts/README.md',
    ]
    assert.deepEqual(classifyCiChanges(readmePullRequest), {
      static: 'docs',
      compare: false,
      stress: false,
    })
    assert.deepEqual(
      classifyCiChanges([
        'docs/api.md',
        'llms.txt',
        'packages/charts-core/docs/reference.md',
        'packages/react-charts/CHANGELOG.md',
        'benchmarks/comparison/README.md',
        '.changeset/chart-docs.md',
      ]),
      {
        static: 'docs',
        compare: false,
        stress: false,
      },
    )
    assert.deepEqual(classifyCiChanges(['examples/conformance/src/App.tsx']), {
      static: 'full',
      compare: false,
      stress: false,
    })
    assert.deepEqual(
      classifyCiChanges(['packages/charts-core/src/reconcile.ts']),
      {
        static: 'full',
        compare: true,
        stress: true,
      },
    )
    assert.deepEqual(
      classifyCiChanges(['benchmarks/comparison/bundle-baseline.json']),
      {
        static: 'full',
        compare: true,
        stress: false,
      },
    )
    assert.deepEqual(
      classifyCiChanges(['scripts/benchmark/bundle-baseline.mjs']),
      {
        static: 'full',
        compare: true,
        stress: false,
      },
    )
    assert.deepEqual(
      classifyCiChanges(['benchmarks/comparison/stress/workloads.json']),
      {
        static: 'full',
        compare: false,
        stress: true,
      },
    )
    assert.deepEqual(
      classifyCiChanges(['.github/workflows/chart-library-benchmarks.yml']),
      {
        static: 'full',
        compare: true,
        stress: true,
      },
    )
    assert.deepEqual(classifyCiChanges(['project.json']), {
      static: 'full',
      compare: true,
      stress: true,
    })
    assert.deepEqual(classifyCiChanges(['pnpm-lock.yaml']), {
      static: 'full',
      compare: true,
      stress: true,
    })
    assert.deepEqual(
      classifyCiChanges(['README.md', 'packages/charts-core/src/index.ts']),
      {
        static: 'full',
        compare: true,
        stress: true,
      },
    )
    assert.deepEqual(classifyCiChanges(['scripts/run-with-concurrency.mjs']), {
      static: 'full',
      compare: true,
      stress: true,
    })
  })

  test('runs every expensive partition outside pull requests', () => {
    const selection = job('changes')
    assert.match(selection, /git diff --no-renames --name-only -z/)
    assert.match(selection, /if:\s*github\.event_name != 'pull_request'/)
    for (const output of ['compare', 'stress']) {
      assert.match(selection, new RegExp(`echo '${output}=true'`))
    }
  })

  test('runs the cached workspace graph and builds the main catalog fully', () => {
    const staticChecks = job('static')
    assert.match(staticChecks, /fetch-depth:\s*0/)
    assert.match(staticChecks, /persist-credentials:\s*false/)
    assert.match(
      staticChecks,
      /pnpm exec nx start-ci-run --distribute-on="\.nx\/workflows\/distribution\.yaml"/,
    )
    assert.match(
      staticChecks,
      /name:\s*Stop Nx Agents[\s\S]*?if:\s*always\(\) && steps\.nx-agents\.outcome == 'success'[\s\S]*?pnpm exec nx stop-all-agents/,
    )
    assert.ok(
      staticChecks.indexOf('name: Start Nx Agents') >
        staticChecks.indexOf('name: Setup'),
    )
    assert.match(
      staticChecks,
      /name:\s*Verify repository-derived comparison provenance[\s\S]*?NX_CLOUD_CONTINUOUS_ASSIGNMENT:\s*['"]false['"][\s\S]*?pnpm exec nx run charts-workspace:benchmark-check/,
    )
    assert.ok(
      staticChecks.indexOf(
        'name: Verify repository-derived comparison provenance',
      ) < staticChecks.indexOf('name: Start Nx Agents'),
    )
    assert.match(
      staticChecks,
      /name:\s*Verify packed package consumers[\s\S]*?NX_CLOUD_CONTINUOUS_ASSIGNMENT:\s*['"]false['"][\s\S]*?pnpm exec nx run charts-workspace:package-check/,
    )
    assert.ok(
      staticChecks.indexOf('name: Verify packed package consumers') <
        staticChecks.indexOf('name: Start Nx Agents'),
    )
    assert.ok(
      staticChecks.indexOf('name: Stop Nx Agents') >
        staticChecks.indexOf('name: Run full cached validation graph'),
    )
    assert.ok(
      staticChecks.indexOf('name: Stop Nx Agents') <
        staticChecks.indexOf('name: Upload production catalog'),
    )
    assert.match(staticChecks, /git cat-file -e "\${BASE_SHA}\^\{commit\}"/)
    assert.match(staticChecks, /git diff --no-renames --name-only -z/)
    assert.match(staticChecks, /run:\s*pnpm exec nx run charts-workspace:ci/)
    assert.match(staticChecks, /NX_PARALLEL:\s*4/)
    assert.match(
      staticChecks,
      /steps\.static-changes\.outputs\.static == 'full'/,
    )
    assert.match(
      staticChecks,
      /steps\.static-changes\.outputs\.static == 'docs'/,
    )
    assert.match(
      staticChecks,
      /nx run-many --targets=format-check,docs-check,docs-test --projects=charts-workspace --parallel=4/,
    )
    assert.match(
      staticChecks,
      /name:\s*Check workspace diff[\s\S]*?git diff --check/,
    )
    assert.doesNotMatch(staticChecks, /pnpm react-native:poc:types/)
    assert.match(
      staticChecks,
      /uses:\s*nrwl\/nx-set-shas@[0-9a-f]{40}\s*# v5\.0\.1/,
    )
    assert.doesNotMatch(staticChecks, /nx affected|pnpm ci:/)
    assert.match(
      staticChecks,
      /if:\s*github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/,
    )
    assert.match(staticChecks, /name:\s*charts-catalog-\${{ github\.sha }}/)
    assert.match(staticChecks, /path:\s*\.catalog-artifact/)
  })

  test('runs distributed checks on medium Nx agents', () => {
    assert.equal(
      nxDistribution,
      `distribute-on:
  default: 3 linux-medium-js

assignment-rules:
  - projects:
      - '*'
    run-on:
      - agent: linux-medium-js
        parallelism: 2
`,
    )
  })

  test('keeps every distributed Nx task cacheable', () => {
    const ci = projectConfig.targets.ci
    assert.match(nxConfig.nxCloudId, /^[0-9a-f]{24}$/)
    assert.equal(ci.cache, true)
    assert.ok(ci.dependsOn.includes('react-native-types'))
    assert.ok(!ci.dependsOn.includes('workspace-diff-check'))
    assert.equal(projectConfig.targets['workspace-diff-check'].cache, false)
    assert.deepEqual(nxConfig.targetDefaults['react-native-types'], {
      cache: true,
      inputs: ['reactNativeTypes'],
    })
    assert.deepEqual(nxConfig.targetDefaults['package-check'], {
      cache: true,
      inputs: ['release'],
    })
    assert.ok(
      nxConfig.namedInputs.format.includes(
        '!{workspaceRoot}/.nx/workspace-data/**/*',
      ),
    )
    assert.ok(
      !nxConfig.namedInputs.format.includes('!{workspaceRoot}/.nx/**/*'),
    )
    assert.equal(
      packageManifest.scripts.validate,
      'nx run charts-workspace:ci && git diff --check',
    )
  })

  test('shards comparison by chart', () => {
    const comparison = job('compare')
    assert.match(comparison, /fail-fast:\s*false/)
    assert.deepEqual(scalarList(comparison, 'chart'), [
      'line',
      'bar',
      'area',
      'scatter',
    ])
    assert.match(
      comparison,
      /fetch-depth:\s*\${{ matrix\.chart == 'line' && '0' \|\| '1' }}/,
    )
    assert.match(comparison, /CHECK_BASELINE_PROVENANCE:/)
    assert.match(
      comparison,
      /baseline_args=\(--check-bundle-baseline\)[\s\S]*baseline_args\+=\(--check-bundle-provenance\)/,
    )
    assert.match(comparison, /--profile=ci --chart=\${{ matrix\.chart }}/)
    assert.match(comparison, /--check-bundle-baseline/)
    assert.match(
      comparison,
      /name:\s*chart-library-comparison-\${{ matrix\.chart }}-\${{ github\.run_id }}/,
    )
    assert.match(
      comparison,
      /summaries=\(\.benchmark-output\/results\/\*\.md\)[\s\S]*test -e "\${summaries\[0\]}"[\s\S]*cat "\${summaries\[@\]}"/,
    )
    assert.match(comparison, /retention-days:\s*14/)
  })

  test('checks each comparison shard baseline without a second bundle build', () => {
    assert.match(comparisonRunner, /args\.has\('--check-bundle-baseline'\)/)
    const sizeOnly = comparisonRunner.match(
      /const sizeOnly =([\s\S]*?)const perfOnly/,
    )?.[1]
    assert.ok(sizeOnly)
    assert.doesNotMatch(sizeOnly, /check-bundle-baseline/)
    assert.match(
      comparisonRunner,
      /requireCompleteMatrix:\s*args\.has\('--check'\)/,
    )
    assert.match(
      comparisonRunner,
      /checkSourceProvenance:[\s\S]*args\.has\('--check-bundle-provenance'\)/,
    )
    assert.match(
      comparisonRunner,
      /if \(library\.id === 'tanstack'\) \{\s*if \(checkSourceProvenance\)/,
    )
    assert.match(
      comparisonRunner,
      /checkedChartTypes\.flatMap[\s\S]*checkedTiers\.map/,
    )
  })

  test('covers every stress workload exactly once across named shards', () => {
    const stress = job('stress')
    assert.match(stress, /fail-fast:\s*false/)
    assert.deepEqual(matrixIncludes(stress), [
      {
        name: 'partition-1',
        workloads: 'raw-line,raw-scatter,interactive-scatter',
        shard: '1/4',
      },
      {
        name: 'partition-2',
        workloads: 'binned-density,pixel-envelope,viewport-envelope',
        shard: '2/4',
      },
      {
        name: 'partition-3',
        workloads: 'stats-multi-series-line,rolling-keyed-window,histogram-128',
        shard: '3/4',
      },
      {
        name: 'partition-4',
        workloads: 'top-categories,dashboard-lines',
        shard: '4/4',
      },
    ])
    assert.match(
      stress,
      /benchmark:stress:quick -- --workload=\${{ matrix\.workloads }}/,
    )
    assert.match(
      stress,
      /benchmark:stress:standard -- --shard=\${{ matrix\.shard }}/,
    )
    assert.match(
      stress,
      /github\.event_name == 'pull_request' \|\| github\.event_name == 'push'/,
    )
    assert.match(
      stress,
      /github\.event_name == 'schedule' \|\| github\.event_name == 'workflow_dispatch'/,
    )
    assert.doesNotMatch(stress, /version_pr/)
    assert.doesNotMatch(stress, /vitest run benchmarks\/comparison\/stress/)
    assert.match(
      stress,
      /name:\s*chart-library-stress-\${{ matrix\.name }}-\${{ github\.run_id }}/,
    )
    assert.match(
      stress,
      /summaries=\(\.benchmark-output\/stress\/results\/\*\.md\)[\s\S]*test -e "\${summaries\[0\]}"[\s\S]*cat "\${summaries\[@\]}"/,
    )
    assert.match(stress, /retention-days:\s*14/)

    const workloads = matrixIncludes(stress).flatMap((entry) =>
      entry.workloads.split(','),
    )
    assert.equal(workloads.length, new Set(workloads).size)
    assert.deepEqual(
      matrixIncludes(stress).map((entry) => entry.shard),
      ['1/4', '2/4', '3/4', '4/4'],
    )
  })

  test('exposes one stable CI gate that requires every partition', () => {
    const aggregate = job('ci')
    assert.match(aggregate, /if:\s*always\(\)/)
    assert.deepEqual(needs(aggregate), [
      'changes',
      'static',
      'compare',
      'stress',
      'bundle-baseline-candidate',
      'compare-container-canary',
    ])
    for (const [variable, dependency] of [
      ['STATIC_RESULT', 'static'],
      ['COMPARISON_RESULT', 'compare'],
      ['STRESS_RESULT', 'stress'],
    ]) {
      assert.match(
        aggregate,
        new RegExp(
          `${variable}:\\s*\\$\\{\\{\\s*needs\\.${escapeRegExp(dependency)}\\.result\\s*\\}\\}`,
        ),
      )
    }
    assert.match(aggregate, /test "\$CHANGES_RESULT" = success/)
    assert.match(aggregate, /test "\$STATIC_RESULT" = success/)
    assert.match(aggregate, /true:success\|false:skipped/)
    assert.match(
      aggregate,
      /require_partition "\$COMPARISON_REQUIRED" "\$COMPARISON_RESULT"/,
    )
    assert.doesNotMatch(aggregate, /BUNDLE_REQUIRED|BUNDLE_RESULT/)
    assert.match(
      aggregate,
      /require_partition "\$BUNDLE_CANDIDATE_REQUIRED" "\$BUNDLE_CANDIDATE_RESULT"/,
    )
    assert.match(
      aggregate,
      /require_partition "\$STRESS_REQUIRED" "\$STRESS_RESULT"/,
    )
    assert.doesNotMatch(aggregate, /CONFORMANCE_RESULT|needs\.conformance/)
    assert.doesNotMatch(aggregate, /contents:\s*write/)
  })

  test('offers an opt-in exact-container benchmark canary', () => {
    const canary = job('compare-container-canary')
    assert.match(
      canary,
      /if:\s*github\.event_name == 'workflow_dispatch' && inputs\.playwright_container_canary/,
    )
    assert.match(
      canary,
      /image:\s*mcr\.microsoft\.com\/playwright:v1\.62\.0-noble@sha256:[0-9a-f]{64}/,
    )
    assert.match(canary, /PLAYWRIGHT_BROWSERS_PATH:\s*\/ms-playwright/)
    assert.match(canary, /--profile=ci --chart=line/)
    assert.match(canary, /retention-days:\s*14/)
    assert.doesNotMatch(canary, /playwright:\s*['"]true['"]/)
  })

  test('creates the full bundle candidate only when manually requested', () => {
    const candidate = job('bundle-baseline-candidate')
    assert.match(
      candidate,
      /if:\s*github\.event_name == 'workflow_dispatch' && inputs\.upload_bundle_baseline_candidate/,
    )
    assert.match(candidate, /fetch-depth:\s*0/)
    assert.match(
      candidate,
      /run:\s*node scripts\/compare-chart-libraries\.mjs --check/,
    )
    assert.match(candidate, /bundle-baseline\.candidate\.json/)
    assert.match(candidate, /retention-days:\s*14/)
  })

  test('publishes the catalog only from a successful exact-main CI artifact', () => {
    const publish = job('publish-catalog')
    assert.match(
      publish,
      /if:\s*always\(\) && !cancelled\(\) && github\.event_name == 'push' && github\.ref == 'refs\/heads\/main' && needs\.static\.result == 'success' && needs\.ci\.result == 'success'/,
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
    const shard = lines[index].match(/^\s*shard:\s*([^#]+?)\s*$/)
    if (shard && current) current.shard = unquote(shard[1])
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
