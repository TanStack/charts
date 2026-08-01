import * as React from 'react'
import {
  areaY,
  barX,
  barY,
  createMark,
  defineChart,
  dot,
  rect,
  stack,
  type ChartFocusAffinity,
  type ChartFocusStrategy,
  type ChartPoint,
  type ChartRenderContext,
  type ChartScene,
  type SceneNode,
  type StaticChartDefinition,
} from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/react-charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import proofSource from './InteractionGeometryLab.tsx?raw'

export interface ProofDatum {
  id: string
  label: string
  x?: number
  y?: number
  x1?: number
  x2?: number
  y1?: number
  y2?: number
  value?: number
  series?: string
  radius?: number
  polygon?: readonly (readonly [number, number])[]
  probe?: readonly [number, number]
  color?: string
}

interface ProofCase {
  id: string
  title: string
  affinity: ChartFocusAffinity
  explanation: string
  beforeExpected: string
  afterExpected: string
  source: string
  before: StaticChartDefinition<ProofDatum, number, number>
  after: StaticChartDefinition<ProofDatum, number, number>
  probe: (
    scene: ChartScene<ProofDatum, number, number>,
  ) => { x: number; y: number } | null
}

const legacyPointFocus: ChartFocusStrategy<ProofDatum, number, number> = {
  resolve(points, x, y, maxDistance) {
    let nearest: ChartPoint<ProofDatum, number, number> | undefined
    let nearestDistance = Number.POSITIVE_INFINITY
    for (const point of points) {
      const distance = (point.x - x) ** 2 + (point.y - y) ** 2
      if (distance < nearestDistance) {
        nearest = point
        nearestDistance = distance
      }
    }
    return nearest && nearestDistance <= Math.max(0, maxDistance) ** 2
      ? [nearest]
      : []
  },
  group(_points, point) {
    return [point]
  },
  navigation(points) {
    return points
  },
}

export const proofCases = createProofCases()

export function InteractionGeometryLab() {
  return (
    <main className="hit-region-proof">
      <header className="hit-region-proof__header">
        <h1>Interaction geometry</h1>
        <p>
          Each comparison uses the same pointer position and 48px threshold.
          Before measures from a mark’s anchor point. After tests its painted
          shape first, then uses the mark’s natural interaction axis.
        </p>
      </header>

      <div className="hit-region-proof__gallery">
        {proofCases.map((proof) => (
          <section
            className="hit-region-proof__case"
            key={proof.id}
            data-proof-case={proof.id}
          >
            <header className="hit-region-proof__case-header">
              <h2>{proof.title}</h2>
              <code>fallback: {proof.affinity}</code>
            </header>
            <p className="hit-region-proof__case-description">
              {proof.explanation}
            </p>
            <div
              className="hit-region-proof__grid"
              aria-label={`${proof.title} before and after`}
            >
              <ProofChart proof={proof} mode="before" />
              <ProofChart proof={proof} mode="after" />
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}

function SourceIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m6 3-5 5 5 5M10 3l5 5-5 5" />
    </svg>
  )
}

function ProofChart({
  proof,
  mode,
}: {
  proof: ProofCase
  mode: 'before' | 'after'
}) {
  const [focused, setFocused] = React.useState<ProofDatum | null>(null)
  const [probe, setProbe] = React.useState<{ x: number; y: number } | null>(
    null,
  )
  const onRender = React.useCallback(
    (context: ChartRenderContext<ProofDatum, number, number>) => {
      const next = proof.probe(context.scene)
      if (!next) return
      setProbe((current) =>
        current && current.x === next.x && current.y === next.y
          ? current
          : next,
      )
    },
    [proof],
  )
  const expected =
    mode === 'before' ? proof.beforeExpected : proof.afterExpected
  const actual = focused?.label ?? 'Nothing focused yet'

  return (
    <article
      className={`hit-region-proof__card hit-region-proof__card--${mode}`}
      data-proof-chart={`${proof.id}-${mode}`}
    >
      <div className="hit-region-proof__card-header">
        <span className="hit-region-proof__badge">{mode}</span>
        <span className="hit-region-proof__distance">48px</span>
      </div>

      <div className="hit-region-proof__chart">
        <Chart
          definition={mode === 'before' ? proof.before : proof.after}
          height={230}
          initialWidth={520}
          ariaLabel={`${proof.title}: ${mode}`}
          onFocusChange={(point) => setFocused(point?.datum ?? null)}
          onRender={onRender}
        />
        {probe ? (
          <div
            className="hit-region-proof__probe"
            data-proof-probe={`${proof.id}-${mode}`}
            style={{ left: probe.x, top: probe.y }}
            aria-hidden="true"
          >
            <span />
          </div>
        ) : null}
      </div>

      <dl className="hit-region-proof__result">
        <div>
          <dt>Expected</dt>
          <dd>{expected}</dd>
        </div>
        <div>
          <dt>Actually focused</dt>
          <dd data-proof-result={`${proof.id}-${mode}`}>{actual}</dd>
        </div>
      </dl>

      <ChartSourceDisclosure proof={proof} mode={mode} />
    </article>
  )
}

function ChartSourceDisclosure({
  proof,
  mode,
}: {
  proof: ProofCase
  mode: 'before' | 'after'
}) {
  const source = sourceForMode(proof.source, mode)

  return (
    <details className="hit-region-proof__source">
      <summary>
        <span>
          <SourceIcon />
          Source
        </span>
        <span className="hit-region-proof__source-meta">
          {lineCount(source).toLocaleString('en-US')} lines · {mode}
        </span>
      </summary>
      <pre>
        <code>{source}</code>
      </pre>
    </details>
  )
}

function sourceForMode(source: string, mode: 'before' | 'after') {
  const baseName = /const (\w+Base)\s*=/.exec(source)?.[1] ?? 'base'
  const focus = mode === 'before' ? ', legacyPointFocus' : ''
  const helpers = source.includes('normalizedRectMark(')
    ? [sourceSection('normalized-rect-mark')]
    : source.includes('normalizedPolygonMark(')
      ? [sourceSection('normalized-polygon-mark')]
      : []
  if (source.includes('polarGuideMark(')) {
    helpers.unshift(sourceSection('polar-guide-mark'))
  }
  return [
    source,
    ...helpers,
    `const ${mode}Definition = interactiveDefinition(${baseName}${focus})`,
  ].join('\n\n')
}

function sourceSection(id: string) {
  const startMarker = `// source:${id}:start`
  const endMarker = `// source:${id}:end`
  const start = proofSource.indexOf(startMarker)
  const end = proofSource.indexOf(endMarker)
  if (start < 0 || end <= start) {
    throw new TypeError(`Missing proof source section: ${id}`)
  }
  return proofSource
    .slice(start + startMarker.length, end)
    .trim()
    .replace(/^ {2}/gm, '')
}

function lineCount(source: string) {
  return source ? source.split('\n').length : 0
}

function createProofCases(): ProofCase[] {
  // source:stacked-bars:start
  const stackedMonths = [
    { month: 'May', disease: 86, wounds: 26, other: 14 },
    { month: 'June', disease: 80, wounds: 31, other: 11 },
    { month: 'July', disease: 92, wounds: 25, other: 18 },
    { month: 'August', disease: 84, wounds: 34, other: 12 },
    { month: 'September', disease: 72, wounds: 29, other: 16 },
    { month: 'October', disease: 210, wounds: 96, other: 48 },
    { month: 'November', disease: 76, wounds: 35, other: 15 },
    { month: 'December', disease: 88, wounds: 28, other: 20 },
    { month: 'January', disease: 81, wounds: 32, other: 17 },
    { month: 'February', disease: 94, wounds: 27, other: 13 },
    { month: 'March', disease: 85, wounds: 30, other: 19 },
  ] as const
  const stackedSeries = ['disease', 'wounds', 'other'] as const
  const verticalBars = stackedMonths.flatMap((month, x) =>
    stackedSeries.map((series) => ({
      id: `${month.month.toLowerCase()}-${series}`,
      label: `${month.month} · ${series} · ${month[series]}`,
      x,
      y: month[series],
      series,
    })),
  ) satisfies ProofDatum[]
  const verticalBase = baseDefinition(
    [
      barY(verticalBars, {
        id: 'vertical-bars',
        x: 'x',
        y: 'y',
        z: 'series',
        key: 'id',
        layout: stack({ order: stackedSeries }),
        inset: 10,
      }),
    ],
    scaleBand<number>()
      .domain(verticalBars.map((datum) => datum.x))
      .padding(0.15),
    scaleLinear().domain([0, 380]),
  )
  // source:stacked-bars:end

  // source:horizontal-bars:start
  const horizontalBars = [
    { id: 'long', label: 'Long ranking bar · 190', x: 190, y: 0 },
    { id: 'near', label: 'Neighbor endpoint · 82', x: 82, y: 1 },
    { id: 'third', label: 'Third bar · 130', x: 130, y: 2 },
    { id: 'fourth', label: 'Fourth bar · 105', x: 105, y: 3 },
    { id: 'fifth', label: 'Fifth bar · 118', x: 118, y: 4 },
  ] satisfies ProofDatum[]
  const horizontalBase = baseDefinition(
    [
      barX(horizontalBars, {
        id: 'horizontal-bars',
        x: 'x',
        y: 'y',
        key: 'id',
        inset: 5,
      }),
    ],
    scaleLinear().domain([0, 210]),
    scaleBand<number>().domain([0, 1, 2, 3, 4]).padding(0.12),
  )
  // source:horizontal-bars:end

  // source:line-area:start
  const areaRows = [
    { id: 'left', label: 'Left sample · 84', x: 0, y: 84 },
    { id: 'middle', label: 'Middle slice · 205', x: 1, y: 205 },
    { id: 'right', label: 'Right sample · 92', x: 2, y: 92 },
  ] satisfies ProofDatum[]
  const areaBase = baseDefinition(
    [
      areaY(areaRows, {
        id: 'area',
        x: 'x',
        y: 'y',
        key: 'id',
        fillOpacity: 0.42,
        stroke: '#404040',
        strokeWidth: 2,
      }),
    ],
    scaleLinear().domain([0, 2]),
    scaleLinear().domain([0, 220]),
  )
  // source:line-area:end

  // source:bubbles:start
  const bubbles = [
    {
      id: 'large-bubble',
      label: 'Large bubble',
      x: 40,
      y: 55,
      radius: 46,
    },
    {
      id: 'small-bubble',
      label: 'Nearby small bubble',
      x: 49,
      y: 55,
      radius: 5,
    },
    { id: 'other-bubble', label: 'Other bubble', x: 78, y: 28, radius: 12 },
  ] satisfies ProofDatum[]
  const bubbleBase = baseDefinition(
    [
      dot(bubbles, {
        id: 'bubbles',
        x: 'x',
        y: 'y',
        r: 'radius',
        key: 'id',
        fillOpacity: 0.7,
        stroke: '#ffffff',
        strokeWidth: 1.5,
      }),
    ],
    scaleLinear().domain([0, 100]),
    scaleLinear().domain([0, 100]),
  )
  // source:bubbles:end

  // source:cells:start
  const cells = [
    {
      id: 'large-cell',
      label: 'Large heatmap / treemap cell',
      x1: 0,
      x2: 70,
      y1: 0,
      y2: 100,
      color: '#404040',
    },
    {
      id: 'small-cell',
      label: 'Neighbor cell',
      x1: 70.5,
      x2: 79,
      y1: 42,
      y2: 58,
      color: '#a3a3a3',
    },
  ] satisfies ProofDatum[]
  const cellBase = baseDefinition(
    [
      rect(cells, {
        id: 'cells',
        x1: 'x1',
        x2: 'x2',
        y1: 'y1',
        y2: 'y2',
        key: 'id',
        color: 'id',
        inset: 2,
      }),
    ],
    scaleLinear().domain([0, 100]),
    scaleLinear().domain([0, 100]),
  )
  // source:cells:end

  // source:financial:start
  const financial = [
    {
      id: 'tall-candle',
      label: 'Tall candle / box plot',
      x1: 0.34,
      x2: 0.42,
      y1: 0.08,
      y2: 0.92,
      probe: [0.38, 0.78],
      color: '#404040',
    },
    {
      id: 'near-candle',
      label: 'Nearby candle endpoint',
      x1: 0.445,
      x2: 0.49,
      y1: 0.67,
      y2: 0.79,
      color: '#a3a3a3',
    },
  ] satisfies ProofDatum[]
  const financialBase = baseDefinition(
    [normalizedRectMark('financial', financial, 'x')],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
  // source:financial:end

  // source:timeline:start
  const timeline = [
    {
      id: 'long-task',
      label: 'Long Gantt interval',
      x1: 0.08,
      x2: 0.83,
      y1: 0.25,
      y2: 0.43,
      probe: [0.76, 0.34],
      color: '#404040',
    },
    {
      id: 'milestone',
      label: 'Nearby milestone',
      x1: 0.72,
      x2: 0.8,
      y1: 0.5,
      y2: 0.64,
      color: '#a3a3a3',
    },
  ] satisfies ProofDatum[]
  const timelineBase = baseDefinition(
    [normalizedRectMark('timeline', timeline, 'y')],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
  // source:timeline:end

  // source:pie:start
  const pie = [
    {
      id: 'large-slice',
      label: 'Large pie / donut slice',
      polygon: [
        [0.5, 0.5],
        [0.5, 0.08],
        [0.86, 0.22],
        [0.9, 0.56],
      ],
      probe: [0.82, 0.23],
      color: '#404040',
    },
    {
      id: 'small-slice',
      label: 'Neighbor slice centroid',
      polygon: [
        [0.5, 0.5],
        [0.9, 0.56],
        [0.69, 0.9],
      ],
      color: '#a3a3a3',
    },
    {
      id: 'last-slice',
      label: 'Last slice',
      polygon: [
        [0.5, 0.5],
        [0.69, 0.9],
        [0.16, 0.7],
        [0.5, 0.08],
      ],
      color: '#d4d4d4',
    },
  ] satisfies ProofDatum[]
  const pieBase = baseDefinition(
    [normalizedPolygonMark('pie', pie)],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
  // source:pie:end

  // source:polar-sectors:start
  const annularSector = (
    startAngle: number,
    endAngle: number,
    innerRadius: number,
    outerRadius: number,
  ) => {
    const center = 0.5
    const steps = 10
    const angles = Array.from(
      { length: steps + 1 },
      (_, index) => startAngle + ((endAngle - startAngle) * index) / steps,
    )
    const point = (angle: number, radius: number) =>
      [
        center + Math.cos(angle) * radius,
        center + Math.sin(angle) * radius,
      ] as const
    return [
      ...angles.map((angle) => point(angle, outerRadius)),
      ...[...angles].reverse().map((angle) => point(angle, innerRadius)),
    ]
  }
  const polarSectors = [
    {
      id: 'long-sector',
      label: 'Long radial bar / annular sector',
      polygon: annularSector(-2.2, 0.25, 0.15, 0.43),
      probe: [0.83, 0.57],
      color: '#404040',
    },
    {
      id: 'near-sector',
      label: 'Neighbor sector centroid',
      polygon: annularSector(0.29, 0.7, 0.15, 0.43),
      color: '#a3a3a3',
    },
    {
      id: 'remaining-sector',
      label: 'Remaining polar sector',
      polygon: annularSector(0.74, 4.02, 0.15, 0.43),
      color: '#d4d4d4',
    },
  ] satisfies ProofDatum[]
  const polarSectorBase = baseDefinition(
    [
      polarGuideMark('polar-sector-guides'),
      normalizedPolygonMark('polar-sectors', polarSectors, 'polar'),
    ],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
  // source:polar-sectors:end

  // source:radar-area:start
  const radar = [
    {
      id: 'radar-profile',
      label: 'Large radar profile',
      polygon: [
        [0.5, 0.1],
        [0.76, 0.32],
        [0.84, 0.68],
        [0.5, 0.82],
        [0.2, 0.68],
        [0.28, 0.34],
      ],
      probe: [0.76, 0.36],
      color: '#525252',
    },
    {
      id: 'radar-neighbor',
      label: 'Nearby polar point',
      polygon: [
        [0.79, 0.27],
        [0.82, 0.25],
        [0.85, 0.27],
        [0.85, 0.31],
        [0.82, 0.33],
        [0.79, 0.31],
      ],
      color: '#b3b3b3',
    },
  ] satisfies ProofDatum[]
  const radarBase = baseDefinition(
    [
      polarGuideMark('radar-guides'),
      normalizedPolygonMark('radar', radar, 'polar'),
    ],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
  // source:radar-area:end

  // source:map:start
  const map = [
    {
      id: 'west-region',
      label: 'Large map region',
      polygon: [
        [0.08, 0.2],
        [0.52, 0.12],
        [0.61, 0.42],
        [0.44, 0.82],
        [0.12, 0.72],
      ],
      probe: [0.58, 0.4],
      color: '#404040',
    },
    {
      id: 'east-region',
      label: 'Neighbor region centroid',
      polygon: [
        [0.62, 0.28],
        [0.72, 0.22],
        [0.73, 0.58],
        [0.63, 0.62],
      ],
      color: '#a3a3a3',
    },
  ] satisfies ProofDatum[]
  const mapBase = baseDefinition(
    [normalizedPolygonMark('map', map)],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
  // source:map:end

  // source:sankey:start
  const sankey = [
    {
      id: 'wide-link',
      label: 'Wide Sankey / network link',
      polygon: [
        [0.16, 0.2],
        [0.84, 0.58],
        [0.84, 0.74],
        [0.16, 0.36],
      ],
      probe: [0.76, 0.56],
      color: '#525252',
    },
    {
      id: 'node',
      label: 'Nearby node anchor',
      polygon: [
        [0.79, 0.36],
        [0.89, 0.36],
        [0.89, 0.52],
        [0.79, 0.52],
      ],
      color: '#a3a3a3',
    },
  ] satisfies ProofDatum[]
  const sankeyBase = baseDefinition(
    [normalizedPolygonMark('sankey', sankey)],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
  // source:sankey:end

  return [
    makeCase({
      id: 'stacked-bars',
      title: 'Stacked bars',
      affinity: 'x',
      explanation:
        'Containment selects the tall October rectangle; outside all bars, only horizontal category distance matters.',
      beforeExpected: 'September · disease · 72',
      afterExpected: 'October · disease · 210',
      base: verticalBase,
      probe: (scene) => pointAtValue(scene, 'october-disease', 'y', 72),
    }),
    makeCase({
      id: 'horizontal-bars',
      title: 'Rankings and horizontal bars',
      affinity: 'y',
      explanation:
        'The long painted bar wins directly; off-mark fallback stays in its row rather than jumping diagonally.',
      beforeExpected: 'Neighbor endpoint · 82',
      afterExpected: 'Long ranking bar · 190',
      base: horizontalBase,
      probe: (scene) => pointAtValue(scene, 'long', 'x', 82),
    }),
    makeCase({
      id: 'line-area',
      title: 'Lines and vertical areas',
      affinity: 'x',
      explanation:
        'There is no large point to hit, so the mark’s x affinity resolves the sample at the pointer’s time/category.',
      beforeExpected: 'Nothing focused yet',
      afterExpected: 'Middle slice · 205',
      base: areaBase,
      probe: (scene) => pointAtValue(scene, 'middle', 'y', 8),
    }),
    makeCase({
      id: 'bubbles',
      title: 'Scatterplots and bubbles',
      affinity: 'xy',
      explanation:
        'A large circle is targetable across its painted radius before ordinary two-dimensional proximity is considered.',
      beforeExpected: 'Nearby small bubble',
      afterExpected: 'Large bubble',
      base: bubbleBase,
      probe: (scene) => circleEdgeProbe(scene, 'large-bubble', 0.78),
    }),
    makeCase({
      id: 'cells',
      title: 'Heatmaps and treemaps',
      affinity: 'xy',
      explanation:
        'The containing cell wins; outside the cells, distance is measured to their rectangle boundaries in both axes.',
      beforeExpected: 'Neighbor cell',
      afterExpected: 'Large heatmap / treemap cell',
      base: cellBase,
      probe: (scene) => rectProbe(scene, 'large-cell', 0.94, 0.5),
    }),
    makeCase({
      id: 'financial',
      title: 'Candlesticks and box plots',
      affinity: 'x',
      explanation:
        'Tall financial intervals use their body or whisker geometry first, then the natural x position of the observation.',
      beforeExpected: 'Nearby candle endpoint',
      afterExpected: 'Tall candle / box plot',
      base: financialBase,
      probe: normalizedDatumProbe('tall-candle'),
    }),
    makeCase({
      id: 'timeline',
      title: 'Timelines and Gantt charts',
      affinity: 'y',
      explanation:
        'Long intervals remain targetable throughout their body, and nearby fallback follows the task lane.',
      beforeExpected: 'Nearby milestone',
      afterExpected: 'Long Gantt interval',
      base: timelineBase,
      probe: normalizedDatumProbe('long-task'),
    }),
    makeCase({
      id: 'pie',
      title: 'Pie and donut slices',
      affinity: 'geometry',
      explanation:
        'Irregular slices opt out of axis fallback: the pointer must be inside the slice instead of near an arbitrary centroid.',
      beforeExpected: 'Nothing focused yet',
      afterExpected: 'Large pie / donut slice',
      base: pieBase,
      probe: normalizedDatumProbe('large-slice'),
    }),
    makeCase({
      id: 'polar-sectors',
      title: 'Radial bars and annular sectors',
      affinity: 'geometry',
      explanation:
        'Long polar marks remain targetable across their full angular and radial extent instead of only near an arc centroid.',
      beforeExpected: 'Neighbor sector centroid',
      afterExpected: 'Long radial bar / annular sector',
      base: polarSectorBase,
      probe: normalizedPolarDatumProbe('long-sector'),
    }),
    makeCase({
      id: 'radar-area',
      title: 'Radar and polar areas',
      affinity: 'geometry',
      explanation:
        'The radar profile owns its painted interior; a nearby polar sample cannot steal the pointer just because its anchor is closer.',
      beforeExpected: 'Nearby polar point',
      afterExpected: 'Large radar profile',
      base: radarBase,
      probe: normalizedPolarDatumProbe('radar-profile'),
    }),
    makeCase({
      id: 'map',
      title: 'Maps and geographic regions',
      affinity: 'geometry',
      explanation:
        'A region’s polygon is the interaction contract; neighboring centroids no longer steal interior pointer positions.',
      beforeExpected: 'Neighbor region centroid',
      afterExpected: 'Large map region',
      base: mapBase,
      probe: normalizedDatumProbe('west-region'),
    }),
    makeCase({
      id: 'sankey',
      title: 'Sankey and network geometry',
      affinity: 'geometry',
      explanation:
        'Wide links and nodes expose their own shapes, avoiding a global x or y rule that would be wrong for topology.',
      beforeExpected: 'Nearby node anchor',
      afterExpected: 'Wide Sankey / network link',
      base: sankeyBase,
      probe: normalizedDatumProbe('wide-link'),
    }),
  ]
}

function baseDefinition(
  marks: StaticChartDefinition<ProofDatum, number, number>['marks'],
  xScale:
    | ReturnType<typeof scaleLinear<number, number>>
    | ReturnType<typeof scaleBand<number>>,
  yScale:
    | ReturnType<typeof scaleLinear<number, number>>
    | ReturnType<typeof scaleBand<number>>,
): StaticChartDefinition<ProofDatum, number, number> {
  return {
    marks,
    x: { scale: xScale, grid: true },
    y: { scale: yScale, grid: true },
    guides: false,
    margin: { top: 18, right: 20, bottom: 18, left: 20 },
    theme: {
      foreground: '#171717',
      muted: '#737373',
      grid: '#e5e5e5',
      background: 'transparent',
      palette: ['#171717', '#737373', '#d4d4d4', '#a3a3a3', '#525252'],
    },
  }
}

function makeCase(
  input: Omit<ProofCase, 'before' | 'after' | 'source'> & {
    base: StaticChartDefinition<ProofDatum, number, number>
  },
): ProofCase {
  const { base, ...proof } = input
  return {
    ...proof,
    source: sourceSection(proof.id),
    before: interactiveDefinition(base, legacyPointFocus),
    after: interactiveDefinition(base),
  }
}

function interactiveDefinition(
  base: StaticChartDefinition<ProofDatum, number, number>,
  focus?: ChartFocusStrategy<ProofDatum, number, number>,
) {
  return defineChart(base, {
    focus,
    maxFocusDistance: 48,
    animate: false,
    tooltip: {
      use: tooltip,
      className: 'hit-region-proof__tooltip',
      sticky: true,
      placement: ['top', 'right', 'left', 'bottom'],
      format: (point) => point.datum.label,
    },
  })
}

// source:normalized-rect-mark:start
function normalizedRectMark(
  id: string,
  data: readonly ProofDatum[],
  focusAffinity: ChartFocusAffinity,
) {
  return createMark<ProofDatum, number, number>(() => ({
    id,
    focusAffinity,
    channels: {},
    render: ({ chart }) => {
      const nodes: SceneNode[] = []
      const points: ChartPoint<ProofDatum, number, number>[] = []
      data.forEach((datum, datumIndex) => {
        if (
          datum.x1 === undefined ||
          datum.x2 === undefined ||
          datum.y1 === undefined ||
          datum.y2 === undefined
        )
          return
        const x = chart.x + datum.x1 * chart.width
        const y = chart.y + datum.y1 * chart.height
        const width = (datum.x2 - datum.x1) * chart.width
        const height = (datum.y2 - datum.y1) * chart.height
        const centerX = x + width / 2
        const centerY = y + height / 2
        nodes.push({
          kind: 'rect',
          key: datum.id,
          x,
          y,
          width,
          height,
          radius: 4,
          style: { fill: datum.color ?? '#404040', fillOpacity: 0.78 },
        })
        points.push({
          key: datum.id,
          markId: id,
          group: null,
          groupLabel: id,
          datum,
          datumIndex,
          xValue: centerX,
          yValue: centerY,
          x: centerX,
          y: centerY,
          hitRegion: { kind: 'rect', x, y, width, height },
          color: datum.color ?? '#404040',
        })
      })
      return { nodes, points }
    },
  }))
}
// source:normalized-rect-mark:end

// source:polar-guide-mark:start
function polarGuideMark(id: string) {
  return createMark<ProofDatum, number, number>(() => ({
    id,
    channels: {},
    render: ({ chart }) => {
      const centerX = chart.x + chart.width / 2
      const centerY = chart.y + chart.height / 2
      const radius = Math.min(chart.width, chart.height) * 0.43
      const nodes: SceneNode[] = []
      for (const ratio of [0.25, 0.5, 0.75, 1]) {
        nodes.push({
          kind: 'dot',
          key: `${id}:ring:${ratio}`,
          x: centerX,
          y: centerY,
          radius: radius * ratio,
          style: { fill: 'none', stroke: '#e5e5e5', strokeWidth: 1 },
        })
      }
      for (let index = 0; index < 8; index++) {
        const angle = (index / 8) * Math.PI * 2
        nodes.push({
          kind: 'polyline',
          key: `${id}:spoke:${index}`,
          points: [
            [centerX, centerY],
            [
              centerX + Math.cos(angle) * radius,
              centerY + Math.sin(angle) * radius,
            ],
          ],
          style: { fill: 'none', stroke: '#e5e5e5', strokeWidth: 1 },
        })
      }
      return { nodes, points: [] }
    },
  }))
}
// source:polar-guide-mark:end

// source:normalized-polygon-mark:start
function normalizedPolygonMark(
  id: string,
  data: readonly ProofDatum[],
  coordinate: 'cartesian' | 'polar' = 'cartesian',
) {
  return createMark<ProofDatum, number, number>(() => ({
    id,
    focusAffinity: 'geometry',
    channels: {},
    render: ({ chart }) => {
      const nodes: SceneNode[] = []
      const points: ChartPoint<ProofDatum, number, number>[] = []
      const size = Math.min(chart.width, chart.height)
      const originX =
        coordinate === 'polar' ? chart.x + (chart.width - size) / 2 : chart.x
      const originY =
        coordinate === 'polar' ? chart.y + (chart.height - size) / 2 : chart.y
      const width = coordinate === 'polar' ? size : chart.width
      const height = coordinate === 'polar' ? size : chart.height
      data.forEach((datum, datumIndex) => {
        if (!datum.polygon?.length) return
        const polygon = datum.polygon.map(
          ([x, y]) => [originX + x * width, originY + y * height] as const,
        )
        const x =
          polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length
        const y =
          polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length
        nodes.push({
          kind: 'area',
          key: datum.id,
          points: polygon,
          style: {
            fill: datum.color ?? '#404040',
            fillOpacity: 0.78,
            stroke: '#ffffff',
            strokeWidth: 1,
          },
        })
        points.push({
          key: datum.id,
          markId: id,
          group: null,
          groupLabel: id,
          datum,
          datumIndex,
          xValue: x,
          yValue: y,
          x,
          y,
          hitRegion: { kind: 'polygon', points: polygon },
          color: datum.color ?? '#404040',
        })
      })
      return { nodes, points }
    },
  }))
}
// source:normalized-polygon-mark:end

function pointAtValue(
  scene: ChartScene<ProofDatum, number, number>,
  id: string,
  axis: 'x' | 'y',
  value: number,
) {
  const point = scene.points.find((candidate) => candidate.datum.id === id)
  const coordinate = scene.scales[axis]?.map(value)
  if (!point || !Number.isFinite(coordinate)) return null
  return axis === 'x'
    ? { x: coordinate!, y: point.y }
    : { x: point.x, y: coordinate! }
}

function circleEdgeProbe(
  scene: ChartScene<ProofDatum, number, number>,
  id: string,
  amount: number,
) {
  const point = scene.points.find((candidate) => candidate.datum.id === id)
  if (point?.hitRegion?.kind !== 'circle') return null
  return {
    x: point.hitRegion.x + point.hitRegion.radius * amount,
    y: point.hitRegion.y,
  }
}

function rectProbe(
  scene: ChartScene<ProofDatum, number, number>,
  id: string,
  xAmount: number,
  yAmount: number,
) {
  const point = scene.points.find((candidate) => candidate.datum.id === id)
  if (point?.hitRegion?.kind !== 'rect') return null
  return {
    x: point.hitRegion.x + point.hitRegion.width * xAmount,
    y: point.hitRegion.y + point.hitRegion.height * yAmount,
  }
}

function normalizedDatumProbe(id: string) {
  return (scene: ChartScene<ProofDatum, number, number>) => {
    const point = scene.points.find((candidate) => candidate.datum.id === id)
    const probe = point?.datum.probe
    if (!probe) return null
    return {
      x: scene.chart.x + probe[0] * scene.chart.width,
      y: scene.chart.y + probe[1] * scene.chart.height,
    }
  }
}

function normalizedPolarDatumProbe(id: string) {
  return (scene: ChartScene<ProofDatum, number, number>) => {
    const point = scene.points.find((candidate) => candidate.datum.id === id)
    const probe = point?.datum.probe
    if (!probe) return null
    const size = Math.min(scene.chart.width, scene.chart.height)
    return {
      x: scene.chart.x + (scene.chart.width - size) / 2 + probe[0] * size,
      y: scene.chart.y + (scene.chart.height - size) / 2 + probe[1] * size,
    }
  }
}
