import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { build } from 'esbuild'

const target = process.argv[2]

if (!target) {
  throw new TypeError('Expected an output path')
}

const entry = `
import {
  areaY,
  barY,
  createChartScene,
  defineChart,
  dot,
  lineY,
  link,
  renderChartSvg,
  ruleY,
} from './packages/charts-core/src/index.ts'
import { scaleBand, scaleLinear, scaleSqrt } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import { d3Curve } from './packages/charts-core/src/index.ts'

declare const emit: (assets: Record<string, string>) => void

const curve = d3Curve(curveMonotoneX)

const heroData = Array.from({ length: 24 }, (_value, index) => ({
  id: \`primary-\${index}\`,
  x: index,
  y:
    24 +
    index * 2.3 +
    Math.sin(index * 0.8) * 7 +
    (index > 14 ? (index - 14) * 1.7 : 0),
}))
const comparisonData = Array.from({ length: 24 }, (_value, index) => ({
  id: \`comparison-\${index}\`,
  x: index,
  y: 33 + index * 1.45 + Math.cos(index * 0.62) * 4,
}))
const heroEvents = [6, 15, 21].map((index) => heroData[index])

const heroChart = defineChart({
  marks: [
    areaY(heroData, {
      id: 'hero-area',
      x: 'x',
      y: 'y',
      fill: '#2563eb',
      fillOpacity: 0.2,
      curve,
    }),
    ruleY([70], {
      id: 'hero-target',
      stroke: '#f97316',
      strokeOpacity: 0.85,
      strokeWidth: 1.5,
      strokeDasharray: '6 8',
    }),
    lineY(comparisonData, {
      id: 'hero-comparison',
      x: 'x',
      y: 'y',
      stroke: '#f97316',
      strokeOpacity: 0.8,
      strokeWidth: 2,
      strokeDasharray: '3 7',
      curve,
    }),
    lineY(heroData, {
      id: 'hero-line',
      x: 'x',
      y: 'y',
      key: 'id',
      stroke: '#60a5fa',
      strokeWidth: 4,
      curve,
    }),
    dot(heroEvents, {
      id: 'hero-events',
      x: 'x',
      y: 'y',
      key: 'id',
      fill: '#f97316',
      stroke: '#ffffff',
      strokeWidth: 2,
      r: 6,
    }),
  ],
  x: {
    scale: scaleLinear().domain([0, 23]),
  },
  y: {
    scale: scaleLinear().domain([0, 105]),
  },
  guides: false,
  margin: 28,
})

const barData = Array.from({ length: 22 }, (_value, index) => ({
  id: String(index),
  value: 18 + ((index * 37 + index * index * 7) % 79),
}))
const barsChart = defineChart({
  marks: [
    barY(barData, {
      id: 'atlas-bars',
      x: 'id',
      y: 'value',
      key: 'id',
      inset: 2,
      radius: 3,
      fill: (datum) =>
        datum.value > 78
          ? '#f97316'
          : datum.value > 52
            ? '#60a5fa'
            : '#2563eb',
    }),
  ],
  x: {
    scale: scaleBand<string>()
      .domain(barData.map((datum) => datum.id))
      .padding(0.08),
  },
  y: {
    scale: scaleLinear().domain([0, 100]),
  },
  guides: false,
  margin: 12,
})

const scatterData = Array.from({ length: 54 }, (_value, index) => {
  const x = 8 + ((index * 29) % 87)
  const drift = Math.sin(index * 2.17) * 19 + Math.cos(index * 0.71) * 9
  return {
    id: String(index),
    x,
    y: Math.max(7, Math.min(94, 16 + x * 0.63 + drift)),
    radius: 3 + ((index * 11) % 16),
    group: index % 9 === 0 ? 'signal' : index % 4 === 0 ? 'warm' : 'base',
  }
})
const scatterChart = defineChart({
  marks: [
    dot(
      scatterData.filter((datum) => datum.group === 'base'),
      {
        id: 'atlas-scatter-base',
        x: 'x',
        y: 'y',
        key: 'id',
        r: 'radius',
        rScale: scaleSqrt().domain([3, 18]).range([2.5, 8.5]),
        fill: '#3b82f6',
        fillOpacity: 0.7,
      },
    ),
    dot(
      scatterData.filter((datum) => datum.group === 'warm'),
      {
        id: 'atlas-scatter-warm',
        x: 'x',
        y: 'y',
        key: 'id',
        r: 'radius',
        rScale: scaleSqrt().domain([3, 18]).range([2.5, 8.5]),
        fill: '#fb923c',
        fillOpacity: 0.85,
      },
    ),
    dot(
      scatterData.filter((datum) => datum.group === 'signal'),
      {
        id: 'atlas-scatter-signal',
        x: 'x',
        y: 'y',
        key: 'id',
        r: 'radius',
        rScale: scaleSqrt().domain([3, 18]).range([3.5, 10]),
        fill: '#2dd4bf',
        stroke: '#ffffff',
        strokeWidth: 1.5,
      },
    ),
  ],
  x: {
    scale: scaleLinear().domain([0, 100]),
  },
  y: {
    scale: scaleLinear().domain([0, 100]),
  },
  guides: false,
  margin: 18,
})

const networkNodes = [
  { id: 'core', x: 49, y: 51, group: 'core', radius: 14 },
  { id: 'a', x: 19, y: 20, group: 'blue', radius: 8 },
  { id: 'b', x: 35, y: 22, group: 'blue', radius: 6 },
  { id: 'c', x: 72, y: 18, group: 'orange', radius: 9 },
  { id: 'd', x: 86, y: 34, group: 'orange', radius: 6 },
  { id: 'e', x: 77, y: 61, group: 'orange', radius: 8 },
  { id: 'f', x: 84, y: 82, group: 'green', radius: 6 },
  { id: 'g', x: 58, y: 84, group: 'green', radius: 9 },
  { id: 'h', x: 32, y: 80, group: 'green', radius: 7 },
  { id: 'i', x: 14, y: 64, group: 'blue', radius: 6 },
  { id: 'j', x: 25, y: 46, group: 'blue', radius: 8 },
  { id: 'k', x: 59, y: 33, group: 'orange', radius: 5 },
  { id: 'l', x: 63, y: 65, group: 'green', radius: 5 },
]
const nodeById = new Map(networkNodes.map((node) => [node.id, node]))
const edgePairs = [
  ['core', 'a'],
  ['core', 'b'],
  ['core', 'c'],
  ['core', 'e'],
  ['core', 'g'],
  ['core', 'h'],
  ['core', 'i'],
  ['core', 'j'],
  ['core', 'k'],
  ['core', 'l'],
  ['a', 'b'],
  ['a', 'j'],
  ['c', 'd'],
  ['c', 'k'],
  ['d', 'e'],
  ['e', 'f'],
  ['e', 'l'],
  ['f', 'g'],
  ['g', 'h'],
  ['g', 'l'],
  ['h', 'i'],
  ['i', 'j'],
] as const
const networkEdges = edgePairs.map(([sourceId, targetId]) => {
  const source = nodeById.get(sourceId)
  const target = nodeById.get(targetId)
  if (!source || !target) {
    throw new TypeError('Unknown network node')
  }
  return {
    id: \`\${sourceId}-\${targetId}\`,
    x1: source.x,
    y1: source.y,
    x2: target.x,
    y2: target.y,
  }
})
const networkChart = defineChart({
  marks: [
    link(networkEdges, {
      id: 'atlas-network-links',
      x1: 'x1',
      y1: 'y1',
      x2: 'x2',
      y2: 'y2',
      key: 'id',
      stroke: '#475569',
      strokeOpacity: 0.7,
      strokeWidth: 1.5,
    }),
    dot(
      networkNodes.filter((node) => node.group === 'blue'),
      {
        id: 'atlas-network-blue',
        x: 'x',
        y: 'y',
        key: 'id',
        r: 'radius',
        fill: '#3b82f6',
        stroke: '#bfdbfe',
        strokeWidth: 1.5,
      },
    ),
    dot(
      networkNodes.filter((node) => node.group === 'orange'),
      {
        id: 'atlas-network-orange',
        x: 'x',
        y: 'y',
        key: 'id',
        r: 'radius',
        fill: '#f97316',
        stroke: '#fed7aa',
        strokeWidth: 1.5,
      },
    ),
    dot(
      networkNodes.filter((node) => node.group === 'green'),
      {
        id: 'atlas-network-green',
        x: 'x',
        y: 'y',
        key: 'id',
        r: 'radius',
        fill: '#14b8a6',
        stroke: '#99f6e4',
        strokeWidth: 1.5,
      },
    ),
    dot(
      networkNodes.filter((node) => node.group === 'core'),
      {
        id: 'atlas-network-core',
        x: 'x',
        y: 'y',
        key: 'id',
        r: 'radius',
        fill: '#f8fafc',
        stroke: '#60a5fa',
        strokeWidth: 4,
      },
    ),
  ],
  x: {
    scale: scaleLinear().domain([0, 100]),
  },
  y: {
    scale: scaleLinear().domain([0, 100]),
  },
  guides: false,
  margin: 22,
})

const streamLayers = [0, 1, 2].map((layer) =>
  Array.from({ length: 40 }, (_value, index) => {
    const values = [
      9 + Math.sin(index * 0.38) * 4 + Math.sin(index * 0.12) * 3,
      12 + Math.cos(index * 0.3 + 1.1) * 5 + Math.sin(index * 0.17) * 2,
      8 + Math.sin(index * 0.26 + 2.3) * 3 + Math.cos(index * 0.16) * 3,
    ]
    const total = values[0] + values[1] + values[2]
    const base = -total / 2
    const y1 = base + values.slice(0, layer).reduce((sum, value) => sum + value, 0)
    return {
      id: \`\${layer}-\${index}\`,
      x: index,
      y1,
      y2: y1 + values[layer],
    }
  }),
)
const streamChart = defineChart({
  marks: [
    areaY(streamLayers[0], {
      id: 'atlas-stream-blue',
      x: 'x',
      y1: 'y1',
      y2: 'y2',
      key: 'id',
      fill: '#2563eb',
      fillOpacity: 0.9,
      curve,
    }),
    areaY(streamLayers[1], {
      id: 'atlas-stream-cyan',
      x: 'x',
      y1: 'y1',
      y2: 'y2',
      key: 'id',
      fill: '#2dd4bf',
      fillOpacity: 0.82,
      curve,
    }),
    areaY(streamLayers[2], {
      id: 'atlas-stream-orange',
      x: 'x',
      y1: 'y1',
      y2: 'y2',
      key: 'id',
      fill: '#f97316',
      fillOpacity: 0.88,
      curve,
    }),
  ],
  x: {
    scale: scaleLinear().domain([0, 39]),
  },
  y: {
    scale: scaleLinear().domain([-22, 22]),
  },
  guides: false,
  margin: 18,
})

function render(definition: Parameters<typeof createChartScene>[0], width: number, height: number, label: string) {
  return renderChartSvg(createChartScene(definition, { width, height }), {
    ariaLabel: label,
    tabIndex: -1,
  })
}

emit({
  chartsHeroSvg: render(
    heroChart,
    1200,
    560,
    'Layered product activity with a target, comparison, and release events',
  ),
  chartsBarsSvg: render(
    barsChart,
    680,
    360,
    'Variable bars highlighting high values',
  ),
  chartsScatterSvg: render(
    scatterChart,
    680,
    360,
    'Scatterplot with varying point size and three signal groups',
  ),
  chartsNetworkSvg: render(
    networkChart,
    680,
    360,
    'Connected service network with three clusters',
  ),
  chartsStreamSvg: render(
    streamChart,
    680,
    360,
    'Three flowing stacked area bands',
  ),
})
`

const result = await build({
  stdin: {
    contents: entry,
    loader: 'ts',
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node24',
  write: false,
})

let assets
const source = new TextDecoder().decode(result.outputFiles[0].contents)
const run = new Function('require', 'emit', source)
run(createRequire(import.meta.url), (generatedAssets) => {
  assets = generatedAssets
})

if (!assets) {
  throw new TypeError('The chart asset generator returned no assets')
}

const exports = Object.entries(assets)
  .map(
    ([name, svg]) =>
      `export const ${name} = ${JSON.stringify(svg)}\n`,
  )
  .join('\n')

writeFileSync(
  target,
  `// Generated from the TanStack Charts renderer. Run from the Charts repository.\n${exports}`,
)
