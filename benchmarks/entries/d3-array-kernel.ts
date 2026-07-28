import { extent, nice, ticks } from 'd3-array'

export function numericDomain(values: readonly number[]) {
  return {
    extent: extent(values),
    nice: nice(0, values.length, 5),
    ticks: ticks(0, values.length, 5),
  }
}
