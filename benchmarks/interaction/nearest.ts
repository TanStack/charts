import { performance } from 'node:perf_hooks'
import { Delaunay } from 'd3-delaunay'
import { quadtree } from 'd3-quadtree'
import { nearestPoint } from '../../packages/charts-core/src/nearest'
import type {
  ChartPoint,
  ChartValue,
} from '../../packages/charts-core/src/types'

interface Datum {
  index: number
}

interface PointerQuery {
  x: number
  y: number
  maxDistance: number
}

interface PointerCase {
  label: string
  points: readonly ChartPoint<Datum, number, number>[]
  queries: readonly PointerQuery[]
  repetitions: number
}

interface VegaRectItem {
  point: ChartPoint<Datum, number, number>
  bounds: {
    x1: number
    y1: number
    x2: number
    y2: number
    contains: (x: number, y: number) => boolean
  }
}

type Resolver = (
  points: readonly ChartPoint<Datum, number, number>[],
  x: number,
  y: number,
  maxDistance: number,
) => ChartPoint<Datum, number, number> | null

type Implementation = readonly [label: string, resolver: Resolver]

const densePoints = Array.from({ length: 10_000 }, (_, index) =>
  point(index, index % 1_000, Math.floor(index / 1_000) * 20),
)
const rectangles = Array.from({ length: 10_000 }, (_, index) => {
  const x = (index % 200) * 6
  const y = Math.floor(index / 200) * 10
  return point(index, x + 2.5, y, {
    kind: 'rect',
    x,
    y,
    width: 5,
    height: 9,
  })
})
const stackedRectangles = Array.from({ length: 10_000 }, (_, index) => {
  const category = Math.floor(index / 10)
  const segment = index % 10
  const x = category * 12
  const y = 200 - (segment + 1) * 20
  return point(
    index,
    x + 5,
    y,
    { kind: 'rect', x, y, width: 10, height: 20 },
    'x',
  )
})
const circles = Array.from({ length: 10_000 }, (_, index) => {
  const x = (index % 200) * 8
  const y = Math.floor(index / 200) * 8
  return point(index, x, y, { kind: 'circle', x, y, radius: 3.5 })
})
const hexagons = Array.from({ length: 2_000 }, (_, index) => {
  const x = (index % 100) * 14
  const y = Math.floor(index / 100) * 14
  const radius = 6
  const vertices = Array.from({ length: 6 }, (__, vertex) => {
    const angle = (Math.PI / 3) * vertex
    return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius] as const
  })
  return point(index, x, y, { kind: 'polygon', points: vertices })
})

const cases: readonly PointerCase[] = [
  {
    label: '10k points · ordinary nearest',
    points: densePoints,
    queries: queries(16, (index) => ({
      x: 23 + index * 57,
      y: 89,
      maxDistance: 48,
    })),
    repetitions: 4,
  },
  {
    label: '10k rectangles · containment',
    points: rectangles,
    queries: queries(16, (index) => {
      const target = rectangles[(index * 613) % rectangles.length]!
      return { x: target.x, y: target.y + 4, maxDistance: 48 }
    }),
    repetitions: 4,
  },
  {
    label: '10k stacked rectangles · x fallback',
    points: stackedRectangles,
    queries: queries(16, (index) => ({
      x: ((index * 61) % 1_000) * 12 + 5,
      y: index % 2 ? -12 : 212,
      maxDistance: 48,
    })),
    repetitions: 4,
  },
  {
    label: '10k circles · containment',
    points: circles,
    queries: queries(16, (index) => {
      const target = circles[(index * 613) % circles.length]!
      return { x: target.x + 2, y: target.y, maxDistance: 48 }
    }),
    repetitions: 4,
  },
  {
    label: '2k polygons · off-shape fallback',
    points: hexagons,
    queries: queries(16, (index) => ({
      x: index * 83 + 7,
      y: 300,
      maxDistance: 48,
    })),
    repetitions: 8,
  },
]

const implementations: readonly Implementation[] = [
  ['anchor-only baseline', anchorNearestPoint],
  ['unoptimized POC', pocNearestPoint],
  ['optimized geometry', nearestPoint],
] as const

const comparisonCase: PointerCase = {
  label: '10k point-only targets',
  points: densePoints,
  queries: queries(128, (index) => ({
    x: ((index * 83) % 997) + 0.37,
    y: 90 + Math.sin((index / 128) * Math.PI * 2) * 82 + 0.19,
    maxDistance: 48,
  })),
  repetitions: 16,
}
const rectangleComparisonCase: PointerCase = {
  label: '10k contained rectangles',
  points: rectangles,
  queries: queries(128, (index) => {
    const target = rectangles[(index * 613) % rectangles.length]!
    return { x: target.x, y: target.y + 4, maxDistance: 48 }
  }),
  repetitions: 16,
}
const vegaRectItems: readonly VegaRectItem[] = rectangles.map((point) => {
  if (point.hitRegion?.kind !== 'rect') {
    throw new Error('Expected rectangle benchmark geometry')
  }
  const { x, y, width, height } = point.hitRegion
  const bounds = {
    x1: Math.min(x, x + width),
    y1: Math.min(y, y + height),
    x2: Math.max(x, x + width),
    y2: Math.max(y, y + height),
    contains(px: number, py: number) {
      return !(px < this.x1 || px > this.x2 || py < this.y1 || py > this.y2)
    },
  }
  return { point, bounds }
})
const plotIndexes = Uint32Array.from(densePoints, (_point, index) => index)
const plotX = Float64Array.from(densePoints, (point) => point.x)
const plotY = Float64Array.from(densePoints, (point) => point.y)
const plotPx = (index: number) => plotX[index]!
const plotPy = (index: number) => plotY[index]!
const quadtreeIndex = quadtree<ChartPoint<Datum, number, number>>()
  .x((point) => point.x)
  .y((point) => point.y)
  .addAll([...densePoints])
const delaunayIndex = Delaunay.from(
  densePoints,
  (point) => point.x,
  (point) => point.y,
)
let delaunayCursor = 0
const comparisonImplementations: readonly Implementation[] = [
  ['current prod · linear anchor', anchorNearestPoint],
  ['new geometry · point-only', nearestPoint],
  ['Observable Plot 0.6.17 · pointer kernel', plotPointerNearestPoint],
  ['D3 quadtree 3.0.1 · indexed', quadtreeNearestPoint],
  ['D3 Delaunay 6.0.4 · cold start', delaunayNearestPoint],
  ['D3 Delaunay 6.0.4 · coherent start', coherentDelaunayNearestPoint],
] as const
const rectangleComparisonImplementations: readonly Implementation[] = [
  ['new geometry · generic rect', nearestPoint],
  ['Vega 5.2.1 · bounds-only lower bound', vegaBoundsNearestPoint],
] as const
const collectGarbage = (globalThis as { gc?: () => void }).gc

verifyEquivalentResults()
verifyComparisonResults()
verifyRectangleComparisonResults()
console.log(`Pointer resolution · ${process.version} · ${process.arch}`)
console.log(
  'Production is a speed baseline; geometry rows intentionally add semantics it cannot return.',
)
console.log('| Case | Resolver | Median / query | p95 / query |')
console.log('| --- | --- | ---: | ---: |')

let checksum = 0
const scenarioMeasurements: Array<{
  benchmark: PointerCase
  measurements: Map<string, number[]>
}> = []
for (const benchmark of cases) {
  const measurements = measure(benchmark)
  scenarioMeasurements.push({ benchmark, measurements })
  for (const [label] of implementations) {
    const samples = measurements.get(label)!
    console.log(
      `| ${benchmark.label} | ${label} | ${formatDuration(percentile(samples, 0.5))} | ${formatDuration(percentile(samples, 0.95))} |`,
    )
  }
}
printScenarioComparisons(scenarioMeasurements)

console.log('\nPoint-only comparison · identical targets on this fixture')
console.log('| Resolver | Median / query | p95 / query |')
console.log('| --- | ---: | ---: |')
const comparisonMeasurements = measure(
  comparisonCase,
  comparisonImplementations,
)
for (const [label] of comparisonImplementations) {
  const samples = comparisonMeasurements.get(label)!
  console.log(
    `| ${label} | ${formatDuration(percentile(samples, 0.5))} | ${formatDuration(percentile(samples, 0.95))} |`,
  )
}
printAsciiDurations(comparisonMeasurements, comparisonImplementations)
printIndexBuildTimes()
printIndexStorage()

console.log(
  '\nRectangle containment comparison · identical targets on this fixture',
)
console.log(
  'Vega result is a bounds-only lower bound; its Canvas picker then builds and tests the mark path.',
)
console.log('| Resolver | Median / query | p95 / query |')
console.log('| --- | ---: | ---: |')
const rectangleComparisonMeasurements = measure(
  rectangleComparisonCase,
  rectangleComparisonImplementations,
)
for (const [label] of rectangleComparisonImplementations) {
  const samples = rectangleComparisonMeasurements.get(label)!
  console.log(
    `| ${label} | ${formatDuration(percentile(samples, 0.5))} | ${formatDuration(percentile(samples, 0.95))} |`,
  )
}
printAsciiDurations(
  rectangleComparisonMeasurements,
  rectangleComparisonImplementations,
)
console.log(`checksum: ${checksum}`)

function measure(
  benchmark: PointerCase,
  resolvers: readonly Implementation[] = implementations,
) {
  for (let round = 0; round < 3; round += 1) {
    for (const [, resolver] of resolvers) run(resolver, benchmark)
  }

  const samples = new Map(resolvers.map(([label]) => [label, [] as number[]]))
  for (let round = 0; round < 18; round += 1) {
    for (let offset = 0; offset < resolvers.length; offset += 1) {
      const [label, resolver] = resolvers[(round + offset) % resolvers.length]!
      collectGarbage?.()
      const startedAt = performance.now()
      run(resolver, benchmark)
      samples
        .get(label)!
        .push(
          (performance.now() - startedAt) /
            (benchmark.queries.length * benchmark.repetitions),
        )
    }
  }
  for (const values of samples.values()) {
    values.sort((left, right) => left - right)
  }
  return samples
}

function run(resolver: Resolver, benchmark: PointerCase) {
  for (
    let repetition = 0;
    repetition < benchmark.repetitions;
    repetition += 1
  ) {
    for (const query of benchmark.queries) {
      const result = resolver(
        benchmark.points,
        query.x,
        query.y,
        query.maxDistance,
      )
      checksum = (checksum + (result?.datumIndex ?? 0) + 1) % 1_000_000_007
    }
  }
}

function anchorNearestPoint<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  x: number,
  y: number,
  maxDistance: number,
) {
  let result: ChartPoint<TDatum, TXValue, TYValue> | undefined
  let resultDistance = Infinity
  for (const candidate of points) {
    const dx = candidate.x - x
    const dy = candidate.y - y
    const distance = dx * dx + dy * dy
    if (distance < resultDistance) {
      result = candidate
      resultDistance = distance
    }
  }
  return resultDistance <= Math.max(0, maxDistance) ** 2
    ? (result ?? null)
    : null
}

// Selection loop copied from Observable Plot 0.6.17 pointer(), excluding DOM
// coordinate conversion, rendering, pooling, and event dispatch.
function plotPointerNearestPoint(
  points: readonly ChartPoint<Datum, number, number>[],
  x: number,
  y: number,
  maxDistance: number,
) {
  let resultIndex = -1
  let resultDistance = Math.max(0, maxDistance) ** 2
  for (const index of plotIndexes) {
    const dx = plotPx(index) - x
    const dy = plotPy(index) - y
    const distance = dx * dx + dy * dy
    if (distance <= resultDistance) {
      resultIndex = index
      resultDistance = distance
    }
  }
  return resultIndex < 0 ? null : (points[resultIndex] ?? null)
}

function quadtreeNearestPoint(
  _points: readonly ChartPoint<Datum, number, number>[],
  x: number,
  y: number,
  maxDistance: number,
) {
  return quadtreeIndex.find(x, y, Math.max(0, maxDistance)) ?? null
}

function delaunayNearestPoint(
  points: readonly ChartPoint<Datum, number, number>[],
  x: number,
  y: number,
  maxDistance: number,
) {
  return pointWithinDistance(
    points[delaunayIndex.find(x, y)],
    x,
    y,
    maxDistance,
  )
}

function coherentDelaunayNearestPoint(
  points: readonly ChartPoint<Datum, number, number>[],
  x: number,
  y: number,
  maxDistance: number,
) {
  delaunayCursor = delaunayIndex.find(x, y, delaunayCursor)
  return pointWithinDistance(points[delaunayCursor], x, y, maxDistance)
}

function pointWithinDistance(
  point: ChartPoint<Datum, number, number> | undefined,
  x: number,
  y: number,
  maxDistance: number,
) {
  if (!point) return null
  const dx = point.x - x
  const dy = point.y - y
  return dx * dx + dy * dy <= Math.max(0, maxDistance) ** 2 ? point : null
}

// Vega's Canvas picker traverses the scene in reverse paint order and first
// rejects items against cached bounds. This intentionally stops before Vega's
// mark-specific Canvas path test, so it is a lower bound rather than a claim
// about full Vega interaction performance.
function vegaBoundsNearestPoint(
  _points: readonly ChartPoint<Datum, number, number>[],
  x: number,
  y: number,
  _maxDistance: number,
) {
  return vegaPickVisit(vegaRectItems, (item) =>
    item.bounds.contains(x, y) ? item.point : null,
  )
}

function vegaPickVisit<TItem, TResult>(
  items: readonly TItem[],
  visitor: (item: TItem) => TResult | null,
) {
  for (let index = items.length; index--;) {
    const hit = visitor(items[index]!)
    if (hit) return hit
  }
  return null
}

function pocNearestPoint<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  x: number,
  y: number,
  maxDistance: number,
) {
  let containing: ChartPoint<TDatum, TXValue, TYValue> | undefined
  let containingAnchorDistance = Infinity
  for (const candidate of points) {
    if (!candidate.hitRegion || !pocContains(candidate.hitRegion, x, y)) {
      continue
    }
    const dx = candidate.x - x
    const dy = candidate.y - y
    const anchorDistance = dx * dx + dy * dy
    if (anchorDistance <= containingAnchorDistance) {
      containing = candidate
      containingAnchorDistance = anchorDistance
    }
  }
  if (containing) return containing

  let result: ChartPoint<TDatum, TXValue, TYValue> | undefined
  let resultDistance = { primary: Infinity, geometry: Infinity }
  for (const candidate of points) {
    const distance = pocFallbackDistance(candidate, x, y)
    if (
      distance.primary < resultDistance.primary ||
      (distance.primary === resultDistance.primary &&
        distance.geometry < resultDistance.geometry)
    ) {
      result = candidate
      resultDistance = distance
    }
  }
  return result && resultDistance.primary <= Math.max(0, maxDistance) ** 2
    ? result
    : null
}

function pocFallbackDistance(point: ChartPoint, x: number, y: number) {
  const affinity = point.focusAffinity ?? 'xy'
  if (affinity === 'geometry') {
    return { primary: Infinity, geometry: Infinity }
  }
  const geometry = pocSquaredDistanceToRegion(point, x, y)
  if (affinity === 'x' || affinity === 'y') {
    const coordinate = affinity === 'x' ? 0 : 1
    const [minimum, maximum] = pocExtentForPoint(point, coordinate)
    const value = coordinate === 0 ? x : y
    const distance =
      value < minimum ? minimum - value : value > maximum ? value - maximum : 0
    return { primary: distance * distance, geometry }
  }
  return { primary: geometry, geometry }
}

function pocSquaredDistanceToRegion(point: ChartPoint, x: number, y: number) {
  const region = point.hitRegion
  if (!region) {
    const dx = point.x - x
    const dy = point.y - y
    return dx * dx + dy * dy
  }
  if (region.kind === 'rect') {
    const [left, right] = ordered(region.x, region.x + region.width)
    const [top, bottom] = ordered(region.y, region.y + region.height)
    const dx = x < left ? left - x : x > right ? x - right : 0
    const dy = y < top ? top - y : y > bottom ? y - bottom : 0
    return dx * dx + dy * dy
  }
  if (region.kind === 'circle') {
    const dx = x - region.x
    const dy = y - region.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const outside = Math.max(0, distance - Math.max(0, region.radius))
    return outside * outside
  }
  if (pocContains(region, x, y)) return 0
  let distance = Infinity
  for (let index = 0; index < region.points.length; index += 1) {
    const start = region.points[index]!
    const end = region.points[(index + 1) % region.points.length]!
    distance = Math.min(
      distance,
      pocSquaredDistanceToSegment(x, y, start[0], start[1], end[0], end[1]),
    )
  }
  return distance
}

function pocContains(
  region: NonNullable<ChartPoint['hitRegion']>,
  x: number,
  y: number,
) {
  if (region.kind === 'rect') {
    const [left, right] = ordered(region.x, region.x + region.width)
    const [top, bottom] = ordered(region.y, region.y + region.height)
    return x >= left && x <= right && y >= top && y <= bottom
  }
  if (region.kind === 'circle') {
    const dx = x - region.x
    const dy = y - region.y
    return dx * dx + dy * dy <= Math.max(0, region.radius) ** 2
  }

  let inside = false
  for (
    let index = 0, previous = region.points.length - 1;
    index < region.points.length;
    previous = index++
  ) {
    const current = region.points[index]!
    const prior = region.points[previous]!
    if (
      current[1] > y !== prior[1] > y &&
      x <
        ((prior[0] - current[0]) * (y - current[1])) / (prior[1] - current[1]) +
          current[0]
    ) {
      inside = !inside
    }
  }
  return inside
}

function pocExtentForPoint(
  point: ChartPoint,
  coordinate: 0 | 1,
): readonly [number, number] {
  const region = point.hitRegion
  if (!region) {
    const value = coordinate === 0 ? point.x : point.y
    return [value, value]
  }
  if (region.kind === 'rect') {
    const value = coordinate === 0 ? region.x : region.y
    const size = coordinate === 0 ? region.width : region.height
    return ordered(value, value + size)
  }
  if (region.kind === 'circle') {
    const value = coordinate === 0 ? region.x : region.y
    return [value - region.radius, value + region.radius]
  }

  let minimum = Infinity
  let maximum = -Infinity
  for (const vertex of region.points) {
    minimum = Math.min(minimum, vertex[coordinate])
    maximum = Math.max(maximum, vertex[coordinate])
  }
  const fallback = coordinate === 0 ? point.x : point.y
  return minimum <= maximum ? [minimum, maximum] : [fallback, fallback]
}

function pocSquaredDistanceToSegment(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = dx * dx + dy * dy
  if (!length) return (x - x1) ** 2 + (y - y1) ** 2
  const amount = Math.max(
    0,
    Math.min(1, ((x - x1) * dx + (y - y1) * dy) / length),
  )
  const offsetX = x - (x1 + amount * dx)
  const offsetY = y - (y1 + amount * dy)
  return offsetX * offsetX + offsetY * offsetY
}

function ordered(left: number, right: number): readonly [number, number] {
  return left <= right ? [left, right] : [right, left]
}

function verifyEquivalentResults() {
  for (const benchmark of cases) {
    for (const query of benchmark.queries) {
      const reference = pocNearestPoint(
        benchmark.points,
        query.x,
        query.y,
        query.maxDistance,
      )
      const optimized = nearestPoint(
        benchmark.points,
        query.x,
        query.y,
        query.maxDistance,
      )
      if (reference?.key !== optimized?.key) {
        throw new Error(
          `Pointer resolver changed ${benchmark.label}: ${String(reference?.key)} !== ${String(optimized?.key)}`,
        )
      }
    }
  }
}

function verifyComparisonResults() {
  delaunayCursor = 0
  for (const query of comparisonCase.queries) {
    const reference = anchorNearestPoint(
      comparisonCase.points,
      query.x,
      query.y,
      query.maxDistance,
    )
    for (const [label, resolver] of comparisonImplementations.slice(1)) {
      const candidate = resolver(
        comparisonCase.points,
        query.x,
        query.y,
        query.maxDistance,
      )
      if (reference?.key !== candidate?.key) {
        throw new Error(
          `Point comparison changed ${label}: ${String(reference?.key)} !== ${String(candidate?.key)}`,
        )
      }
    }
  }
  delaunayCursor = 0
}

function verifyRectangleComparisonResults() {
  for (const query of rectangleComparisonCase.queries) {
    const reference = nearestPoint(
      rectangleComparisonCase.points,
      query.x,
      query.y,
      query.maxDistance,
    )
    const candidate = vegaBoundsNearestPoint(
      rectangleComparisonCase.points,
      query.x,
      query.y,
      query.maxDistance,
    )
    if (reference?.key !== candidate?.key) {
      throw new Error(
        `Rectangle comparison changed Vega bounds lower bound: ${String(reference?.key)} !== ${String(candidate?.key)}`,
      )
    }
  }
}

function printAsciiDurations(
  measurements: ReadonlyMap<string, readonly number[]>,
  resolvers: readonly Implementation[],
) {
  const medians = resolvers.map(([label]) => ({
    label,
    value: percentile(measurements.get(label)!, 0.5),
  }))
  const maximum = Math.max(...medians.map(({ value }) => value))
  const labelWidth = Math.max(...medians.map(({ label }) => label.length))
  console.log('\nMedian query time · shorter is faster')
  for (const { label, value } of medians) {
    const width = Math.max(1, Math.round((value / maximum) * 40))
    console.log(
      `${label.padEnd(labelWidth)}  ${'#'.repeat(width).padEnd(40)}  ${formatDuration(value)}`,
    )
  }
}

function printScenarioComparisons(
  scenarios: readonly {
    benchmark: PointerCase
    measurements: ReadonlyMap<string, readonly number[]>
  }[],
) {
  console.log('\nCurrent production vs new geometry · median query time')
  for (const { benchmark, measurements } of scenarios) {
    const current = percentile(measurements.get('anchor-only baseline')!, 0.5)
    const optimized = percentile(measurements.get('optimized geometry')!, 0.5)
    const maximum = Math.max(current, optimized)
    const currentWidth = Math.max(1, Math.round((current / maximum) * 36))
    const optimizedWidth = Math.max(1, Math.round((optimized / maximum) * 36))
    console.log(`\n${benchmark.label}`)
    console.log(
      `current prod  ${'#'.repeat(currentWidth).padEnd(36)}  ${formatDuration(current)}`,
    )
    console.log(
      `new geometry  ${'#'.repeat(optimizedWidth).padEnd(36)}  ${formatDuration(optimized)}`,
    )
  }
}

function printIndexBuildTimes() {
  const builders = [
    [
      'D3 quadtree 3.0.1',
      () =>
        quadtree<ChartPoint<Datum, number, number>>()
          .x((point) => point.x)
          .y((point) => point.y)
          .addAll([...densePoints])
          .size(),
    ],
    [
      'D3 Delaunay.from 6.0.4',
      () =>
        Delaunay.from(
          densePoints,
          (point) => point.x,
          (point) => point.y,
        ).triangles.length,
    ],
  ] as const
  const rows = builders.map(([label, build]) => {
    for (let index = 0; index < 3; index += 1) checksum += build()
    const samples: number[] = []
    for (let index = 0; index < 18; index += 1) {
      collectGarbage?.()
      const startedAt = performance.now()
      checksum += build()
      samples.push(performance.now() - startedAt)
    }
    samples.sort((left, right) => left - right)
    return { label, samples }
  })
  console.log('\nOne-time index construction · 10k points')
  console.log('| Index | Median build | p95 build |')
  console.log('| --- | ---: | ---: |')
  for (const { label, samples } of rows) {
    console.log(
      `| ${label} | ${formatDuration(percentile(samples, 0.5))} | ${formatDuration(percentile(samples, 0.95))} |`,
    )
  }
}

function printIndexStorage() {
  let internalNodes = 0
  let leafNodes = 0
  quadtreeIndex.visit((node) => {
    if (node.length) internalNodes += 1
    else leafNodes += 1
    return false
  })
  const delaunayArrays: readonly ArrayBufferView[] = [
    delaunayIndex.points as Float64Array,
    delaunayIndex.triangles,
    delaunayIndex.halfedges,
    delaunayIndex.hull,
    delaunayIndex.inedges,
  ]
  const delaunayBytes = delaunayArrays.reduce(
    (total, array) => total + array.byteLength,
    0,
  )

  console.log('\nPersistent index structure · 10k-point fixture')
  console.log('| Index | Measured retained structure |')
  console.log('| --- | ---: |')
  console.log(
    `| D3 quadtree 3.0.1 | ${internalNodes.toLocaleString()} internal arrays + ${leafNodes.toLocaleString()} leaf objects |`,
  )
  console.log(
    `| D3 Delaunay 6.0.4 | at least ${formatStorage(delaunayBytes)} in public typed arrays |`,
  )
  console.log(
    'Object headers, accessors, internal fields, and the original points are excluded.',
  )
}

function point(
  index: number,
  x: number,
  y: number,
  hitRegion?: ChartPoint['hitRegion'],
  focusAffinity?: ChartPoint['focusAffinity'],
): ChartPoint<Datum, number, number> {
  return {
    key: `point:${index}`,
    markId: 'benchmark',
    group: null,
    groupLabel: 'benchmark',
    datum: { index },
    datumIndex: index,
    xValue: x,
    yValue: y,
    x,
    y,
    hitRegion,
    focusAffinity,
    color: 'currentColor',
  }
}

function queries(
  count: number,
  create: (index: number) => PointerQuery,
): readonly PointerQuery[] {
  return Array.from({ length: count }, (_, index) => create(index))
}

function percentile(samples: readonly number[], value: number) {
  return samples[Math.floor((samples.length - 1) * value)] ?? 0
}

function formatDuration(milliseconds: number) {
  return milliseconds < 1
    ? `${(milliseconds * 1_000).toFixed(1)} µs`
    : `${milliseconds.toFixed(2)} ms`
}

function formatStorage(bytes: number) {
  return `${(bytes / 1_024).toFixed(1)} KiB`
}
