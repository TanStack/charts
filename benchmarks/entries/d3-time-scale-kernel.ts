import { scaleUtc } from 'd3-scale'

const scale = scaleUtc()
  .domain([new Date('2025-01-01T00:00:00Z'), new Date('2026-01-01T00:00:00Z')])
  .range([0, 100])

export function mapTime(value: Date) {
  return scale(value)
}
