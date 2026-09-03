import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { autoType, csvParse, csvParseRows } from 'd3-dsv'

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = resolve(workspace, 'packages/charts-demo-data/src')
const check = process.argv.includes('--check')
const packageVersion = '1.0.1'
const packageRevision = '732c0148de741469b2bcc03f53d93b0ad0b93f0a'
const packageRepository = 'https://github.com/observablehq/sample-datasets'
const plotRevision = '356f579b1d947ee05a914420eddff0f29cee300a'
const plotRepository = 'https://github.com/observablehq/plot'
const plotDataDirectory = resolve(
  workspace,
  'packages/charts-demo-data/raw/observable-plot',
)
// Object literals expand large CSV snapshots by 2–3×. Keep large snapshots as
// compact source text, then parse them with the package's CSP-safe row parser
// and a generated static object mapper.
const compactCsvThreshold = 64 * 1024

const datasets = [
  {
    id: 'aapl',
    title: 'Apple daily stock prices',
    file: 'aapl.csv',
    source: 'Yahoo! Finance',
    sourceUrl: 'https://finance.yahoo.com/lookup',
  },
  {
    id: 'alphabet',
    title: 'English letter frequencies',
    file: 'alphabet.csv',
    source: 'Cryptographical Mathematics by Robert Edward Lewand',
    sourceUrl: 'http://cs.wellesley.edu/~fturbak/codman/letterfreq.html',
  },
  {
    id: 'cars',
    title: '1983 ASA automobile data',
    file: 'cars.csv',
    source: '1983 ASA Data Exposition',
    sourceUrl: 'http://lib.stat.cmu.edu/datasets/',
  },
  {
    id: 'citywages',
    title: 'U.S. metropolitan wage inequality',
    file: 'citywages.csv',
    source: 'The New York Times',
    sourceUrl:
      'https://www.nytimes.com/2019/12/02/upshot/wealth-poverty-divide-american-cities.html',
  },
  {
    id: 'diamonds',
    title: 'ggplot2 diamonds',
    file: 'diamonds.csv',
    source: 'ggplot2',
    sourceUrl:
      'https://github.com/tidyverse/ggplot2/blob/master/data-raw/diamonds.csv',
  },
  {
    id: 'flare',
    title: 'Flare package hierarchy',
    file: 'flare.csv',
    source: 'Flare visualization toolkit',
    sourceUrl: 'https://observablehq.com/@d3/treemap',
  },
  {
    id: 'industries',
    title: 'U.S. industry unemployment',
    file: 'industries.csv',
    source: 'U.S. Bureau of Labor Statistics',
    sourceUrl: 'https://www.bls.gov/',
  },
  {
    id: 'miserables',
    title: 'Les Misérables character network',
    file: 'miserables.json',
    source: 'Donald Knuth, Stanford Graph Base',
    sourceUrl: 'https://www-cs-faculty.stanford.edu/~knuth/sgb.html',
  },
  {
    id: 'olympians',
    title: '2016 Summer Olympians',
    file: 'olympians.csv',
    source: 'Matt Riggott / IOC',
    sourceUrl: 'https://www.flother.is/2017/olympic-games-data/',
  },
  {
    id: 'penguins',
    title: 'Palmer penguins',
    file: 'penguins.csv',
    source: 'Dr. Kristen Gorman / Palmer Station LTER',
    sourceUrl: 'https://github.com/allisonhorst/palmerpenguins',
  },
  {
    id: 'pizza',
    title: 'Pizza Paradise orders',
    file: 'pizza.csv',
    source: 'Observable Pizza Paradise',
    sourceUrl: 'https://observablehq.com/@observablehq/pizza-paradise-data',
  },
  {
    id: 'weather',
    title: 'Seattle weather observations',
    file: 'weather.csv',
    source: 'NOAA / Vega',
    sourceUrl:
      'https://github.com/vega/vega-datasets/blob/master/scripts/weather.py',
  },
  {
    id: 'westport-house',
    title: 'Westport House second-floor plan',
    file: 'westport-house.json',
    origin: 'plot',
    source: 'WRLD indoor maps API',
    sourceUrl: 'https://github.com/wrld3d/wrld-indoor-maps-api',
  },
  {
    id: 'anscombe',
    title: "Anscombe's quartet",
    file: 'anscombe.csv',
    origin: 'plot',
    source: "Anscombe's quartet",
    sourceUrl: 'https://en.wikipedia.org/wiki/Anscombe%27s_quartet',
  },
  {
    id: 'beagle',
    title: 'HMS Beagle voyage',
    file: 'beagle.csv',
    origin: 'plot',
    parser: 'csv-rows',
    source: "Charles Darwin's voyage on the HMS Beagle",
    sourceUrl:
      'https://observablehq.com/@bmschmidt/data-driven-projections-darwins-world',
  },
  {
    id: 'crimean-war',
    title: 'Crimean War monthly mortality',
    file: 'crimean-war.csv',
    origin: 'plot',
    source: 'Florence Nightingale',
    sourceUrl: 'https://archive.org/details/b21304110/page/n11/mode/2up',
  },
  {
    id: 'decathlon',
    title: 'Decathlon results',
    file: 'decathlon.csv',
    origin: 'plot',
    source: 'JMP Statistical Discovery sample',
    sourceUrl:
      'https://github.com/hemanrobinson/preattentive/blob/a58dd4795d0ee063a38a2d7bf33812d969ca6256/src/Data.js#L5598-L5650',
  },
  {
    id: 'downloads',
    title: 'Observable package downloads',
    file: 'downloads.csv',
    origin: 'plot',
    source: 'npm downloads API',
    sourceUrl:
      'https://observablehq.com/@mbostock/npm-daily-downloads?name=@observablehq/cars',
  },
  {
    id: 'learning-poverty',
    title: 'Learning poverty by country',
    file: 'learning-poverty.csv',
    origin: 'plot',
    source: 'World Bank / Our World in Data',
    sourceUrl:
      'https://ourworldindata.org/grapher/share-of-children-who-cannot-read-at-end-of-primary-age',
  },
  {
    id: 'driving',
    title: 'U.S. driving and gasoline prices',
    file: 'driving.csv',
    origin: 'plot',
    source: 'The New York Times',
    sourceUrl:
      'https://archive.nytimes.com/www.nytimes.com/imagepages/2010/05/02/business/02metrics.html',
  },
  {
    id: 'morley',
    title: 'Michelson speed-of-light experiments',
    file: 'morley.csv',
    origin: 'plot',
    source: 'R datasets / Michelson–Morley experiment',
    sourceUrl:
      'https://github.com/vincentarelbundock/Rdatasets/blob/master/csv/datasets/morley.csv',
  },
  {
    id: 'sf-temperatures',
    title: 'San Francisco daily temperatures',
    file: 'sf-temperatures.csv',
    origin: 'plot',
    source: 'National Climatic Data Center',
    sourceUrl: 'https://www.ncdc.noaa.gov/',
  },
  {
    id: 'simpsons',
    title: 'The Simpsons episode ratings',
    file: 'simpsons.csv',
    origin: 'plot',
    source: 'IMDb / Todd W. Schneider',
    sourceUrl: 'https://data.world/data-society/the-simpsons-by-the-data',
  },
  {
    id: 'survey',
    title: 'Likert survey responses',
    file: 'survey.csv',
    origin: 'plot',
    source: 'Eitan Lees',
    sourceUrl:
      'https://talk.observablehq.com/t/diverging-stacked-bar-chart-in-plot/6028',
  },
  {
    id: 'travelers',
    title: 'U.S. airport traveler throughput',
    file: 'travelers.csv',
    origin: 'plot',
    source: 'U.S. Transportation Security Administration',
    sourceUrl: 'https://www.tsa.gov/coronavirus/passenger-throughput',
  },
  {
    id: 'us-county-unemployment',
    title: 'U.S. county unemployment',
    file: 'us-county-unemployment.csv',
    origin: 'plot',
    source: 'U.S. Bureau of Labor Statistics',
    sourceUrl: 'https://www.bls.gov/lau/tables.htm',
  },
  {
    id: 'wind',
    title: 'Gridded surface wind',
    file: 'wind.csv',
    origin: 'plot',
    source: 'Remote Sensing Systems / giCentre',
    sourceUrl:
      'https://github.com/gicentre/litvis/blob/main/examples/windVectors.md',
  },
]

let changed = false
const metadata = []

for (const dataset of datasets) {
  const fromPlot = dataset.origin === 'plot'
  const sourcePath = fromPlot
    ? resolve(plotDataDirectory, dataset.file)
    : fileURLToPath(
        import.meta.resolve(`@observablehq/sample-datasets/${dataset.file}`),
      )
  const source = await readFile(sourcePath, 'utf8')
  const value = normalizeMissingValues(
    dataset.parser === 'csv-rows'
      ? csvParseRows(source, (row) => row.map(Number))
      : dataset.file.endsWith('.csv')
        ? csvParse(source, autoType)
        : JSON.parse(source),
  )
  const records = Array.isArray(value)
    ? value.length
    : (value.features?.length ?? 0) +
      (value.nodes?.length ?? 0) +
      (value.links?.length ?? 0)
  const fields = Array.isArray(value)
    ? Object.keys(value[0] ?? {})
    : Object.keys(value)
  const schema = Array.isArray(value)
    ? inferSchema(value)
    : fields.map((name) => ({
        name,
        types: [Array.isArray(value[name]) ? 'array' : typeof value[name]],
      }))
  const identifier = camelCase(dataset.id)
  const rowType = `${pascalCase(dataset.id)}Row`
  const js = generatedJavaScript(identifier, value, dataset, source)
  const declaration =
    dataset.id === 'miserables'
      ? miserablesDeclaration()
      : dataset.id === 'beagle'
        ? beagleDeclaration()
        : dataset.id === 'westport-house'
          ? westportHouseDeclaration()
          : generatedDeclaration(identifier, rowType, value)

  const jsChanged = await writeGenerated(`${dataset.id}.js`, js)
  const declarationChanged = await writeGenerated(
    `${dataset.id}.d.ts`,
    declaration,
  )
  changed = jsChanged || declarationChanged || changed

  metadata.push({
    id: dataset.id,
    title: dataset.title,
    specifier: `@tanstack/charts-data/${dataset.id}`,
    format: dataset.file.endsWith('.csv') ? 'CSV' : 'JSON',
    records,
    fields,
    schema,
    bytes: Buffer.byteLength(source),
    sha256: createHash('sha256').update(source).digest('hex'),
    selection: 'Complete published snapshot',
    source: dataset.source,
    sourceUrl: dataset.sourceUrl,
    observablePackage: fromPlot
      ? `observablehq/plot@${plotRevision.slice(0, 12)}`
      : `@observablehq/sample-datasets@${packageVersion}`,
    observableRevision: fromPlot ? plotRevision : packageRevision,
    observableFile: fromPlot ? `test/data/${dataset.file}` : dataset.file,
    observableUrl: fromPlot
      ? `${plotRepository}/blob/${plotRevision}/test/data/${dataset.file}`
      : `${packageRepository}/blob/${packageRevision}/${dataset.file}`,
    license: fromPlot
      ? 'Observable Plot repository ISC; upstream source credited'
      : 'ISC distribution; upstream source credited',
  })
}

const metadataJavaScriptChanged = await writeGenerated(
  'metadata.js',
  metadataJavaScript(metadata),
)
const metadataDeclarationChanged = await writeGenerated(
  'metadata.d.ts',
  metadataDeclaration(),
)
changed = metadataJavaScriptChanged || metadataDeclarationChanged || changed

if (check && changed) {
  throw new Error(
    'Generated demo data is stale. Run pnpm demo-data:sync and commit the result.',
  )
}

console.log(
  check
    ? `Demo data matches ${datasets.length} pinned Observable datasets.`
    : `Synchronized ${datasets.length} Observable datasets.`,
)

async function writeGenerated(name, contents) {
  const path = resolve(outputDirectory, name)
  let current = null
  try {
    current = await readFile(path, 'utf8')
  } catch {}
  if (current === contents) return false
  if (!check) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, contents)
  }
  return true
}

function generatedJavaScript(identifier, value, dataset, source) {
  if (
    dataset.file.endsWith('.csv') &&
    Buffer.byteLength(source) > compactCsvThreshold
  ) {
    return compactCsvJavaScript(identifier, value, dataset, source)
  }
  return `// Generated by scripts/sync-demo-data.mjs from ${dataset.file}.\n// Do not edit this file directly.\nexport const ${identifier} = ${serialize(value)}\n`
}

function compactCsvJavaScript(identifier, rows, dataset, source) {
  if (dataset.parser === 'csv-rows') {
    return `// Generated by scripts/sync-demo-data.mjs from ${dataset.file}.\n// Do not edit this file directly.\nimport { parseCsvRows } from './parse-csv.js'\n\nconst source = ${JSON.stringify(source)}\n\nexport const ${identifier} = parseCsvRows(source, (row) => row.map(Number))\n`
  }

  const fields = Object.keys(rows[0] ?? {})
  const properties = fields
    .map(
      (field, index) =>
        `${propertyName(field)}: autoTypeValue(row[${index}] ?? '')`,
    )
    .join(', ')

  return `// Generated by scripts/sync-demo-data.mjs from ${dataset.file}.\n// Do not edit this file directly.\nimport { autoTypeValue, parseCsvRows } from './parse-csv.js'\n\nconst source = ${JSON.stringify(source)}\n\nexport const ${identifier} = parseCsvRows(source).slice(1).map((row) => ({${properties}}))\n`
}

function generatedDeclaration(identifier, rowType, rows) {
  const properties = inferSchema(rows)
    .map(
      ({ name, types }) =>
        `  readonly ${propertyName(name)}: ${types.join(' | ')}`,
    )
    .join('\n')
  return `// Generated by scripts/sync-demo-data.mjs.\n// Do not edit this file directly.\nexport interface ${rowType} {\n${properties}\n}\n\nexport declare const ${identifier}: readonly ${rowType}[]\n`
}

function miserablesDeclaration() {
  return `// Generated by scripts/sync-demo-data.mjs.\n// Do not edit this file directly.\nexport interface MiserablesNode {\n  readonly id: string\n  readonly group: number\n}\n\nexport interface MiserablesLink {\n  readonly source: string\n  readonly target: string\n  readonly value: number\n}\n\nexport interface MiserablesGraph {\n  readonly nodes: readonly MiserablesNode[]\n  readonly links: readonly MiserablesLink[]\n}\n\nexport declare const miserables: MiserablesGraph\n`
}

function beagleDeclaration() {
  return `// Generated by scripts/sync-demo-data.mjs.\n// Do not edit this file directly.\nexport type BeagleRow = readonly [longitude: number, latitude: number]\n\nexport declare const beagle: readonly BeagleRow[]\n`
}

function westportHouseDeclaration() {
  return `// Generated by scripts/sync-demo-data.mjs.\n// Do not edit this file directly.\nexport interface WestportHouseProperties {\n  readonly id: number\n  readonly type: string\n  readonly name: string | null\n  readonly roomnumber: string | null\n}\n\nexport interface WestportHouseFeature {\n  readonly type: 'Feature'\n  readonly properties: WestportHouseProperties\n  readonly geometry: {\n    readonly type: 'Polygon'\n    readonly coordinates: [number, number][][]\n  }\n}\n\nexport interface WestportHouseCollection {\n  readonly type: 'FeatureCollection'\n  readonly features: WestportHouseFeature[]\n}\n\nexport declare const westportHouse: WestportHouseCollection\n`
}

function metadataJavaScript(value) {
  return `// Generated by scripts/sync-demo-data.mjs.\n// Do not edit this file directly.\nexport const demoDatasetMetadata = ${serialize(value)}\n\nconst metadataBySpecifier = new Map(\n  demoDatasetMetadata.map((dataset) => [dataset.specifier, dataset]),\n)\n\nexport function demoDatasetForSpecifier(specifier) {\n  return metadataBySpecifier.get(specifier) ?? null\n}\n`
}

function metadataDeclaration() {
  return `// Generated by scripts/sync-demo-data.mjs.\n// Do not edit this file directly.\nexport interface DemoDatasetMetadata {\n  readonly id: string\n  readonly title: string\n  readonly specifier: string\n  readonly format: 'CSV' | 'JSON'\n  readonly records: number\n  readonly fields: readonly string[]\n  readonly schema: readonly {\n    readonly name: string\n    readonly types: readonly string[]\n  }[]\n  readonly bytes: number\n  readonly sha256: string\n  readonly selection: string\n  readonly source: string\n  readonly sourceUrl: string\n  readonly observablePackage: string\n  readonly observableRevision: string\n  readonly observableFile: string\n  readonly observableUrl: string\n  readonly license: string\n}\n\nexport declare const demoDatasetMetadata: readonly DemoDatasetMetadata[]\nexport declare function demoDatasetForSpecifier(\n  specifier: string,\n): DemoDatasetMetadata | null\n`
}

function serialize(value) {
  if (value instanceof Date)
    return `new Date(${JSON.stringify(value.toISOString())})`
  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    return `[\n${value.map((entry) => `  ${serialize(entry)}`).join(',\n')},\n]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
    return `{${entries
      .map(([key, entry]) => `${propertyName(key)}: ${serialize(entry)}`)
      .join(', ')}}`
  }
  return JSON.stringify(value)
}

function normalizeMissingValues(value) {
  if (typeof value === 'number' && !Number.isFinite(value)) return null
  if (value instanceof Date) return value
  if (Array.isArray(value)) return value.map(normalizeMissingValues)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        normalizeMissingValues(entry),
      ]),
    )
  }
  return value
}

function propertyName(value) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(value)
    ? value
    : JSON.stringify(value)
}

function typeName(value) {
  if (value === null) return 'null'
  if (value instanceof Date) return 'Date'
  return typeof value
}

function inferSchema(rows) {
  const fields = new Map()
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const types = fields.get(key) ?? new Set()
      types.add(typeName(value))
      fields.set(key, types)
    }
  }
  return [...fields].map(([name, types]) => ({
    name,
    types: [...types].sort(compareTypes),
  }))
}

function compareTypes(left, right) {
  const order = [
    'string',
    'number',
    'boolean',
    'Date',
    'array',
    'object',
    'null',
  ]
  const leftIndex = order.indexOf(left)
  const rightIndex = order.indexOf(right)
  return (
    (leftIndex === -1 ? order.length : leftIndex) -
      (rightIndex === -1 ? order.length : rightIndex) ||
    left.localeCompare(right)
  )
}

function pascalCase(value) {
  return value
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join('')
}

function camelCase(value) {
  const result = pascalCase(value)
  return `${result[0]?.toLowerCase() ?? ''}${result.slice(1)}`
}
