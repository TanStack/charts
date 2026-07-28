export type BenchmarkChartType = 'line' | 'bar' | 'area' | 'scatter'
export type BenchmarkTier = 'basic' | 'interactive' | 'advanced'

export interface BenchmarkDatum {
  id: number
  x: number
  category: string
  y: number
  series: string
  size: number
}

export interface BenchmarkInput {
  rows: readonly BenchmarkDatum[]
  secondaryRows: readonly BenchmarkDatum[]
  width: number
  height: number
  xDomain?: readonly [number, number]
  seriesDomain?: readonly string[]
  seriesOrder?: readonly string[]
  hiddenSeries?: readonly string[]
}

export interface BenchmarkOperation {
  firstFrame: Promise<void>
  settled: Promise<void>
}

export interface BenchmarkPointerProbe {
  target: (
    fraction?: number,
  ) => { x: number; y: number; focusX?: number } | undefined
  isActive: () => boolean
  signature?: () => string | number | undefined
  seriesIdentities?: () => readonly string[]
  seriesValues?: () => readonly BenchmarkSeriesValue[]
  focusedX?: () => number | undefined
}

export interface BenchmarkSeriesVertexCount {
  series: string
  vertices: number
}

export interface BenchmarkSeriesColor {
  series: string
  color: string
}

export interface BenchmarkSeriesValue {
  series: string
  value: number
}

export interface BenchmarkLogicalDatum {
  key: number
  x: number
  y: number
  series: string
  category: string
}

export interface BenchmarkDataNode {
  key: number
  node: Element
}

export interface BenchmarkOutputSnapshot {
  width: number
  height: number
  itemCount?: number
  vertexCount?: number
  pathCount?: number
  seriesCount?: number
  seriesIdentities?: readonly string[]
  seriesVertexCounts?: readonly BenchmarkSeriesVertexCount[]
  seriesColors?: readonly BenchmarkSeriesColor[]
  xDomainMinimum?: number
  xDomainMaximum?: number
  xEndpointVisible?: boolean
  viewportClipped?: boolean
  logicalDatumCount?: number
  logicalDatumDigest?: string
}

export interface BenchmarkOutputProbe {
  read: () => BenchmarkOutputSnapshot
  readData?: () => readonly BenchmarkLogicalDatum[]
  readDataNodes?: () => readonly BenchmarkDataNode[]
}

export interface BenchmarkHandle {
  ready?: BenchmarkOperation
  pointer?: BenchmarkPointerProbe
  output?: BenchmarkOutputProbe
  update: (input: BenchmarkInput) => void | BenchmarkOperation
  destroy: () => void
}

export type BenchmarkMount = (
  container: HTMLElement,
  input: BenchmarkInput,
) => BenchmarkHandle
