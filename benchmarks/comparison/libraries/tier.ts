import type { BenchmarkDatum, BenchmarkInput } from '../types'

export const seriesColors = ['#2563eb', '#f97316'] as const
export const multiSeriesColors = [
  '#2563eb',
  '#f97316',
  '#16a34a',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
  '#4f46e5',
  '#ea580c',
  '#059669',
  '#e11d48',
  '#9333ea',
  '#0e7490',
  '#c026d3',
  '#ca8a04',
  '#1d4ed8',
  '#c2410c',
  '#15803d',
  '#b91c1c',
  '#6d28d9',
  '#0f766e',
  '#be185d',
  '#4d7c0f',
  '#4338ca',
  '#9a3412',
  '#047857',
  '#9f1239',
  '#7e22ce',
  '#155e75',
  '#a21caf',
  '#a16207',
] as const

export function xMinimum(input: BenchmarkInput): number {
  return input.xDomain?.[0] ?? 0
}

export function xMaximum(input: BenchmarkInput): number {
  if (input.xDomain) return input.xDomain[1]
  let maximum = 1
  for (const row of input.rows) maximum = Math.max(maximum, row.x)
  for (const row of input.secondaryRows) maximum = Math.max(maximum, row.x)
  return maximum
}

export function numericMinimum(
  values: Iterable<unknown> | undefined,
): number | undefined {
  if (!values) return undefined
  let minimum: number | undefined
  for (const value of values) {
    const number = typeof value === 'number' ? value : Number.NaN
    if (Number.isFinite(number)) {
      minimum = minimum === undefined ? number : Math.min(minimum, number)
    }
  }
  return minimum
}

export function visibleRows(
  input: BenchmarkInput,
  advanced: boolean,
): readonly BenchmarkDatum[] {
  return advanced ? [...input.rows, ...input.secondaryRows] : input.rows
}

export function wideRows(input: BenchmarkInput) {
  return input.rows.map((row, index) => ({
    ...row,
    yB: input.secondaryRows[index]?.y ?? 0,
  }))
}

export function orderedSeries(input: BenchmarkInput): readonly string[] {
  if (input.seriesOrder?.length) return input.seriesOrder
  if (input.seriesDomain?.length) return input.seriesDomain
  return [...new Set(input.rows.map((row) => row.series))]
}

export function visibleSeries(input: BenchmarkInput): readonly string[] {
  const hidden = new Set(input.hiddenSeries)
  return orderedSeries(input).filter((series) => !hidden.has(series))
}

export function groupedVisibleSeriesRows(
  input: BenchmarkInput,
): ReadonlyArray<readonly [string, readonly BenchmarkDatum[]]> {
  const visible = visibleSeries(input)
  const groups = new Map(
    visible.map((series) => [series, [] as BenchmarkDatum[]]),
  )
  for (const row of input.rows) groups.get(row.series)?.push(row)
  return visible.map((series) => [series, groups.get(series) ?? []])
}

export function visibleMultiSeriesRows(
  input: BenchmarkInput,
): readonly BenchmarkDatum[] {
  const hidden = new Set(input.hiddenSeries)
  return input.rows.filter((row) => !hidden.has(row.series))
}

export interface MultiSeriesWideDatum extends BenchmarkDatum {
  [key: string]: number | string
}

export function multiSeriesWideRows(
  input: BenchmarkInput,
): readonly MultiSeriesWideDatum[] {
  const rows = new Map<number, MultiSeriesWideDatum>()
  for (const [series, values] of groupedVisibleSeriesRows(input)) {
    for (const value of values) {
      const wide = rows.get(value.x) ?? {
        id: value.id,
        x: value.x,
        category: value.category,
        y: value.y,
        series: value.series,
        size: value.size,
      }
      wide[series] = value.y
      rows.set(value.x, wide)
    }
  }
  return [...rows.values()].sort((left, right) => left.x - right.x)
}

export function seriesColor(input: BenchmarkInput, series: string): string {
  const index = Math.max(0, input.seriesDomain?.indexOf(series) ?? 0)
  return multiSeriesColors[index % multiSeriesColors.length]!
}

export function seriesFromColor(
  input: BenchmarkInput,
  color: string | null | undefined,
): string | undefined {
  if (!color) return undefined
  const normalized = color.toLowerCase()
  return input.seriesDomain?.find(
    (series) => seriesColor(input, series).toLowerCase() === normalized,
  )
}

export function renderedSize(container: HTMLElement) {
  const output = [
    ...container.querySelectorAll<SVGSVGElement | HTMLCanvasElement>(
      'svg, canvas',
    ),
  ].sort((left, right) => {
    const leftBounds = left.getBoundingClientRect()
    const rightBounds = right.getBoundingClientRect()
    return (
      rightBounds.width * rightBounds.height -
      leftBounds.width * leftBounds.height
    )
  })[0]
  const bounds = output?.getBoundingClientRect()
  return {
    width: bounds?.width ?? 0,
    height: bounds?.height ?? 0,
  }
}

export function numericMaximum(
  values: Iterable<unknown> | undefined,
): number | undefined {
  if (!values) return undefined
  let maximum: number | undefined
  for (const value of values) {
    const number = typeof value === 'number' ? value : Number.NaN
    if (Number.isFinite(number)) {
      maximum = maximum === undefined ? number : Math.max(maximum, number)
    }
  }
  return maximum
}

export function pathVertexCount(
  container: ParentNode,
  selector: string,
): number {
  let count = 0
  for (const path of container.querySelectorAll<SVGPathElement>(selector)) {
    count += path.getAttribute('d')?.match(/[MLHVCSQTA]/gi)?.length ?? 0
  }
  return count
}

export function pathEndpointVisible(
  container: ParentNode,
  selector: string,
): boolean {
  for (const path of container.querySelectorAll<SVGPathElement>(selector)) {
    const svg = path.ownerSVGElement
    const matrix = path.getScreenCTM()
    const length = path.getTotalLength()
    if (!svg || !matrix || !Number.isFinite(length)) continue
    const point = svg.createSVGPoint()
    const endpoint = path.getPointAtLength(length)
    point.x = endpoint.x
    point.y = endpoint.y
    const screenEndpoint = point.matrixTransform(matrix)
    const outputBounds = svg.getBoundingClientRect()
    const pathBounds = path.getBoundingClientRect()
    if (
      Math.abs(screenEndpoint.x - pathBounds.right) <= 2 &&
      pointWithinBounds(screenEndpoint, outputBounds)
    ) {
      return true
    }
  }
  return false
}

export function rightmostMarkVisible(
  container: ParentNode,
  selector: string,
): boolean {
  const marks = [...container.querySelectorAll<SVGGraphicsElement>(selector)]
  marks.sort(
    (left, right) =>
      right.getBoundingClientRect().right - left.getBoundingClientRect().right,
  )
  const mark = marks[0]
  const outputBounds = mark?.ownerSVGElement?.getBoundingClientRect()
  if (!mark || !outputBounds) return false
  const bounds = mark.getBoundingClientRect()
  return (
    bounds.width > 0 &&
    bounds.height > 0 &&
    pointWithinBounds(
      {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      },
      outputBounds,
    )
  )
}

export function pathRightEdgeVisible(
  container: ParentNode,
  selector: string,
): boolean {
  for (const path of container.querySelectorAll<SVGPathElement>(selector)) {
    const outputBounds = path.ownerSVGElement?.getBoundingClientRect()
    if (!outputBounds) continue
    const bounds = path.getBoundingClientRect()
    if (
      bounds.width > 0 &&
      bounds.height > 0 &&
      bounds.right >= outputBounds.left - 2 &&
      bounds.right <= outputBounds.right + 2
    ) {
      return true
    }
  }
  return false
}

function pointWithinBounds(
  point: { x: number; y: number },
  bounds: DOMRect,
): boolean {
  const tolerance = 2
  return (
    point.x >= bounds.left - tolerance &&
    point.x <= bounds.right + tolerance &&
    point.y >= bounds.top - tolerance &&
    point.y <= bounds.bottom + tolerance
  )
}
