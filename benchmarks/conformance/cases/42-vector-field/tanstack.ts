import { defineChart, vector } from '@tanstack/charts'
import { wind } from '@charts-poc/demo-data/wind'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import { sampleWind } from './selection'
import { tanstackCase } from '../../shared/mount'

const speed = scaleSqrt().domain([0, 14]).range([0, 22])
const sampledWind = sampleWind(wind)

export const vectorFieldDefinition = () =>
  defineChart({
    marks: [
      vector(sampledWind, {
        id: 'wind-vectors',
        x: 'longitude',
        y: 'latitude',
        length: (row) => speed(Math.hypot(row.u, row.v)),
        rotate: (row) => (Math.atan2(row.u, row.v) * 180) / Math.PI,
        stroke: '#2563eb',
      }),
    ],
    x: { scale: scaleLinear, grid: true, axis: { label: 'Longitude' } },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Latitude' } },
  })

export const catalogCase = tanstackCase(
  vectorFieldDefinition,
  'Two-dimensional vector field',
)

export const mount = catalogCase.mount
