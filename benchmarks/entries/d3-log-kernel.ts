import { scaleLog } from 'd3-scale'

const scale = scaleLog().domain([1, 1_000]).range([0, 100])

export function mapLog(value: number) {
  return scale(value)
}
