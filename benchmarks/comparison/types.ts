export type BenchmarkChartType = 'line' | 'bar' | 'area' | 'scatter'
export type BenchmarkTier = 'basic' | 'interactive' | 'advanced'

export interface BenchmarkDatum {
  id: number
  x: number
  category: string
  y: number
  series: 'Series A' | 'Series B'
  size: number
}

export interface BenchmarkInput {
  rows: readonly BenchmarkDatum[]
  secondaryRows: readonly BenchmarkDatum[]
  width: number
  height: number
}

export interface BenchmarkHandle {
  update: (input: BenchmarkInput) => void
  destroy: () => void
}

export type BenchmarkMount = (
  container: HTMLElement,
  input: BenchmarkInput,
) => BenchmarkHandle
