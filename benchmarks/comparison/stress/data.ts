import type { BenchmarkDatum, BenchmarkInput } from '../types'
import type {
  StressPreparedInput,
  StressRollingWindow,
  StressUpdateKind,
  StressWorkloadId,
} from './types'

const densityColumns = 64
const densityRows = 32
const histogramBins = 128
const topCategoryCount = 24
const multiSeriesIdStride = 100_000
const multiSeriesShapes = new Map([
  [2_080, { series: 8, points: 260 }],
  [12_480, { series: 24, points: 520 }],
  [33_280, { series: 32, points: 1_040 }],
])

export interface StressPreparationOptions {
  includeDigest?: boolean
}

export function rollingShiftCount(windowSize: number): number {
  if (!Number.isInteger(windowSize) || windowSize <= 0) {
    throw new Error('Rolling window size must be a positive integer.')
  }
  return Math.max(1, Math.ceil(windowSize * 0.05))
}

export function createRollingFeed(
  windowSize: number,
  lastRevision: number,
): readonly BenchmarkDatum[] {
  if (!Number.isInteger(lastRevision) || lastRevision < 0) {
    throw new Error('Rolling window revision must be a non-negative integer.')
  }
  const length = windowSize + rollingShiftCount(windowSize) * lastRevision
  return Object.freeze(
    Array.from({ length }, (_, index) =>
      Object.freeze(rollingWindowDatum(index, 0)),
    ),
  )
}

export function prepareRollingWindow(
  feed: readonly BenchmarkDatum[],
  windowSize: number,
  revision: number,
  width: number,
  height: number,
  options: StressPreparationOptions = {},
): StressPreparedInput {
  if (!Number.isInteger(revision) || revision < 0) {
    throw new Error('Rolling window revision must be a non-negative integer.')
  }
  const shiftCount = rollingShiftCount(windowSize)
  const startIndex = shiftCount * revision
  const endIndex = startIndex + windowSize
  if (endIndex > feed.length) {
    throw new Error(
      `Rolling feed has ${feed.length} rows; revision ${revision} needs ${endIndex}.`,
    )
  }
  const rows = Object.freeze(feed.slice(startIndex, endIndex))
  const prepared = prepareStressInput(
    'rolling-keyed-window',
    rows,
    width,
    height,
    options,
  )
  const rollingWindow: StressRollingWindow = {
    revision,
    windowSize,
    shiftCount,
    startIndex,
    endIndex,
  }
  return { ...prepared, rollingWindow }
}

export function prepareRollingSequence(
  feed: readonly BenchmarkDatum[],
  windowSize: number,
  lastRevision: number,
  width: number,
  height: number,
  options: StressPreparationOptions = {},
): readonly StressPreparedInput[] {
  if (!Number.isInteger(lastRevision) || lastRevision < 0) {
    throw new Error('Rolling window revision must be a non-negative integer.')
  }
  return Object.freeze(
    Array.from({ length: lastRevision + 1 }, (_, revision) =>
      prepareRollingWindow(feed, windowSize, revision, width, height, options),
    ),
  )
}

export function createStressSource(
  workload: StressWorkloadId,
  count: number,
  revision: number,
  idOffset = 0,
  sourceIndexOffset = 0,
  domainCount = count,
): BenchmarkDatum[] {
  if (workload === 'stats-multi-series-line') {
    return createMultiSeriesSource(count, revision, idOffset)
  }
  if (workload === 'rolling-keyed-window') {
    return Array.from({ length: count }, (_, index) =>
      rollingWindowDatum(sourceIndexOffset + index, revision, idOffset + index),
    )
  }

  const scatter =
    workload === 'raw-scatter' ||
    workload === 'interactive-scatter' ||
    workload === 'binned-density'
  let state = (0x9e3779b9 ^ (count * 31 + revision * 101 + idOffset * 17)) >>> 0

  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = sourceIndexOffset + index
    state = Math.imul(state ^ (state >>> 16), 0x21f0aaad)
    state = Math.imul(state ^ (state >>> 15), 0x735a2d97)
    state ^= state >>> 15
    const randomA = (state >>> 0) / 4_294_967_295
    state = Math.imul(state ^ (state >>> 16), 0x21f0aaad)
    state = Math.imul(state ^ (state >>> 15), 0x735a2d97)
    state ^= state >>> 15
    const randomB = (state >>> 0) / 4_294_967_295
    const wave =
      50 +
      Math.sin((sourceIndex + revision * 7) / 31) * 21 +
      Math.cos((sourceIndex + revision * 11) / 79) * 11
    const x = scatter
      ? Math.max(
          0,
          Math.min(
            Math.max(1, domainCount - 1),
            (randomA * 0.72 +
              ((sourceIndex + revision * 13) % 7) * 0.04 +
              Math.floor(sourceIndex % 5) * 0.012) *
              Math.max(1, domainCount - 1),
          ),
        )
      : sourceIndex
    const y = scatter
      ? clamp(
          18 +
            (sourceIndex % 4) * 19 +
            (randomB - 0.5) * 22 +
            Math.sin((sourceIndex + revision * 5) / 43) * 7,
          0,
          100,
        )
      : clamp(wave + (randomA - 0.5) * 7, 0, 100)

    return {
      id: idOffset + index,
      x,
      category:
        workload === 'top-categories'
          ? `C${Math.min(19_999, Math.floor(randomA ** 3 * 20_000))}`
          : `C${sourceIndex}`,
      y,
      series: 'Series A',
      size: 2 + ((sourceIndex + revision) % 5),
    }
  })
}

export function createStressUpdateSource(
  workload: StressWorkloadId,
  kind: StressUpdateKind,
  initialSource: readonly BenchmarkDatum[],
): readonly BenchmarkDatum[] {
  const sourceCount = initialSource.length

  if (workload === 'stats-multi-series-line' && kind === 'append') {
    const groups = groupSeriesRows(initialSource)
    const tail = [...groups].map(([series, rows], seriesIndex) => {
      const nextX = Math.max(-1, ...rows.map((row) => row.x)) + 1
      return multiSeriesDatum(series, seriesIndex, nextX, 1)
    })
    return [...initialSource, ...tail]
  }

  if (
    kind === 'noop' ||
    kind === 'reorder' ||
    kind === 'resize' ||
    kind === 'viewport' ||
    kind === 'toggle-series' ||
    kind === 'roll'
  ) {
    return initialSource
  }
  if (kind === 'append') {
    const appendCount = Math.max(1, Math.round(sourceCount * 0.1))
    const nextCount = sourceCount + appendCount
    const tail = createStressSource(
      workload,
      appendCount,
      1,
      sourceCount,
      sourceCount,
      nextCount,
    )
    return [...initialSource, ...tail]
  }

  const idOffset = kind === 'replace' ? sourceCount * 10 + 1 : 0
  return createStressSource(workload, sourceCount, 1, idOffset)
}

export function prepareStressInput(
  workload: StressWorkloadId,
  source: readonly BenchmarkDatum[],
  width: number,
  height: number,
  options: StressPreparationOptions = {},
): StressPreparedInput {
  let rows: readonly BenchmarkDatum[]
  let representedCount = source.length
  let exactMinimum: number | undefined
  let exactMaximum: number | undefined

  switch (workload) {
    case 'binned-density': {
      const density = binDensity(source)
      rows = density.rows
      representedCount = density.accountedCount
      break
    }
    case 'pixel-envelope':
    case 'viewport-envelope': {
      const envelope = pixelEnvelope(source, width)
      rows = envelope.rows
      representedCount = envelope.accountedCount
      exactMinimum = envelope.minimum
      exactMaximum = envelope.maximum
      break
    }
    case 'histogram-128': {
      const bins = histogram(source)
      rows = bins.rows
      representedCount = bins.accountedCount
      break
    }
    case 'top-categories': {
      const categories = topCategories(source)
      rows = categories.rows
      representedCount = categories.accountedCount
      break
    }
    default:
      rows = source
      representedCount = rows.length
  }

  const xDomain =
    workload === 'viewport-envelope' ||
    workload === 'stats-multi-series-line' ||
    workload === 'rolling-keyed-window'
      ? numericXExtent(rows)
      : undefined
  const seriesDomain =
    workload === 'stats-multi-series-line'
      ? [...groupSeriesRows(rows).keys()]
      : undefined
  const input: BenchmarkInput = {
    rows,
    secondaryRows: [],
    width,
    height,
    ...(xDomain ? { xDomain } : undefined),
    ...(seriesDomain
      ? {
          seriesDomain,
          seriesOrder: seriesDomain,
          hiddenSeries: [],
        }
      : undefined),
  }
  return {
    input,
    digest:
      options.includeDigest === false
        ? ''
        : digestRows(
            rows,
            input.xDomain,
            input.seriesOrder,
            input.hiddenSeries,
          ),
    representedCount,
    preparedRowCount: rows.length,
    exactMinimum,
    exactMaximum,
  }
}

export function prepareStressUpdate(
  workload: StressWorkloadId,
  kind: StressUpdateKind,
  initialSource: readonly BenchmarkDatum[],
  initial: StressPreparedInput,
  width: number,
  height: number,
  options: StressPreparationOptions = {},
): StressPreparedInput {
  if (kind === 'noop') return initial
  if (kind === 'roll') {
    throw new Error(
      'Rolling updates require prepareRollingWindow so overlapping datum identity is preserved.',
    )
  }

  if (kind === 'viewport') {
    const rows = initial.input.rows
    const first = rows[Math.floor(rows.length * 0.2)]
    const last = rows[Math.floor(rows.length * 0.8)]
    const xDomain = [
      first?.x ?? 0,
      Math.max(first?.x ?? 0, last?.x ?? 1),
    ] as const
    return {
      ...initial,
      input: { ...initial.input, xDomain },
      digest: options.includeDigest === false ? '' : digestRows(rows, xDomain),
    }
  }

  if (workload === 'stats-multi-series-line' && kind === 'toggle-series') {
    const hiddenSeries = initial.input.seriesDomain?.at(-1)
    const nextHiddenSeries = hiddenSeries ? [hiddenSeries] : []
    return {
      ...initial,
      input: { ...initial.input, hiddenSeries: nextHiddenSeries },
      digest:
        options.includeDigest === false
          ? ''
          : digestRows(
              initial.input.rows,
              initial.input.xDomain,
              initial.input.seriesOrder,
              nextHiddenSeries,
            ),
    }
  }

  if (workload === 'stats-multi-series-line' && kind === 'reorder') {
    const groups = groupSeriesRows(initial.input.rows)
    const seriesOrder = [
      ...(initial.input.seriesOrder ?? groups.keys()),
    ].reverse()
    const rows = seriesOrder.flatMap((series) =>
      [...(groups.get(series) ?? [])].reverse(),
    )
    return {
      ...initial,
      input: { ...initial.input, rows, seriesOrder },
      digest:
        options.includeDigest === false
          ? ''
          : digestRows(
              rows,
              initial.input.xDomain,
              seriesOrder,
              initial.input.hiddenSeries,
            ),
    }
  }

  if (kind === 'reorder') {
    const rows = [...initial.input.rows].reverse()
    return {
      ...initial,
      input: { ...initial.input, rows },
      digest: options.includeDigest === false ? '' : digestRows(rows),
    }
  }
  if (kind === 'resize') {
    if (workload === 'rolling-keyed-window') {
      return {
        ...initial,
        input: { ...initial.input, width: 560, height: height + 40 },
      }
    }
    return prepareStressInput(
      workload,
      initialSource,
      560,
      height + 40,
      options,
    )
  }

  const source = createStressUpdateSource(workload, kind, initialSource)
  const prepared = prepareStressInput(workload, source, width, height, options)
  return workload === 'rolling-keyed-window'
    ? { ...prepared, rollingWindow: initial.rollingWindow }
    : prepared
}

function binDensity(source: readonly BenchmarkDatum[]): {
  rows: BenchmarkDatum[]
  accountedCount: number
} {
  const counts = new Uint32Array(densityColumns * densityRows)
  const xMaximum = Math.max(1, source.length - 1)
  for (const row of source) {
    const column = Math.min(
      densityColumns - 1,
      Math.floor((row.x / xMaximum) * densityColumns),
    )
    const binRow = Math.min(
      densityRows - 1,
      Math.floor((row.y / 100) * densityRows),
    )
    counts[binRow * densityColumns + column] += 1
  }
  const maximum = Math.max(1, ...counts)
  const renderedMaximum = counts.length - 1
  const rows: BenchmarkDatum[] = []
  counts.forEach((count, index) => {
    if (count === 0) return
    const column = index % densityColumns
    const binRow = Math.floor(index / densityColumns)
    rows.push({
      id: index,
      x: ((column + 0.5) / densityColumns) * renderedMaximum,
      category: `Cell ${index}`,
      y: ((binRow + 0.5) / densityRows) * 100,
      series: 'Series A',
      size: 1.5 + Math.sqrt(count / maximum) * 8.5,
    })
  })

  return {
    rows,
    accountedCount: counts.reduce((total, count) => total + count, 0),
  }
}

function pixelEnvelope(
  source: readonly BenchmarkDatum[],
  width: number,
): {
  rows: BenchmarkDatum[]
  accountedCount: number
  minimum: number | undefined
  maximum: number | undefined
} {
  if (!source.length)
    return {
      rows: [],
      accountedCount: 0,
      minimum: undefined,
      maximum: undefined,
    }
  const bucketCount = Math.min(source.length, Math.max(1, Math.floor(width)))
  const rows: BenchmarkDatum[] = []
  let exactMinimum = Infinity
  let exactMaximum = -Infinity
  let accountedCount = 0

  for (let bucket = 0; bucket < bucketCount; bucket++) {
    const start = Math.floor((bucket * source.length) / bucketCount)
    const end = Math.max(
      start + 1,
      Math.floor(((bucket + 1) * source.length) / bucketCount),
    )
    let minimum = source[start]!
    let maximum = source[start]!
    for (let index = start; index < end; index++) {
      const row = source[index]!
      accountedCount++
      if (row.y < minimum.y) minimum = row
      if (row.y > maximum.y) maximum = row
      exactMinimum = Math.min(exactMinimum, row.y)
      exactMaximum = Math.max(exactMaximum, row.y)
    }
    const candidates = [source[start]!, minimum, maximum, source[end - 1]!]
    const unique = new Map(candidates.map((row) => [row.id, row]))
    rows.push(...[...unique.values()].sort((left, right) => left.x - right.x))
  }

  return {
    rows,
    accountedCount,
    minimum: exactMinimum,
    maximum: exactMaximum,
  }
}

function histogram(source: readonly BenchmarkDatum[]): {
  rows: BenchmarkDatum[]
  accountedCount: number
} {
  const counts = new Uint32Array(histogramBins)
  for (const row of source) {
    const index = Math.min(
      histogramBins - 1,
      Math.floor((row.y / 100) * histogramBins),
    )
    counts[index] += 1
  }
  const maximum = Math.max(1, ...counts)
  return {
    rows: Array.from(counts, (count, index) => ({
      id: index,
      x: index,
      category: `B${index}`,
      y: (count / maximum) * 100,
      series: 'Series A' as const,
      size: 2,
    })),
    accountedCount: counts.reduce((total, count) => total + count, 0),
  }
}

function topCategories(source: readonly BenchmarkDatum[]): {
  rows: BenchmarkDatum[]
  accountedCount: number
} {
  const categoryCounts = new Map<number, number>()
  for (const row of source) {
    const category = Number.parseInt(row.category.slice(1), 10)
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
  }
  const ranked = [...categoryCounts].sort(
    ([leftCategory, leftCount], [rightCategory, rightCount]) =>
      rightCount - leftCount || leftCategory - rightCategory,
  )
  const selected = ranked.slice(0, topCategoryCount)
  const other = ranked
    .slice(topCategoryCount)
    .reduce((total, [, count]) => total + count, 0)
  const maximum = Math.max(1, ...selected.map(([, count]) => count), other)
  return {
    rows: [
      ...selected.map(([category, count], index) => ({
        id: category,
        x: index,
        category: `Category ${category}`,
        y: (count / maximum) * 100,
        series: 'Series A' as const,
        size: 2,
      })),
      {
        id: -1,
        x: selected.length,
        category: 'Other',
        y: (other / maximum) * 100,
        series: 'Series A' as const,
        size: 2,
      },
    ],
    accountedCount: selected.reduce((total, [, count]) => total + count, other),
  }
}

function digestRows(
  rows: readonly BenchmarkDatum[],
  xDomain?: readonly [number, number],
  seriesOrder?: readonly string[],
  hiddenSeries?: readonly string[],
): string {
  let hash = 2_166_136_261
  for (const row of rows) {
    hash ^= row.id | 0
    hash = Math.imul(hash, 16_777_619)
    hash ^= Math.round(row.x * 1_000)
    hash = Math.imul(hash, 16_777_619)
    hash ^= Math.round(row.y * 1_000)
    hash = Math.imul(hash, 16_777_619)
    hash ^= Math.round(row.size * 1_000)
    hash = Math.imul(hash, 16_777_619)
    hash = digestText(hash, row.series)
    hash = digestText(hash, row.category)
  }
  if (xDomain) {
    hash ^= Math.round(xDomain[0] * 1_000)
    hash = Math.imul(hash, 16_777_619)
    hash ^= Math.round(xDomain[1] * 1_000)
    hash = Math.imul(hash, 16_777_619)
  }
  for (const series of seriesOrder ?? []) {
    hash = digestText(hash, series)
  }
  for (const series of hiddenSeries ?? []) {
    hash = digestText(hash, `hidden:${series}`)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function rollingWindowDatum(
  sourceIndex: number,
  revision: number,
  id = sourceIndex,
): BenchmarkDatum {
  const y =
    50 +
    Math.sin((sourceIndex + revision * 7) / 23) * 19 +
    Math.cos((sourceIndex + revision * 11) / 71) * 9 +
    Math.sin((sourceIndex + revision * 3) / 211) * 5
  return {
    id,
    x: sourceIndex,
    category: `Point ${sourceIndex}`,
    y: clamp(y, 0, 100),
    series: 'Series A',
    size: 2,
  }
}

function createMultiSeriesSource(
  count: number,
  revision: number,
  idOffset: number,
): BenchmarkDatum[] {
  const shape = multiSeriesShape(count)
  const rows: BenchmarkDatum[] = []
  for (let seriesIndex = 0; seriesIndex < shape.series; seriesIndex++) {
    const series = multiSeriesName(seriesIndex)
    for (let pointIndex = 0; pointIndex < shape.points; pointIndex++) {
      rows.push(
        multiSeriesDatum(series, seriesIndex, pointIndex, revision, idOffset),
      )
    }
  }
  return rows
}

function multiSeriesShape(count: number): {
  series: number
  points: number
} {
  const configured = multiSeriesShapes.get(count)
  if (configured) return configured

  const maximumSeries = Math.min(8, count)
  for (let series = maximumSeries; series >= 1; series--) {
    if (count % series === 0) return { series, points: count / series }
  }
  return { series: 1, points: count }
}

function multiSeriesName(index: number): string {
  return `Package ${String(index + 1).padStart(2, '0')}`
}

function multiSeriesDatum(
  series: string,
  seriesIndex: number,
  pointIndex: number,
  revision: number,
  idOffset = 0,
): BenchmarkDatum {
  const phase = seriesIndex * 0.37
  const trend = ((seriesIndex % 5) - 2) * pointIndex * 0.006
  const y =
    48 +
    Math.sin(pointIndex / (17 + (seriesIndex % 7)) + phase + revision * 0.21) *
      (8 + (seriesIndex % 4) * 2) +
    Math.cos(pointIndex / 61 + phase * 1.7 + revision * 0.13) * 5 +
    ((seriesIndex * 13) % 29) -
    14 +
    trend
  return {
    id: idOffset + seriesIndex * multiSeriesIdStride + pointIndex,
    x: pointIndex,
    category: `Bucket ${pointIndex}`,
    y: clamp(y, 0, 100),
    series,
    size: 2,
  }
}

function groupSeriesRows(
  rows: readonly BenchmarkDatum[],
): Map<string, BenchmarkDatum[]> {
  const groups = new Map<string, BenchmarkDatum[]>()
  for (const row of rows) {
    const group = groups.get(row.series)
    if (group) group.push(row)
    else groups.set(row.series, [row])
  }
  return groups
}

function digestText(hash: number, value: string): number {
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash
}

function numericXExtent(
  rows: readonly BenchmarkDatum[],
): readonly [number, number] | undefined {
  if (!rows.length) return undefined
  let minimum = Infinity
  let maximum = -Infinity
  for (const row of rows) {
    minimum = Math.min(minimum, row.x)
    maximum = Math.max(maximum, row.x)
  }
  return Number.isFinite(minimum) && Number.isFinite(maximum)
    ? [minimum, Math.max(minimum, maximum)]
    : undefined
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}
