import * as React from 'react'
import {
  areaY,
  bandX,
  bandY,
  barX,
  barY,
  createMark,
  defineChart,
  dot,
  facet,
  group,
  hexagon,
  lineY,
  rect,
  stack,
  whenFocused,
  type ChartFocusAffinity,
  type ChartFocusStrategy,
  type ChartPoint,
  type ChartScene,
  type SceneNode,
  type StaticChartDefinition,
} from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/react-charts'
import { Chart as CanvasChart } from '@tanstack/react-charts/canvas'
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
  panel?: string
  radius?: number
  polygon?: readonly (readonly [number, number])[]
  probe?: readonly [number, number]
  color?: string
}

interface ProofCase {
  id: string
  title: string
  affinity: ChartFocusAffinity
  affinityLabel?: string
  renderer: ProofRenderer
  stress?: {
    geometryLabel: string
    height: number
  }
  explanation: string
  beforeExpected: string
  afterExpected: string
  source: string
  before: StaticChartDefinition<ProofDatum, number, number>
  after: StaticChartDefinition<ProofDatum, number, number>
  grouped?: {
    axis: 'x' | 'y'
    expected: readonly string[]
    definition: StaticChartDefinition<ProofDatum, number, number>
  }
  probe: (
    scene: ChartScene<ProofDatum, number, number>,
  ) => { x: number; y: number } | null
}

type ProofRenderer = 'svg' | 'canvas'

const canvasProofIds = new Set<string>([
  'grouped-horizontal-bars',
  'line-area',
  'mixed-horizontal-bars-dots',
  'mixed-area-line-dots',
  'scatterplot',
  'hexbin',
  'nested-bubbles',
  'cells',
  'polar-sectors',
  'sankey',
  'faceted-stacked-bars',
  'translated-clipped',
  'dense-rectangles',
  'complex-polygons',
])

export const legacyPointFocus: ChartFocusStrategy<ProofDatum, number, number> =
  {
    resolve(points, { x, y, maxDistance }) {
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
    group(_points, { point }) {
      return [point]
    },
    navigation(points) {
      return points
    },
  }

// source:faceted-bars:start
const facetedBars = ['North', 'South'].flatMap((panel) =>
  [72, 84, 90, panel === 'North' ? 240 : 105, 78, 88].map((value, x) => ({
    id:
      panel === 'North' && x === 3
        ? 'north-tall'
        : panel === 'North' && x === 2
          ? 'north-neighbor'
          : `${panel.toLowerCase()}-${x}`,
    label:
      panel === 'North' && x === 3
        ? 'North tall bar · 240'
        : panel === 'North' && x === 2
          ? 'North neighbor · 90'
          : `${panel} bar ${x + 1} · ${value}`,
    panel,
    x,
    y: value,
  })),
) satisfies ProofDatum[]

type FacetSyncAxis = 'x' | 'y'

function facetedBarsDefinition(syncAxis?: FacetSyncAxis) {
  return baseDefinition(
    [
      facet(facetedBars, {
        id: 'faceted-bars',
        by: 'panel',
        columns: 2,
        gap: 12,
        axes: 'cell',
        chart: (rows) => ({
          marks:
            syncAxis === 'x'
              ? [
                  whenFocused(
                    bandX(rows, {
                      id: 'facet-x-cursor',
                      x: 'x',
                      key: 'id',
                      fill: '#d4d4d4',
                      fillOpacity: 0.55,
                      inset: 4,
                    }),
                    { match: 'x' },
                  ),
                  barY(rows, {
                    id: 'facet-bars',
                    x: 'x',
                    y: 'y',
                    key: 'id',
                    inset: 5,
                  }),
                ]
              : syncAxis === 'y'
                ? [
                    whenFocused(
                      bandY(rows, {
                        id: 'facet-y-cursor',
                        y: 'y',
                        key: 'id',
                        fill: '#d4d4d4',
                        fillOpacity: 0.55,
                        inset: -4,
                      }),
                      { match: 'y' },
                    ),
                    barY(rows, {
                      id: 'facet-bars',
                      x: 'x',
                      y: 'y',
                      key: 'id',
                      inset: 5,
                    }),
                  ]
                : [
                    barY(rows, {
                      id: 'facet-bars',
                      x: 'x',
                      y: 'y',
                      key: 'id',
                      inset: 5,
                    }),
                  ],
          x: { scale: scaleBand<number>().domain([0, 1, 2, 3, 4, 5]) },
          y: { scale: scaleLinear().domain([0, 260]) },
          guides: false,
          margin: 0,
          clip: true,
        }),
      }),
    ],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
}

const facetedBase = facetedBarsDefinition()
const synchronizedXFacetedBase = facetedBarsDefinition('x')
const synchronizedYFacetedBase = facetedBarsDefinition('y')
// source:faceted-bars:end

// source:animated-destination:start
const animatedBars = [
  { id: 'animated-left', label: 'Left bar · 120', x: 0, y: 120 },
  { id: 'animated-middle', label: 'Expanding bar · 210', x: 1, y: 210 },
  { id: 'animated-right', label: 'Right bar · 150', x: 2, y: 150 },
] satisfies ProofDatum[]

const animatedDestinationBase = baseDefinition(
  [
    barY(animatedBars, {
      id: 'animated-bars',
      x: 'x',
      y: 'y',
      key: 'id',
      inset: 62,
      radius: 4,
      states: [
        {
          when: { focus: 'primary' },
          style: { inset: 8, radius: 10, fill: '#171717' },
          transition: { type: 'tween', duration: 700, easing: 'ease-out' },
        },
      ],
    }),
  ],
  scaleBand<number>().domain([0, 1, 2]).padding(0.04),
  scaleLinear().domain([0, 240]),
)

export const animatedDestinationDefinition = defineChart(
  animatedDestinationBase,
  {
    maxFocusDistance: 12,
    animate: false,
    tooltip: {
      use: tooltip,
      className: 'hit-region-proof__tooltip',
      sticky: false,
      placement: ['top', 'right', 'left', 'bottom'],
      format: (point) => point.datum.label,
    },
  },
)
// source:animated-destination:end

export const facetFocusDefinitions = {
  primary: interactiveDefinition(facetedBase),
  x: interactiveDefinition(synchronizedXFacetedBase),
  y: interactiveDefinition(synchronizedYFacetedBase),
}

export const proofCases = createProofCases()

export function InteractionGeometryLab() {
  return (
    <main className="hit-region-proof">
      <header className="hit-region-proof__header">
        <h1>Interaction geometry</h1>
        <p>
          Each comparison uses the same pointer position and 48px threshold.
          Before measures from a mark’s anchor point. After traverses the final
          rendered scene in paint order, tests its primitive first, then uses
          its natural interaction axis. Facets, nested transforms, and clips
          prove that interaction follows layout without copied hit bounds. Every
          card names its renderer, the proof families are split evenly between
          SVG and Canvas, the first two sections make facet focus scope, axis
          synchronization, and destination-scene animation explicit, and the
          final comparisons scale the geometry contract to thousands of shapes.
          Built-in marks attach their natural affinity automatically; mixed-mark
          charts therefore resolve each rendered primitive independently without
          a chart-level affinity setting. Selected mixed cases add a third
          grouped-focus card: it uses the existing group-x or group-y preset to
          return every series at the shared axis value and render them as native
          tooltip rows.
        </p>
      </header>

      <div className="hit-region-proof__gallery">
        <FacetFocusModes />
        <AnimatedDestinationCase />
        {proofCases.map((proof) => (
          <section
            className={`hit-region-proof__case${proof.stress ? ' hit-region-proof__case--stress' : ''}`}
            key={proof.id}
            data-proof-case={proof.id}
          >
            <header className="hit-region-proof__case-header">
              <h2>{proof.title}</h2>
              <code>
                {`${proof.renderer} · ${
                  proof.stress
                    ? `${proof.stress.geometryLabel} · ${proof.affinityLabel ?? `fallback: ${proof.affinity}`}`
                    : (proof.affinityLabel ?? `fallback: ${proof.affinity}`)
                }`}
              </code>
            </header>
            <p className="hit-region-proof__case-description">
              {proof.explanation}
            </p>
            <div
              className={`hit-region-proof__grid${proof.grouped ? ' hit-region-proof__grid--three' : ''}`}
              aria-label={
                proof.grouped
                  ? `${proof.title} before, after, and grouped focus`
                  : `${proof.title} before and after`
              }
            >
              <ProofChart proof={proof} mode="before" />
              <ProofChart proof={proof} mode="after" />
              {proof.grouped ? <GroupedProofChart proof={proof} /> : null}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}

function FacetFocusModes() {
  return (
    <section
      className="hit-region-proof__case"
      data-interaction-contract="facet-focus"
    >
      <header className="hit-region-proof__case-header">
        <h2>Facet focus is explicit</h2>
        <code>selection: 1 datum</code>
      </header>
      <p className="hit-region-proof__case-description">
        Default focus paints only the selected scene point. Focus marks with{' '}
        <code>match: 'x'</code> or <code>match: 'y'</code> deliberately mirror a
        vertical or horizontal cursor band across matching facets while the
        tooltip and callback still report one primary datum. Hover a final 88
        bar to see either axis synchronize across both panels.
      </p>
      <div
        className="hit-region-proof__grid hit-region-proof__grid--three"
        aria-label="Default, x-synchronized, and y-synchronized facet focus"
      >
        <FacetFocusChart mode="primary" />
        <FacetFocusChart mode="x" />
        <FacetFocusChart mode="y" />
      </div>
    </section>
  )
}

function FacetFocusChart({
  mode,
}: {
  mode: keyof typeof facetFocusDefinitions
}) {
  const [focused, setFocused] = React.useState<ProofDatum | null>(null)
  const syncAxis = mode === 'primary' ? null : mode
  const source = React.useMemo(
    () =>
      [
        sourceSection('faceted-bars'),
        `const definition = interactiveDefinition(\n  facetedBarsDefinition(${syncAxis ? `'${syncAxis}'` : ''}),\n)`,
      ].join('\n\n'),
    [syncAxis],
  )
  const onFocusChange = React.useCallback(
    (point: ChartPoint<ProofDatum, number, number> | null) => {
      setFocused(point?.datum ?? null)
    },
    [],
  )

  return (
    <article className="hit-region-proof__card" data-facet-focus-chart={mode}>
      <div className="hit-region-proof__card-header">
        <span className="hit-region-proof__badge">
          {syncAxis ? `opt-in ${syncAxis} sync · svg` : 'default primary · svg'}
        </span>
        <span className="hit-region-proof__distance">48px</span>
      </div>
      <div className="hit-region-proof__chart">
        <Chart
          definition={facetFocusDefinitions[mode]}
          height={230}
          initialWidth={520}
          ariaLabel={
            syncAxis
              ? `Faceted bars with synchronized ${syncAxis} cursor`
              : 'Faceted bars with primary focus'
          }
          onFocusChange={onFocusChange}
        />
      </div>
      <dl className="hit-region-proof__result">
        <div>
          <dt>Selected datum</dt>
          <dd data-facet-focus-result={mode}>
            {focused?.label ?? 'Nothing focused yet'}
          </dd>
        </div>
        <div>
          <dt>Focus presentation</dt>
          <dd>
            {syncAxis
              ? `${syncAxis} band in matching facets`
              : 'one primary marker'}
          </dd>
        </div>
      </dl>
      <SourceDisclosure source={source} label={`${mode} · svg`} />
    </article>
  )
}

function AnimatedDestinationCase() {
  return (
    <section
      className="hit-region-proof__case"
      data-interaction-contract="animated-destination"
    >
      <header className="hit-region-proof__case-header">
        <h2>Animated destination geometry</h2>
        <code>svg + canvas · destination scene · 700ms</code>
      </header>
      <p className="hit-region-proof__case-description">
        Hover a narrow bar, then slide sideways into the width it expands to.
        Picking switches to the resolved destination scene immediately in both
        renderers. SVG interpolates element attributes while Canvas crossfades
        painted buffers, so this deliberately tests their shared destination
        contract rather than claiming exact picking against every intermediate
        frame.
      </p>
      <div
        className="hit-region-proof__grid"
        aria-label="Animated destination geometry in SVG and Canvas"
      >
        <AnimatedDestinationChart renderer="svg" />
        <AnimatedDestinationChart renderer="canvas" />
      </div>
    </section>
  )
}

function AnimatedDestinationChart({ renderer }: { renderer: ProofRenderer }) {
  const [focused, setFocused] = React.useState<ProofDatum | null>(null)
  const source = React.useMemo(
    () =>
      [
        sourceSection('animated-destination'),
        chartComponentSource(renderer, 'animatedDestinationDefinition'),
      ].join('\n\n'),
    [renderer],
  )
  const onFocusChange = React.useCallback(
    (point: ChartPoint<ProofDatum, number, number> | null) => {
      setFocused(point?.datum ?? null)
    },
    [],
  )
  const chartProps = {
    definition: animatedDestinationDefinition,
    height: 270,
    initialWidth: 520,
    ariaLabel: `Bars expanding to focused destination geometry in ${renderer.toUpperCase()}`,
    onFocusChange,
  }

  return (
    <article
      className="hit-region-proof__card hit-region-proof__card--animation"
      data-animation-chart="destination-scene"
      data-animation-renderer={renderer}
    >
      <div className="hit-region-proof__card-header">
        <span className="hit-region-proof__badge">
          interactive · {renderer}
        </span>
        <span className="hit-region-proof__distance">12px</span>
      </div>
      <div className="hit-region-proof__chart">
        {renderer === 'canvas' ? (
          <CanvasChart {...chartProps} />
        ) : (
          <Chart {...chartProps} />
        )}
      </div>
      <dl className="hit-region-proof__result">
        <div>
          <dt>Expected</dt>
          <dd>Focus survives in expanded-only area</dd>
        </div>
        <div>
          <dt>Actually focused</dt>
          <dd data-animation-focus-result={renderer}>
            {focused?.label ?? 'Nothing focused yet'}
          </dd>
        </div>
      </dl>
      <SourceDisclosure source={source} label={`animated · ${renderer}`} />
    </article>
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
  const onFocusChange = React.useCallback(
    (point: ChartPoint<ProofDatum, number, number> | null) => {
      setFocused(point?.datum ?? null)
    },
    [],
  )
  const onRender = React.useCallback(
    (context: { scene: ChartScene<ProofDatum, number, number> }) => {
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
  const chartProps = {
    definition: mode === 'before' ? proof.before : proof.after,
    height: proof.stress?.height ?? 230,
    initialWidth: proof.stress ? 1120 : 520,
    ariaLabel: `${proof.title}: ${mode} in ${proof.renderer.toUpperCase()}`,
    onFocusChange,
    onRender,
  }

  return (
    <article
      className={`hit-region-proof__card hit-region-proof__card--${mode}`}
      data-proof-chart={`${proof.id}-${mode}`}
      data-proof-renderer={proof.renderer}
    >
      <div className="hit-region-proof__card-header">
        <span className="hit-region-proof__badge">
          {mode} · {proof.renderer}
        </span>
        <span className="hit-region-proof__distance">48px</span>
      </div>

      <div className="hit-region-proof__chart">
        {proof.renderer === 'canvas' ? (
          <CanvasChart {...chartProps} />
        ) : (
          <Chart {...chartProps} />
        )}
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

function GroupedProofChart({ proof }: { proof: ProofCase }) {
  const grouped = proof.grouped
  const [primary, setPrimary] = React.useState<ProofDatum | null>(null)
  const [focusedGroup, setFocusedGroup] = React.useState<
    readonly ChartPoint<ProofDatum, number, number>[]
  >([])
  const [probe, setProbe] = React.useState<{ x: number; y: number } | null>(
    null,
  )
  const onFocusChange = React.useCallback(
    (point: ChartPoint<ProofDatum, number, number> | null) => {
      setPrimary(point?.datum ?? null)
    },
    [],
  )
  const onFocusGroupChange = React.useCallback(
    (points: readonly ChartPoint<ProofDatum, number, number>[]) => {
      setFocusedGroup(points)
    },
    [],
  )
  const onRender = React.useCallback(
    (context: { scene: ChartScene<ProofDatum, number, number> }) => {
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

  if (!grouped) return null

  const chartProps = {
    definition: grouped.definition,
    height: proof.stress?.height ?? 230,
    initialWidth: proof.stress ? 1120 : 520,
    ariaLabel: `${proof.title}: grouped ${grouped.axis.toUpperCase()} focus in ${proof.renderer.toUpperCase()}`,
    onFocusChange,
    onFocusGroupChange,
    onRender,
  }
  const actual = focusedGroup.length
    ? focusedGroup
        .map(
          (point) =>
            `${point.groupLabel}: ${grouped.axis === 'x' ? point.yValue : point.xValue}`,
        )
        .join(' · ')
    : 'Nothing focused yet'

  return (
    <article
      className="hit-region-proof__card hit-region-proof__card--grouped"
      data-proof-chart={`${proof.id}-group-${grouped.axis}`}
      data-proof-renderer={proof.renderer}
    >
      <div className="hit-region-proof__card-header">
        <span className="hit-region-proof__badge">
          group-{grouped.axis} · {proof.renderer}
        </span>
        <span className="hit-region-proof__distance">48px</span>
      </div>

      <div className="hit-region-proof__chart">
        {proof.renderer === 'canvas' ? (
          <CanvasChart {...chartProps} />
        ) : (
          <Chart {...chartProps} />
        )}
        {probe ? (
          <div
            className="hit-region-proof__probe"
            data-proof-probe={`${proof.id}-group-${grouped.axis}`}
            style={{ left: probe.x, top: probe.y }}
            aria-hidden="true"
          >
            <span />
          </div>
        ) : null}
      </div>

      <dl className="hit-region-proof__result">
        <div>
          <dt>Primary point</dt>
          <dd>{primary?.label ?? 'Nothing focused yet'}</dd>
        </div>
        <div>
          <dt>Grouped points</dt>
          <dd data-proof-group-result={`${proof.id}-${grouped.axis}`}>
            {actual}
          </dd>
        </div>
      </dl>

      <SourceDisclosure
        source={sourceForGrouped(proof)}
        label={`group-${grouped.axis} · ${proof.renderer}`}
      />
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
  const source = React.useMemo(
    () => sourceForMode(proof.source, mode, proof.renderer),
    [mode, proof.renderer, proof.source],
  )

  return (
    <SourceDisclosure source={source} label={`${mode} · ${proof.renderer}`} />
  )
}

function SourceDisclosure({
  source,
  label,
}: {
  source: string
  label: string
}) {
  return (
    <details className="hit-region-proof__source">
      <summary>
        <span>
          <SourceIcon />
          Source
        </span>
        <span className="hit-region-proof__source-meta">
          {lineCount(source).toLocaleString('en-US')} lines · {label}
        </span>
      </summary>
      <pre>
        <code>{source}</code>
      </pre>
    </details>
  )
}

function sourceForMode(
  source: string,
  mode: 'before' | 'after',
  renderer: ProofRenderer,
) {
  const baseName = /const (\w+Base)\s*=/.exec(source)?.[1] ?? 'base'
  const focus = mode === 'before' ? ', legacyPointFocus' : ''
  const helpers = sourceHelpers(source)
  return [
    source,
    ...helpers,
    `const ${mode}Definition = interactiveDefinition(${baseName}${focus})`,
    chartComponentSource(renderer, `${mode}Definition`),
  ].join('\n\n')
}

function sourceForGrouped(proof: ProofCase) {
  if (!proof.grouped) return proof.source
  const baseName = /const (\w+Base)\s*=/.exec(proof.source)?.[1] ?? 'base'
  return [
    proof.source,
    ...sourceHelpers(proof.source),
    `const groupedDefinition = groupedInteractiveDefinition(${baseName}, '${proof.grouped.axis}')`,
    chartComponentSource(proof.renderer, 'groupedDefinition'),
  ].join('\n\n')
}

function sourceHelpers(source: string) {
  const helpers = source.includes('normalizedRectMark(')
    ? [sourceSection('normalized-rect-mark')]
    : source.includes('normalizedPolygonMark(')
      ? [sourceSection('normalized-polygon-mark')]
      : []
  if (source.includes('translatedClipMark(')) {
    helpers.unshift(sourceSection('translated-clip-mark'))
  }
  if (source.includes('polarGuideMark(')) {
    helpers.unshift(sourceSection('polar-guide-mark'))
  }
  return helpers
}

function chartComponentSource(renderer: ProofRenderer, definition: string) {
  const component = renderer === 'canvas' ? 'CanvasChart' : 'Chart'
  return `<${component}
  definition={${definition}}
  ariaLabel="Interaction geometry proof"
/>`
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

  // source:grouped-vertical-bars:start
  const groupedVerticalBars = [
    {
      id: 'grouped-v-0-a',
      label: 'A · observed · 120',
      x: 0,
      y: 120,
      series: 'observed',
    },
    {
      id: 'grouped-v-0-b',
      label: 'A · comparison · 105',
      x: 0,
      y: 105,
      series: 'comparison',
    },
    {
      id: 'grouped-v-0-c',
      label: 'A · baseline · 96',
      x: 0,
      y: 96,
      series: 'baseline',
    },
    {
      id: 'grouped-v-1-a',
      label: 'B · observed · 150',
      x: 1,
      y: 150,
      series: 'observed',
    },
    {
      id: 'grouped-v-1-b',
      label: 'B · comparison · 130',
      x: 1,
      y: 130,
      series: 'comparison',
    },
    {
      id: 'grouped-v-1-c',
      label: 'B · baseline · 112',
      x: 1,
      y: 112,
      series: 'baseline',
    },
    {
      id: 'grouped-vertical-tall',
      label: 'C · tall grouped bar · 220',
      x: 2,
      y: 220,
      series: 'observed',
    },
    {
      id: 'grouped-vertical-neighbor',
      label: 'C · nearby grouped endpoint · 90',
      x: 2,
      y: 90,
      series: 'comparison',
    },
    {
      id: 'grouped-v-2-c',
      label: 'C · baseline · 118',
      x: 2,
      y: 118,
      series: 'baseline',
    },
    {
      id: 'grouped-v-3-a',
      label: 'D · observed · 135',
      x: 3,
      y: 135,
      series: 'observed',
    },
    {
      id: 'grouped-v-3-b',
      label: 'D · comparison · 160',
      x: 3,
      y: 160,
      series: 'comparison',
    },
    {
      id: 'grouped-v-3-c',
      label: 'D · baseline · 122',
      x: 3,
      y: 122,
      series: 'baseline',
    },
    {
      id: 'grouped-v-4-a',
      label: 'E · observed · 110',
      x: 4,
      y: 110,
      series: 'observed',
    },
    {
      id: 'grouped-v-4-b',
      label: 'E · comparison · 128',
      x: 4,
      y: 128,
      series: 'comparison',
    },
    {
      id: 'grouped-v-4-c',
      label: 'E · baseline · 116',
      x: 4,
      y: 116,
      series: 'baseline',
    },
  ] satisfies ProofDatum[]
  const groupedVerticalBase = baseDefinition(
    [
      barY(groupedVerticalBars, {
        id: 'grouped-vertical-bars',
        x: 'x',
        y: 'y',
        z: 'series',
        color: 'series',
        key: 'id',
        layout: group({ padding: 0.16 }),
        inset: 2,
      }),
    ],
    scaleBand<number>().domain([0, 1, 2, 3, 4]).padding(0.15),
    scaleLinear().domain([0, 240]),
  )
  // source:grouped-vertical-bars:end

  // source:grouped-horizontal-bars:start
  const groupedHorizontalBars = [
    {
      id: 'grouped-h-0-a',
      label: 'A · observed · 140',
      x: 140,
      y: 0,
      series: 'observed',
    },
    {
      id: 'grouped-h-0-b',
      label: 'A · comparison · 118',
      x: 118,
      y: 0,
      series: 'comparison',
    },
    {
      id: 'grouped-h-1-a',
      label: 'B · observed · 155',
      x: 155,
      y: 1,
      series: 'observed',
    },
    {
      id: 'grouped-h-1-b',
      label: 'B · comparison · 132',
      x: 132,
      y: 1,
      series: 'comparison',
    },
    {
      id: 'grouped-horizontal-long',
      label: 'C · long grouped bar · 190',
      x: 190,
      y: 2,
      series: 'observed',
    },
    {
      id: 'grouped-horizontal-neighbor',
      label: 'C · nearby grouped endpoint · 82',
      x: 82,
      y: 2,
      series: 'comparison',
    },
    {
      id: 'grouped-h-3-a',
      label: 'D · observed · 126',
      x: 126,
      y: 3,
      series: 'observed',
    },
    {
      id: 'grouped-h-3-b',
      label: 'D · comparison · 146',
      x: 146,
      y: 3,
      series: 'comparison',
    },
    {
      id: 'grouped-h-4-a',
      label: 'E · observed · 112',
      x: 112,
      y: 4,
      series: 'observed',
    },
    {
      id: 'grouped-h-4-b',
      label: 'E · comparison · 124',
      x: 124,
      y: 4,
      series: 'comparison',
    },
  ] satisfies ProofDatum[]
  const groupedHorizontalBase = baseDefinition(
    [
      barX(groupedHorizontalBars, {
        id: 'grouped-horizontal-bars',
        x: 'x',
        y: 'y',
        z: 'series',
        color: 'series',
        key: 'id',
        layout: group({ padding: 0.16 }),
        inset: 2,
      }),
    ],
    scaleLinear().domain([0, 210]),
    scaleBand<number>().domain([0, 1, 2, 3, 4]).padding(0.15),
  )
  // source:grouped-horizontal-bars:end

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

  // source:scatterplot:start
  const scatterCloud = Array.from({ length: 54 }, (_, index) => ({
    id: `scatter-${index}`,
    label: `Scatter observation ${index + 1}`,
    x: 8 + (index % 18) * 5,
    y: 12 + Math.floor(index / 18) * 36,
    radius: 3 + (index % 3),
    color: index % 2 ? '#a3a3a3' : '#d4d4d4',
  })) satisfies ProofDatum[]
  const scatterRows = [
    ...scatterCloud,
    {
      id: 'scatter-emphasis',
      label: 'Large emphasized scatter observation',
      x: 40,
      y: 60,
      radius: 28,
      color: '#404040',
    },
    {
      id: 'scatter-decoy',
      label: 'Nearby tiny scatter anchor',
      x: 46,
      y: 60,
      radius: 3.5,
      color: '#737373',
    },
  ] satisfies ProofDatum[]
  const scatterBase = baseDefinition(
    [
      dot(scatterRows, {
        id: 'scatterplot',
        x: 'x',
        y: 'y',
        r: 'radius',
        key: 'id',
        fill: '#737373',
        fillOpacity: 0.72,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    scaleLinear().domain([0, 100]),
    scaleLinear().domain([0, 100]),
  )
  // source:scatterplot:end

  // source:hexbin:start
  const ordinaryHexbinCells = Array.from({ length: 36 }, (_, index) => ({
    id: `hexbin-${index}`,
    label: `Hexbin cell ${index + 1}`,
    x: 8 + (index % 12) * 7.5,
    y: 16 + Math.floor(index / 12) * 34,
    radius: 6 + (index % 4),
    color: index % 3 === 0 ? '#a3a3a3' : '#d4d4d4',
  })) satisfies ProofDatum[]
  const hexbinCells = [
    ...ordinaryHexbinCells,
    {
      id: 'dense-hexbin',
      label: 'Dense hexbin cell',
      x: 40,
      y: 60,
      radius: 28,
      color: '#404040',
    },
    {
      id: 'hexbin-decoy',
      label: 'Nearby sparse hexbin cell',
      x: 46,
      y: 60,
      radius: 3.5,
      color: '#737373',
    },
  ] satisfies ProofDatum[]
  const hexbinBase = baseDefinition(
    [
      hexagon(hexbinCells, {
        id: 'hexbin-cells',
        x: 'x',
        y: 'y',
        r: 'radius',
        key: 'id',
        fill: '#525252',
        fillOpacity: 0.76,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    scaleLinear().domain([0, 100]),
    scaleLinear().domain([0, 100]),
  )
  // source:hexbin:end

  // source:nested-bubbles:start
  const nestedBubbles = [
    {
      id: 'outer-bubble',
      label: 'Outer packed bubble',
      x: 50,
      y: 50,
      radius: 48,
      color: '#737373',
    },
    {
      id: 'inner-bubble',
      label: 'Topmost inner bubble',
      x: 50,
      y: 50,
      radius: 16,
      color: '#171717',
    },
  ] satisfies ProofDatum[]
  const nestedBubbleBase = baseDefinition(
    [
      dot(nestedBubbles, {
        id: 'nested-bubbles',
        x: 'x',
        y: 'y',
        r: 'radius',
        key: 'id',
        fill: '#525252',
        fillOpacity: 0.82,
        stroke: '#ffffff',
        strokeWidth: 2,
      }),
    ],
    scaleLinear().domain([0, 100]),
    scaleLinear().domain([0, 100]),
  )
  // source:nested-bubbles:end

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
      id: 'secondary-link',
      label: 'Secondary Sankey flow',
      polygon: [
        [0.16, 0.42],
        [0.52, 0.56],
        [0.52, 0.67],
        [0.16, 0.55],
      ],
      color: '#a3a3a3',
    },
    {
      id: 'recombined-link',
      label: 'Recombined Sankey flow',
      polygon: [
        [0.52, 0.56],
        [0.84, 0.58],
        [0.84, 0.74],
        [0.52, 0.67],
      ],
      color: '#737373',
    },
    {
      id: 'source-node',
      label: 'Sankey source node',
      polygon: [
        [0.12, 0.18],
        [0.17, 0.18],
        [0.17, 0.56],
        [0.12, 0.56],
      ],
      color: '#171717',
    },
    {
      id: 'middle-node',
      label: 'Sankey subtotal node',
      polygon: [
        [0.5, 0.45],
        [0.55, 0.45],
        [0.55, 0.69],
        [0.5, 0.69],
      ],
      color: '#737373',
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
    {
      id: 'sink-node',
      label: 'Sankey sink node',
      polygon: [
        [0.84, 0.56],
        [0.89, 0.56],
        [0.89, 0.76],
        [0.84, 0.76],
      ],
      color: '#171717',
    },
  ] satisfies ProofDatum[]
  const sankeyBase = baseDefinition(
    [normalizedPolygonMark('sankey', sankey)],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
  // source:sankey:end

  // source:faceted-grouped-bars:start
  const facetedGroupedBars = ['North', 'South'].flatMap((panel) =>
    [0, 1, 2].flatMap((x) =>
      ['observed', 'comparison'].map((series) => {
        const isTarget = panel === 'North' && x === 1 && series === 'observed'
        const isNeighbor =
          panel === 'North' && x === 1 && series === 'comparison'
        const value = isTarget
          ? 230
          : isNeighbor
            ? 92
            : 74 + x * 24 + (series === 'comparison' ? 18 : 0)
        return {
          id: isTarget
            ? 'faceted-grouped-target'
            : isNeighbor
              ? 'faceted-grouped-neighbor'
              : `${panel.toLowerCase()}-grouped-${x}-${series}`,
          label: isTarget
            ? 'North · tall grouped bar · 230'
            : isNeighbor
              ? 'North · nearby grouped endpoint · 92'
              : `${panel} · ${series} · ${value}`,
          panel,
          x,
          y: value,
          series,
        }
      }),
    ),
  ) satisfies ProofDatum[]
  const facetedGroupedBase = baseDefinition(
    [
      facet(facetedGroupedBars, {
        id: 'faceted-grouped-bars',
        by: 'panel',
        columns: 2,
        gap: 12,
        axes: 'cell',
        chart: (rows) => ({
          marks: [
            barY(rows, {
              id: 'grouped-bars',
              x: 'x',
              y: 'y',
              z: 'series',
              color: 'series',
              key: 'id',
              layout: group({ padding: 0.16 }),
              inset: 2,
            }),
          ],
          x: { scale: scaleBand<number>().domain([0, 1, 2]).padding(0.12) },
          y: { scale: scaleLinear().domain([0, 250]) },
          guides: false,
          margin: 0,
          clip: true,
        }),
      }),
    ],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
  // source:faceted-grouped-bars:end

  // source:faceted-stacked-bars:start
  const facetedStackedBars = ['North', 'South'].flatMap((panel) =>
    [0, 1, 2].flatMap((x) =>
      ['base', 'top'].map((series) => {
        const isBase = panel === 'North' && x === 1 && series === 'base'
        const isTop = panel === 'North' && x === 1 && series === 'top'
        const value = isBase
          ? 60
          : isTop
            ? 170
            : 48 + x * 13 + (series === 'top' ? 22 : 0)
        return {
          id: isBase
            ? 'faceted-stack-base'
            : isTop
              ? 'faceted-stack-top'
              : `${panel.toLowerCase()}-stack-${x}-${series}`,
          label: `${panel} · ${series} · ${value}`,
          panel,
          x,
          y: value,
          series,
        }
      }),
    ),
  ) satisfies ProofDatum[]
  const facetedStackedBase = baseDefinition(
    [
      facet(facetedStackedBars, {
        id: 'faceted-stacked-bars',
        by: 'panel',
        columns: 2,
        gap: 12,
        axes: 'cell',
        chart: (rows) => ({
          marks: [
            barY(rows, {
              id: 'stacked-bars',
              x: 'x',
              y: 'y',
              z: 'series',
              color: 'series',
              key: 'id',
              layout: stack({ order: ['base', 'top'] }),
              inset: 6,
            }),
          ],
          x: { scale: scaleBand<number>().domain([0, 1, 2]).padding(0.12) },
          y: { scale: scaleLinear().domain([0, 250]) },
          guides: false,
          margin: 0,
          clip: true,
        }),
      }),
    ],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
  // source:faceted-stacked-bars:end

  // source:faceted-bubbles:start
  const facetedBubbles = [
    {
      id: 'faceted-large-bubble',
      label: 'North · large bubble',
      panel: 'North',
      x: 40,
      y: 55,
      radius: 44,
    },
    {
      id: 'faceted-bubble-neighbor',
      label: 'North · nearby bubble',
      panel: 'North',
      x: 49,
      y: 55,
      radius: 5,
    },
    {
      id: 'faceted-north-other',
      label: 'North · other bubble',
      panel: 'North',
      x: 76,
      y: 30,
      radius: 12,
    },
    {
      id: 'faceted-south-large',
      label: 'South · large bubble',
      panel: 'South',
      x: 34,
      y: 62,
      radius: 28,
    },
    {
      id: 'faceted-south-near',
      label: 'South · nearby bubble',
      panel: 'South',
      x: 55,
      y: 48,
      radius: 9,
    },
    {
      id: 'faceted-south-other',
      label: 'South · other bubble',
      panel: 'South',
      x: 78,
      y: 25,
      radius: 14,
    },
  ] satisfies ProofDatum[]
  const facetedBubbleBase = baseDefinition(
    [
      facet(facetedBubbles, {
        id: 'faceted-bubbles',
        by: 'panel',
        columns: 2,
        gap: 12,
        axes: 'cell',
        chart: (rows) => ({
          marks: [
            dot(rows, {
              id: 'bubbles',
              x: 'x',
              y: 'y',
              r: 'radius',
              key: 'id',
              fillOpacity: 0.72,
              stroke: '#ffffff',
              strokeWidth: 1.5,
            }),
          ],
          x: { scale: scaleLinear().domain([0, 100]) },
          y: { scale: scaleLinear().domain([0, 100]) },
          guides: false,
          margin: 0,
          clip: true,
        }),
      }),
    ],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
  // source:faceted-bubbles:end

  // source:translated-clipped:start
  const translatedClipRows = [
    { id: 'clipped-target', label: 'Translated clipped rectangle' },
    { id: 'clipped-decoy', label: 'Nearby transformed anchor' },
  ] satisfies ProofDatum[]
  const translatedClipBase = baseDefinition(
    [translatedClipMark('translated-clipped', translatedClipRows)],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
  // source:translated-clipped:end

  // source:dense-rectangles:start
  const denseRectangleGrid = Array.from({ length: 4_096 }, (_, index) => {
    const columns = 128
    const rows = 32
    const column = index % columns
    const row = Math.floor(index / columns)
    const columnWidth = 0.36 / columns
    const rowHeight = 0.9 / rows
    return {
      id: `dense-cell-${index}`,
      label: `Dense cell ${index + 1}`,
      x1: 0.62 + column * columnWidth,
      x2: 0.62 + (column + 0.82) * columnWidth,
      y1: 0.05 + row * rowHeight,
      y2: 0.05 + (row + 0.82) * rowHeight,
      color: index % 2 ? '#d4d4d4' : '#e5e5e5',
    }
  }) satisfies ProofDatum[]
  const denseRectangles = [
    {
      id: 'dense-giant-rectangle',
      label: 'Giant rectangle across 4,098 regions',
      x1: 0.03,
      x2: 0.58,
      y1: 0.06,
      y2: 0.94,
      probe: [0.57, 0.5],
      color: '#404040',
    },
    {
      id: 'dense-rectangle-decoy',
      label: 'Closest micro-cell',
      x1: 0.584,
      x2: 0.604,
      y1: 0.47,
      y2: 0.53,
      color: '#a3a3a3',
    },
    ...denseRectangleGrid,
  ] satisfies ProofDatum[]
  const denseRectangleBase = baseDefinition(
    [normalizedRectMark('dense-rectangles', denseRectangles, 'xy')],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
  // source:dense-rectangles:end

  // source:complex-polygons:start
  const regularPolygon = (
    x: number,
    y: number,
    radius: number,
    vertices: number,
    wobble = 0,
    verticalRatio = 1,
  ) =>
    Array.from({ length: vertices }, (_, index) => {
      const angle = (index / vertices) * Math.PI * 2
      const adjustedRadius =
        radius * (1 + Math.sin(index * 17) * Math.max(0, wobble))
      return [
        x + Math.cos(angle) * adjustedRadius,
        y + Math.sin(angle) * adjustedRadius * verticalRatio,
      ] as const
    })
  const polygonCloud = Array.from({ length: 2_048 }, (_, index) => {
    const columns = 64
    const rows = 32
    const column = index % columns
    const row = Math.floor(index / columns)
    const x = 0.64 + ((column + 0.5) / columns) * 0.34
    const y = 0.06 + ((row + 0.5) / rows) * 0.88
    return {
      id: `cloud-polygon-${index}`,
      label: `Cloud polygon ${index + 1}`,
      polygon: regularPolygon(x, y, 0.0022, 6, 0, 3),
      color: index % 2 ? '#a3a3a3' : '#d4d4d4',
    }
  }) satisfies ProofDatum[]
  const complexPolygons = [
    {
      id: 'complex-giant-polygon',
      label: '1,024-vertex contour across 13,318 vertices',
      polygon: regularPolygon(0.31, 0.5, 0.26, 1_024, 0.03),
      probe: [0.56, 0.5],
      color: '#404040',
    },
    {
      id: 'complex-polygon-decoy',
      label: 'Closest six-vertex polygon',
      polygon: regularPolygon(0.59, 0.5, 0.014, 6),
      color: '#a3a3a3',
    },
    ...polygonCloud,
  ] satisfies ProofDatum[]
  const complexPolygonBase = baseDefinition(
    [normalizedPolygonMark('complex-polygons', complexPolygons)],
    scaleLinear().domain([0, 1]),
    scaleLinear().domain([0, 1]),
  )
  // source:complex-polygons:end

  // source:mixed-vertical-bars-line-dots:start
  const mixedVerticalBars = Array.from({ length: 9 }, (_, x) => {
    const target = x === 4
    const y = target ? 220 : 58 + ((x * 17) % 42)
    return {
      id: target ? 'mixed-vertical-target' : `mixed-vertical-bar-${x}`,
      label: target
        ? 'Tall observed bar · 220'
        : `Observed bar ${x + 1} · ${y}`,
      x,
      y,
      series: 'Observed',
    }
  }) satisfies ProofDatum[]
  const mixedVerticalForecast = Array.from({ length: 9 }, (_, x) => {
    const y = x === 4 ? 75 : 70 + ((x * 13) % 35)
    return {
      id: x === 4 ? 'mixed-forecast-decoy' : `mixed-forecast-${x}`,
      label:
        x === 4
          ? 'Forecast point at target category · 75'
          : `Forecast point ${x + 1} · ${y}`,
      x,
      y,
      series: 'Forecast',
    }
  }) satisfies ProofDatum[]
  const mixedVerticalBase = baseDefinition(
    [
      barY(mixedVerticalBars, {
        id: 'mixed-observed-bars',
        x: 'x',
        y: 'y',
        z: 'series',
        key: 'id',
        inset: 5,
        fill: '#d4d4d4',
      }),
      lineY(mixedVerticalForecast, {
        id: 'mixed-forecast-line',
        x: 'x',
        y: 'y',
        z: 'series',
        key: 'id',
        stroke: '#525252',
        strokeWidth: 2,
      }),
      dot(mixedVerticalForecast, {
        id: 'mixed-forecast-dots',
        x: 'x',
        y: 'y',
        z: 'series',
        key: 'id',
        r: 5,
        fill: '#737373',
      }),
    ],
    scaleBand<number>().domain([0, 1, 2, 3, 4, 5, 6, 7, 8]),
    scaleLinear().domain([0, 240]),
  )
  // source:mixed-vertical-bars-line-dots:end

  // source:mixed-horizontal-bars-dots:start
  const mixedHorizontalBars = Array.from({ length: 7 }, (_, y) => {
    const target = y === 3
    const x = target ? 220 : 45 + ((y * 11) % 35)
    return {
      id: target ? 'mixed-horizontal-target' : `mixed-horizontal-bar-${y}`,
      label: target
        ? 'Long interval bar · 220'
        : `Interval bar ${y + 1} · ${x}`,
      x,
      y,
      series: 'Interval',
    }
  }) satisfies ProofDatum[]
  const mixedHorizontalDots = Array.from({ length: 7 }, (_, y) => {
    const x = y === 3 ? 85 : 30 + ((y * 7) % 15)
    return {
      id: y === 3 ? 'mixed-horizontal-decoy' : `mixed-horizontal-dot-${y}`,
      label:
        y === 3 ? 'Nearby event in target lane · 85' : `Event ${y + 1} · ${x}`,
      x,
      y,
      series: 'Event',
    }
  }) satisfies ProofDatum[]
  const mixedHorizontalBase = baseDefinition(
    [
      barX(mixedHorizontalBars, {
        id: 'mixed-interval-bars',
        x: 'x',
        y: 'y',
        z: 'series',
        key: 'id',
        inset: 5,
        fill: '#d4d4d4',
      }),
      dot(mixedHorizontalDots, {
        id: 'mixed-lane-events',
        x: 'x',
        y: 'y',
        z: 'series',
        key: 'id',
        r: 5,
        fill: '#737373',
      }),
    ],
    scaleLinear().domain([0, 240]),
    scaleBand<number>().domain([0, 1, 2, 3, 4, 5, 6]),
  )
  // source:mixed-horizontal-bars-dots:end

  // source:mixed-area-line-dots:start
  const mixedAreaRows = [80, 140, 190, 210, 150, 90].map((y, x) => ({
    id: x === 3 ? 'mixed-area-peak' : `mixed-area-${x}`,
    label: x === 3 ? 'Area peak · 210' : `Area sample ${x + 1} · ${y}`,
    x,
    y,
    series: 'Trend',
  })) satisfies ProofDatum[]
  const mixedAreaDots = [
    {
      id: 'mixed-area-dot-1',
      label: 'Observation 2 · 110',
      x: 1,
      y: 110,
      series: 'Observation',
    },
    {
      id: 'mixed-area-decoy',
      label: 'Nearby observation at peak · 85',
      x: 3,
      y: 85,
      series: 'Observation',
    },
    {
      id: 'mixed-area-dot-4',
      label: 'Observation 5 · 120',
      x: 4,
      y: 120,
      series: 'Observation',
    },
  ] satisfies ProofDatum[]
  const mixedAreaBase = baseDefinition(
    [
      areaY(mixedAreaRows, {
        id: 'mixed-area',
        x: 'x',
        y: 'y',
        z: 'series',
        key: 'id',
        fill: '#d4d4d4',
        fillOpacity: 0.72,
      }),
      lineY(mixedAreaRows, {
        id: 'mixed-area-line',
        x: 'x',
        y: 'y',
        z: 'series',
        key: 'id',
        stroke: '#525252',
        strokeWidth: 2,
      }),
      dot(mixedAreaDots, {
        id: 'mixed-area-observations',
        x: 'x',
        y: 'y',
        z: 'series',
        key: 'id',
        r: 5,
        fill: '#737373',
      }),
    ],
    scaleLinear().domain([0, 5]),
    scaleLinear().domain([0, 240]),
  )
  // source:mixed-area-line-dots:end

  // source:mixed-cell-bubble:start
  const mixedCell = [
    {
      id: 'mixed-background-cell',
      label: 'Background heatmap cell',
      x1: 0,
      x2: 100,
      y1: 0,
      y2: 100,
    },
  ] satisfies ProofDatum[]
  const mixedCellBubble = [
    {
      id: 'mixed-overlay-bubble',
      label: 'Topmost overlay bubble',
      x: 65,
      y: 50,
      radius: 70,
    },
  ] satisfies ProofDatum[]
  const mixedCellBubbleBase = baseDefinition(
    [
      rect(mixedCell, {
        id: 'mixed-background-cell',
        x1: 'x1',
        x2: 'x2',
        y1: 'y1',
        y2: 'y2',
        key: 'id',
        inset: 8,
        fill: '#d4d4d4',
      }),
      dot(mixedCellBubble, {
        id: 'mixed-overlay-bubble',
        x: 'x',
        y: 'y',
        r: 'radius',
        key: 'id',
        fill: '#737373',
        fillOpacity: 0.82,
      }),
    ],
    scaleLinear().domain([0, 100]),
    scaleLinear().domain([0, 100]),
  )
  // source:mixed-cell-bubble:end

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
      id: 'grouped-vertical-bars',
      title: 'Grouped vertical bars',
      affinity: 'x',
      explanation:
        'Each subgroup owns its complete rectangle. A nearby series endpoint in the same category cannot steal the interior of a taller grouped bar.',
      beforeExpected: 'C · nearby grouped endpoint · 90',
      afterExpected: 'C · tall grouped bar · 220',
      base: groupedVerticalBase,
      probe: (scene) => pointAtValue(scene, 'grouped-vertical-tall', 'y', 90),
    }),
    makeCase({
      id: 'grouped-horizontal-bars',
      title: 'Grouped horizontal bars',
      affinity: 'y',
      explanation:
        'Horizontal subgroup geometry behaves symmetrically: containment wins inside the long bar, then row affinity handles empty space.',
      beforeExpected: 'C · nearby grouped endpoint · 82',
      afterExpected: 'C · long grouped bar · 190',
      base: groupedHorizontalBase,
      probe: (scene) => pointAtValue(scene, 'grouped-horizontal-long', 'x', 82),
    }),
    makeCase({
      id: 'mixed-vertical-bars-line-dots',
      title: 'Mixed vertical bars, line, and points',
      affinity: 'x',
      affinityLabel: 'bar x · line x · dot xy',
      explanation:
        'Each built-in mark contributes its own affinity. Inside the tall bar, rectangle containment wins before the nearby forecast line and point can use their fallback anchors.',
      beforeExpected: 'Forecast point at target category · 75',
      afterExpected: 'Tall observed bar · 220',
      grouped: {
        axis: 'x',
        expected: [
          'Forecast point at target category · 75',
          'Tall observed bar · 220',
        ],
      },
      base: mixedVerticalBase,
      probe: (scene) => pointAtValue(scene, 'mixed-vertical-target', 'y', 100),
    }),
    makeCase({
      id: 'mixed-horizontal-bars-dots',
      title: 'Mixed horizontal intervals and events',
      affinity: 'y',
      affinityLabel: 'bar y · dot xy',
      explanation:
        'The long interval owns its row-shaped body while event dots retain ordinary two-dimensional targeting. The chart does not need to choose one policy for both.',
      beforeExpected: 'Nearby event in target lane · 85',
      afterExpected: 'Long interval bar · 220',
      grouped: {
        axis: 'y',
        expected: [
          'Nearby event in target lane · 85',
          'Long interval bar · 220',
        ],
      },
      base: mixedHorizontalBase,
      probe: (scene) =>
        pointAtValue(scene, 'mixed-horizontal-target', 'x', 105),
    }),
    makeCase({
      id: 'mixed-area-line-dots',
      title: 'Mixed area, boundary line, and observations',
      affinity: 'x',
      affinityLabel: 'area x · line x · dot xy',
      explanation:
        'The filled area remains selectable between its boundary and baseline, while the line and observation dots keep their own narrower geometry and fallback behavior.',
      beforeExpected: 'Nearby observation at peak · 85',
      afterExpected: 'Area peak · 210',
      grouped: {
        axis: 'x',
        expected: ['Nearby observation at peak · 85', 'Area peak · 210'],
      },
      base: mixedAreaBase,
      probe: (scene) => pointAtValue(scene, 'mixed-area-peak', 'y', 105),
    }),
    makeCase({
      id: 'mixed-cell-bubble',
      title: 'Overlaid heatmap cell and bubble',
      affinity: 'xy',
      affinityLabel: 'rect xy · dot xy · paint order',
      explanation:
        'Both primitives contain the pointer. Reverse scene traversal selects the large bubble painted on top even though the background cell center is the closer legacy anchor.',
      beforeExpected: 'Background heatmap cell',
      afterExpected: 'Topmost overlay bubble',
      base: mixedCellBubbleBase,
      probe: (scene) => circleEdgeProbe(scene, 'mixed-overlay-bubble', -0.9),
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
      id: 'scatterplot',
      title: 'Dense scatterplot with an emphasized point',
      affinity: 'xy',
      explanation:
        'The resolver tests every rendered circle radius, so a highlighted observation remains targetable at its edge even when a tiny nearby anchor is closer.',
      beforeExpected: 'Nearby tiny scatter anchor',
      afterExpected: 'Large emphasized scatter observation',
      base: scatterBase,
      probe: (scene) => circleEdgeProbe(scene, 'scatter-emphasis', 0.8),
    }),
    makeCase({
      id: 'hexbin',
      title: 'Hexbin density cells',
      affinity: 'xy',
      explanation:
        'Each pre-binned density cell contributes its rendered six-sided polygon; the dense cell wins across its area instead of losing to a sparse cell center.',
      beforeExpected: 'Nearby sparse hexbin cell',
      afterExpected: 'Dense hexbin cell',
      base: hexbinBase,
      probe: (scene) => areaEdgeProbe(scene, 'dense-hexbin', 0.82),
    }),
    makeCase({
      id: 'nested-bubbles',
      title: 'Nested bubbles and paint order',
      affinity: 'xy',
      explanation:
        'Both bubbles contain the pointer and share one anchor. Reverse scene traversal deliberately selects the smaller inner bubble painted on top.',
      beforeExpected: 'Outer packed bubble',
      afterExpected: 'Topmost inner bubble',
      base: nestedBubbleBase,
      probe: (scene) => circleEdgeProbe(scene, 'inner-bubble', 0),
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
      beforeExpected: 'Recombined Sankey flow',
      afterExpected: 'Wide Sankey / network link',
      base: sankeyBase,
      probe: normalizedDatumProbe('wide-link'),
    }),
    makeCase({
      id: 'faceted-bars',
      title: 'Faceted tall bars',
      affinity: 'x',
      explanation:
        'The target is attached before facet layout. Scene traversal applies the final cell translation and clip once, so its visible rectangle remains authoritative.',
      beforeExpected: 'North neighbor · 90',
      afterExpected: 'North tall bar · 240',
      base: facetedBase,
      probe: (scene) => rectProbe(scene, 'north-tall', 0.5, 0.625),
    }),
    makeCase({
      id: 'faceted-grouped-bars',
      title: 'Faceted grouped bars',
      affinity: 'x',
      explanation:
        'Facet translation and subgroup layout both happen before interaction targets are collected, so the final side-by-side rectangle remains authoritative.',
      beforeExpected: 'North · nearby grouped endpoint · 92',
      afterExpected: 'North · tall grouped bar · 230',
      base: facetedGroupedBase,
      probe: (scene) => rectProbe(scene, 'faceted-grouped-target', 0.9, 0.6),
    }),
    makeCase({
      id: 'faceted-stacked-bars',
      title: 'Faceted stacked bars',
      affinity: 'x',
      explanation:
        'The final stacked segment rectangle wins inside its facet; an earlier segment endpoint at the same category no longer steals the pointer.',
      beforeExpected: 'North · base · 60',
      afterExpected: 'North · top · 170',
      base: facetedStackedBase,
      probe: (scene) => rectProbe(scene, 'faceted-stack-top', 0.5, 0.62),
    }),
    makeCase({
      id: 'faceted-bubbles',
      title: 'Faceted bubbles',
      affinity: 'xy',
      explanation:
        'Circle containment is evaluated after facet translation and clipping, so another bubble anchor cannot steal the painted edge of a large bubble.',
      beforeExpected: 'North · nearby bubble',
      afterExpected: 'North · large bubble',
      base: facetedBubbleBase,
      probe: (scene) => circleEdgeProbe(scene, 'faceted-large-bubble', 0.82),
    }),
    makeCase({
      id: 'translated-clipped',
      title: 'Nested transforms and clipping',
      affinity: 'xy',
      explanation:
        'The primitive stays in local coordinates. The resolver follows the same group translation and clip as the renderer instead of maintaining translated interaction geometry beside it.',
      beforeExpected: 'Nearby transformed anchor',
      afterExpected: 'Translated clipped rectangle',
      base: translatedClipBase,
      probe: (scene) => rectProbe(scene, 'clipped-target', 0.82, 0.82),
    }),
    makeCase({
      id: 'dense-rectangles',
      title: 'Stress: thousands of rectangles',
      affinity: 'xy',
      stress: { geometryLabel: '4,098 rectangles', height: 320 },
      explanation:
        'A giant region sits behind 4,097 later-painted rectangles. The exact pass must reject every unrelated boundary before finding the containing shape.',
      beforeExpected: 'Closest micro-cell',
      afterExpected: 'Giant rectangle across 4,098 regions',
      base: denseRectangleBase,
      probe: normalizedDatumProbe('dense-giant-rectangle'),
    }),
    makeCase({
      id: 'complex-polygons',
      title: 'Stress: thousands of complex polygons',
      affinity: 'geometry',
      stress: {
        geometryLabel: '2,050 polygons · 13,318 vertices',
        height: 320,
      },
      explanation:
        'A 1,024-vertex contour sits behind 2,049 later-painted polygons, forcing a worst-direction containment scan without an axis shortcut.',
      beforeExpected: 'Closest six-vertex polygon',
      afterExpected: '1,024-vertex contour across 13,318 vertices',
      base: complexPolygonBase,
      probe: normalizedDatumProbe('complex-giant-polygon'),
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
  input: Omit<
    ProofCase,
    'before' | 'after' | 'grouped' | 'renderer' | 'source'
  > & {
    base: StaticChartDefinition<ProofDatum, number, number>
    grouped?: {
      axis: 'x' | 'y'
      expected: readonly string[]
    }
  },
): ProofCase {
  const { base, grouped, ...proof } = input
  return {
    ...proof,
    renderer: canvasProofIds.has(proof.id) ? 'canvas' : 'svg',
    source: sourceSection(proof.id),
    before: interactiveDefinition(base, legacyPointFocus),
    after: interactiveDefinition(base),
    grouped: grouped
      ? {
          ...grouped,
          definition: groupedInteractiveDefinition(base, grouped.axis),
        }
      : undefined,
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

function groupedInteractiveDefinition(
  base: StaticChartDefinition<ProofDatum, number, number>,
  axis: 'x' | 'y',
) {
  return defineChart(base, {
    focus: axis === 'x' ? 'group-x' : 'group-y',
    maxFocusDistance: 48,
    animate: false,
    tooltip: {
      use: tooltip,
      className: 'hit-region-proof__tooltip',
      sticky: true,
      anchor: 'group-center',
      placement: ['top', 'right', 'left', 'bottom'],
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
        const point: ChartPoint<ProofDatum, number, number> = {
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
          color: datum.color ?? '#404040',
        }
        nodes.push({
          kind: 'rect',
          key: datum.id,
          x,
          y,
          width,
          height,
          radius: 4,
          interaction: { point, affinity: focusAffinity },
          style: { fill: datum.color ?? '#404040', fillOpacity: 0.78 },
        })
        points.push(point)
      })
      return { nodes, points }
    },
  }))
}
// source:normalized-rect-mark:end

// source:translated-clip-mark:start
function translatedClipMark(id: string, data: readonly ProofDatum[]) {
  return createMark<ProofDatum, number, number>(() => ({
    id,
    channels: {},
    render: ({ chart }) => {
      const translateX = chart.x + chart.width * 0.08
      const translateY = chart.y + chart.height * 0.1
      const targetWidth = chart.width * 0.62
      const targetHeight = chart.height * 0.72
      const target: ChartPoint<ProofDatum, number, number> = {
        key: data[0]!.id,
        markId: id,
        group: null,
        groupLabel: id,
        datum: data[0]!,
        datumIndex: 0,
        xValue: 0.31,
        yValue: 0.36,
        x: translateX + targetWidth / 2,
        y: translateY + targetHeight / 2,
        color: '#404040',
      }
      const decoyX = chart.width * 0.485
      const decoyY = chart.height * 0.56
      const decoyWidth = chart.width * 0.02
      const decoyHeight = chart.height * 0.06
      const decoy: ChartPoint<ProofDatum, number, number> = {
        key: data[1]!.id,
        markId: id,
        group: null,
        groupLabel: id,
        datum: data[1]!,
        datumIndex: 1,
        xValue: 0.495,
        yValue: 0.59,
        x: translateX + decoyX + decoyWidth / 2,
        y: translateY + decoyY + decoyHeight / 2,
        color: '#a3a3a3',
      }
      return {
        nodes: [
          {
            kind: 'group',
            key: `${id}:translated`,
            translateX,
            translateY,
            clip: {
              x: 0,
              y: 0,
              width: chart.width * 0.52,
              height: chart.height * 0.65,
            },
            children: [
              {
                kind: 'rect',
                key: target.key,
                x: 0,
                y: 0,
                width: targetWidth,
                height: targetHeight,
                radius: 12,
                interaction: { point: target, affinity: 'xy' },
                style: { fill: '#404040', fillOpacity: 0.78 },
              },
              {
                kind: 'rect',
                key: decoy.key,
                x: decoyX,
                y: decoyY,
                width: decoyWidth,
                height: decoyHeight,
                radius: 3,
                interaction: { point: decoy, affinity: 'xy' },
                style: { fill: '#a3a3a3' },
              },
            ],
          },
        ],
        points: [target, decoy],
      }
    },
  }))
}
// source:translated-clip-mark:end

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
        const point: ChartPoint<ProofDatum, number, number> = {
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
          color: datum.color ?? '#404040',
        }
        nodes.push({
          kind: 'area',
          key: datum.id,
          points: polygon,
          interaction: { point, affinity: 'geometry' },
          style: {
            fill: datum.color ?? '#404040',
            fillOpacity: 0.78,
            stroke: '#ffffff',
            strokeWidth: 1,
          },
        })
        points.push(point)
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
  const target = findSceneTarget(scene.nodes, id)
  if (target?.node.kind !== 'dot') return null
  return {
    x: target.offsetX + target.node.x + target.node.radius * amount,
    y: target.offsetY + target.node.y,
  }
}

function areaEdgeProbe(
  scene: ChartScene<ProofDatum, number, number>,
  id: string,
  amount: number,
) {
  const target = findSceneTarget(scene.nodes, id)
  if (target?.node.kind !== 'area' || !target.node.points.length) return null
  const center = target.node.points.reduce(
    (result, point) => ({ x: result.x + point[0], y: result.y + point[1] }),
    { x: 0, y: 0 },
  )
  center.x /= target.node.points.length
  center.y /= target.node.points.length
  const edge = target.node.points.reduce((rightmost, point) =>
    point[0] > rightmost[0] ? point : rightmost,
  )
  return {
    x: target.offsetX + center.x + (edge[0] - center.x) * amount,
    y: target.offsetY + center.y + (edge[1] - center.y) * amount,
  }
}

function rectProbe(
  scene: ChartScene<ProofDatum, number, number>,
  id: string,
  xAmount: number,
  yAmount: number,
) {
  const target = findSceneTarget(scene.nodes, id)
  if (target?.node.kind !== 'rect') return null
  return {
    x: target.offsetX + target.node.x + target.node.width * xAmount,
    y: target.offsetY + target.node.y + target.node.height * yAmount,
  }
}

function findSceneTarget(
  nodes: readonly SceneNode[],
  datumId: string,
  offsetX = 0,
  offsetY = 0,
): {
  node: Exclude<SceneNode, { kind: 'group' | 'label' }>
  offsetX: number
  offsetY: number
} | null {
  for (const node of nodes) {
    if (node.kind === 'group') {
      const target = findSceneTarget(
        node.children,
        datumId,
        offsetX + (node.translateX ?? 0),
        offsetY + (node.translateY ?? 0),
      )
      if (target) return target
      continue
    }
    if (node.kind === 'label' || !node.interaction) continue
    const matches = node.interaction.point
      ? (node.interaction.point.datum as ProofDatum).id === datumId
      : node.interaction.points.some(
          (point) => (point.datum as ProofDatum).id === datumId,
        )
    if (matches) return { node, offsetX, offsetY }
  }
  return null
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
