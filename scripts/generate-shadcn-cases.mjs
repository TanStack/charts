import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { format } from 'prettier'

const root = path.resolve(import.meta.dirname, '..')
const catalogPath = path.join(
  root,
  'benchmarks/conformance/shadcn/catalog.json',
)
const casesRoot = path.join(root, 'benchmarks/conformance/cases')
const coverageRoot = path.join(root, 'benchmarks/conformance')
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
const handAuthoredCases = new Set([
  'chart-bar-multiple',
  'chart-pie-donut-text',
  'chart-radar-multiple',
  'chart-radial-text',
  'chart-tooltip-advanced',
])
let nextCaseNumber =
  Math.max(
    126,
    ...catalog.cases.map((entry) =>
      Number(entry.localCaseId?.match(/^(\d+)-/u)?.[1] ?? 0),
    ),
  ) + 1
let generatedCount = 0

for (const entry of catalog.cases) {
  if (!entry.localCaseId) {
    entry.localCaseId = `${nextCaseNumber}-shadcn-${entry.name.replace(/^chart-/u, '')}`
    nextCaseNumber += 1
  }
  const caseNumber = Number(entry.localCaseId.match(/^(\d+)-/u)?.[1] ?? 0)
  if (handAuthoredCases.has(entry.name)) continue
  const id = entry.localCaseId
  const directory = path.join(casesRoot, id)
  generatedCount += 1
  await mkdir(directory, { recursive: true })
  await writeFile(
    path.join(directory, 'case.json'),
    `${JSON.stringify(metadata(entry, id, caseNumber), null, 2)}\n`,
  )
  await writeFile(
    path.join(directory, 'tanstack.ts'),
    `import { createShadcnTanStackExample } from '../../shared/shadcn-catalog-tanstack'\n\nconst example = createShadcnTanStackExample('${entry.name}')\n\nexport const shadcnDefinition = example.definition\nexport const catalogCase = example.catalogCase\nexport const mount = example.mount\n`,
  )
  await writeFile(
    path.join(directory, 'recharts.ts'),
    `import { createShadcnRechartsExample } from '../../shared/shadcn-catalog-recharts'\n\nconst example = createShadcnRechartsExample('${entry.name}')\n\nexport const mount = example.mount\n`,
  )
}

await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`)
await syncDefinitionCoverage()
console.log(`Synchronized ${generatedCount} generated shadcn chart cases.`)

async function syncDefinitionCoverage() {
  const roadmapPath = path.join(
    coverageRoot,
    'definition-coverage-roadmap.json',
  )
  const roadmap = JSON.parse(await readFile(roadmapPath, 'utf8'))
  const generatedEntries = [
    coverageEntry({
      family: 'dashboard',
      localCaseId: '127-shadcn-dashboard',
      name: 'dashboard',
    }),
    ...catalog.cases.map(coverageEntry),
  ]
  const generatedIds = new Set(generatedEntries.map((entry) => entry.id))
  const retainedCases = roadmap.cases.filter(
    (entry) => !generatedIds.has(entry.id),
  )
  const insertionIndex =
    retainedCases.findIndex((entry) => entry.id === '126-drillable-sunburst') +
    1
  if (insertionIndex === 0) {
    throw new Error('Could not locate catalog case 126-drillable-sunburst.')
  }
  retainedCases.splice(insertionIndex, 0, ...generatedEntries)
  roadmap.cases = retainedCases
  await writeFile(roadmapPath, `${JSON.stringify(roadmap, null, 2)}\n`)

  const counts = countCoverage(roadmap.cases)
  const auditPath = path.join(coverageRoot, roadmap.audit)
  let audit = await readFile(auditPath, 'utf8')
  audit = replaceGeneratedRows(
    audit,
    generatedIds,
    generatedEntries.map(auditRow).join('\n'),
    '126-drillable-sunburst',
  )
  audit = audit
    .replace(
      /Scope: all \d+ catalog directories\./u,
      `Scope: all ${counts.total} catalog directories.`,
    )
    .replace(
      /Cases 119 through 126 were added afterward/u,
      'Cases 119 through 126 and the pinned shadcn collection were added afterward',
    )
    .replace(
      /(?:One hundred fourteen|\d+) of the \d+ cases present their visualization as a normal chart/u,
      `${counts.normal} of the ${counts.total} cases present their visualization as a normal chart`,
    )
    .replace(
      /definition\. (?:Sixty-five|\d+) use the definition API/u,
      `definition. ${counts.definitionNow} use the definition API`,
    )
    .replace(
      /\| Definition now\s+\|\s+\d+\s+\|/u,
      `| Definition now        |     ${String(counts.definitionNow).padStart(3)} |`,
    )
    .replace(
      /\| \*\*Total\*\*\s+\| \*\*\d+\*\* \|/u,
      `| **Total**             | **${counts.total}** |`,
    )
    .replace(
      /All \d+ catalog directories now have one roadmap record and case-local/u,
      `All ${counts.total} catalog directories now have one roadmap record and case-local`,
    )
    .replace(
      /All \d+ normal-definition cases are verified/u,
      `All ${counts.normal} normal-definition cases are verified`,
    )
  await writeFile(auditPath, await format(audit, { parser: 'markdown' }))

  const overviewPath = path.join(coverageRoot, roadmap.overview)
  let overview = await readFile(overviewPath, 'utf8')
  overview = replaceGeneratedRows(
    overview,
    generatedIds,
    generatedEntries.map(overviewRow).join('\n'),
    '126-drillable-sunburst',
  )
  overview = overview
    .replace(
      /The catalog has \d+ case directories\. (?:One hundred fourteen|\d+) visualizations now use/u,
      `The catalog has ${counts.total} case directories. ${counts.normal} visualizations now use`,
    )
    .replace(
      /\| Definition now\s+\|\s+\d+\s+\|/u,
      `| Definition now        |     ${String(counts.definitionNow).padStart(3)} |`,
    )
    .replace(
      /\| \*\*Total\*\*\s+\| \*\*\d+\*\* \| \*\*\d+ normal definitions; 3 accepted boundaries\*\* \|/u,
      `| **Total**             | **${counts.total}** | **${counts.normal} normal definitions; 3 accepted boundaries** |`,
    )
    .replace(
      /compares all \d+ roadmap and audit IDs/u,
      `compares all ${counts.total} roadmap and audit IDs`,
    )
  await writeFile(overviewPath, await format(overview, { parser: 'markdown' }))
}

function coverageEntry(entry) {
  const id = entry.localCaseId
  return {
    id,
    coverage: 'app-composed',
    disposition: 'definition-now',
    phase: 'phase-0',
    status: 'verified',
    capabilities: ['current-definition-api'],
    evidence: [`cases/${id}/tanstack.ts`, `cases/${id}/case.json`],
    work: [
      {
        kind: 'definition-composition',
        stage: 'definition-builder',
        owner: 'charts',
        coordinateSpace: 'none',
        sources: ['benchmarks/conformance/shared/shadcn-catalog-tanstack.tsx'],
        summary: `Compose the pinned shadcn ${entry.name} variant through the shared native ${entry.family} chart definition.`,
      },
      {
        kind: 'application-shell',
        stage: 'post-render',
        owner: 'application',
        coordinateSpace: 'dom',
        sources: ['benchmarks/conformance/shared/shadcn-chart-card.tsx'],
        summary:
          'Share the canonical shadcn card dimensions, typography, footer, and theme tokens across renderer implementations.',
      },
    ],
  }
}

function auditRow(entry) {
  const label = entry.id.replace('-shadcn-', ' — shadcn ')
  return `| [${label}](./cases/${entry.id}/tanstack.ts) | Definition now | Shared native TanStack Charts ${entry.id.split('-')[2]} definitions reproduce the pinned shadcn variant; the card remains application presentation. |`
}

function overviewRow(entry) {
  const metadata = catalog.cases.find(
    (candidate) => candidate.localCaseId === entry.id,
  )
  const title = metadata ? officialTitle(metadata.name) : 'Dashboard'
  return `| [${entry.id} — ${title}](./cases/${entry.id}/tanstack.ts) | Definition now | \`current-definition-api\` | \`tanstack.ts\`, \`case.json\` |`
}

function replaceGeneratedRows(source, generatedIds, rows, afterId) {
  const retained = source
    .split('\n')
    .filter(
      (line) =>
        ![...generatedIds].some((id) => line.includes(`./cases/${id}/`)),
    )
  const index = retained.findIndex((line) =>
    line.includes(`./cases/${afterId}/`),
  )
  if (index === -1) throw new Error(`Could not locate coverage row ${afterId}.`)
  retained.splice(index + 1, 0, rows)
  return retained.join('\n')
}

function countCoverage(cases) {
  const definitionNow = cases.filter(
    (entry) => entry.disposition === 'definition-now',
  ).length
  const accepted = cases.filter(
    (entry) => entry.status === 'accepted-boundary',
  ).length
  return {
    total: cases.length,
    normal: cases.length - accepted,
    definitionNow,
  }
}

function metadata(entry, id, caseNumber) {
  const title = officialTitle(entry.name)
  return {
    schemaVersion: 1,
    referenceRenderer: 'recharts',
    collections: ['shadcn'],
    height: 600,
    order: (caseNumber + 1) * 10,
    id,
    title: `shadcn ${title}`,
    family: entry.family,
    intent: `Reproduce shadcn/ui's ${entry.name} example with TanStack Charts.`,
    support: 'native',
    features: featureList(entry.name),
    geometry: [geometry(entry.name, entry.family)],
    source: {
      title: `shadcn/ui ${entry.name}`,
      url: `https://ui.shadcn.com/view/new-york-v4/${entry.name}`,
    },
    ai: {
      create: `Reproduce the official shadcn/ui ${entry.name} card and data with TanStack Charts.`,
      maintain: `Preserve the pinned upstream data, ${entry.name.replace(/^chart-/u, '').replaceAll('-', ' ')} treatment, card dimensions, and light and dark tokens.`,
    },
  }
}

function featureList(name) {
  const words = name.replace(/^chart-/u, '').split('-')
  const family = words.shift()
  const variant = words.join(' ')
  return [
    `${family} chart`,
    ...(variant === 'default' || variant === 'simple' ? [] : [variant]),
    'shadcn card shell',
  ]
}

function geometry(name, family) {
  const variant = name.replace(`chart-${family}-`, '')
  if (family === 'area') {
    return {
      role: 'area',
      count: variant === 'stacked-expand' ? 3 : isAreaMultiple(variant) ? 2 : 1,
    }
  }
  if (family === 'bar') {
    return {
      role: 'bar',
      count: variant === 'multiple' || variant === 'stacked' ? 12 : 6,
    }
  }
  if (family === 'line') {
    return {
      role: 'line',
      count: variant === 'multiple' || variant === 'interactive' ? 2 : 1,
    }
  }
  if (family === 'pie') return { role: 'arc', count: 5 }
  if (family === 'radar') {
    return {
      role: 'radar',
      count: variant === 'multiple' || variant === 'legend' ? 2 : 1,
    }
  }
  if (family === 'radial') {
    return {
      role: 'bar',
      count: variant === 'simple' || variant === 'text' ? 1 : 5,
      rendererRoles: { recharts: 'arc', tanstack: 'arc' },
    }
  }
  return { role: 'bar', count: 10 }
}

function isAreaMultiple(variant) {
  return (
    variant === 'axes' ||
    variant === 'gradient' ||
    variant === 'icons' ||
    variant === 'interactive' ||
    variant === 'legend' ||
    variant === 'stacked'
  )
}

function officialTitle(name) {
  const overrides = {
    'chart-area-default': 'Area Chart',
    'chart-area-stacked-expand': 'Area Chart - Stacked Expanded',
    'chart-bar-default': 'Bar Chart',
    'chart-bar-label-custom': 'Bar Chart - Custom Label',
    'chart-bar-stacked': 'Bar Chart - Stacked + Legend',
    'chart-line-default': 'Line Chart',
    'chart-line-dots-custom': 'Line Chart - Custom Dots',
    'chart-line-label-custom': 'Line Chart - Custom Label',
    'chart-pie-simple': 'Pie Chart',
    'chart-pie-donut-text': 'Pie Chart - Donut with Text',
    'chart-pie-label-custom': 'Pie Chart - Custom Label',
    'chart-radar-default': 'Radar Chart',
    'chart-radar-grid-circle-fill': 'Radar Chart - Grid Circle Filled',
    'chart-radar-grid-circle-no-lines': 'Radar Chart - Grid Circle - No lines',
    'chart-radar-grid-fill': 'Radar Chart - Grid Filled',
    'chart-radar-label-custom': 'Radar Chart - Custom Label',
    'chart-radar-radius': 'Radar Chart - Radius Axis',
    'chart-radial-simple': 'Radial Chart',
    'chart-tooltip-indicator-line': 'Tooltip - Line Indicator',
    'chart-tooltip-indicator-none': 'Tooltip - No Indicator',
    'chart-tooltip-label-custom': 'Tooltip - Custom label',
    'chart-tooltip-label-none': 'Tooltip - No Label',
  }
  if (overrides[name]) return overrides[name]
  const [, family, ...variant] = name.split('-')
  const chartType =
    family === 'tooltip' ? 'Tooltip' : `${titleCase(family)} Chart`
  return `${chartType} - ${variant.map(titleCase).join(' ')}`
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
