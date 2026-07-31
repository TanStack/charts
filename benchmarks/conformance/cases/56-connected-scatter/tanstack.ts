import { arrow, d3Curve, defineChart, dot, lineY, text } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { curveCatmullRom } from 'd3-shape'
import { driving } from '@charts-poc/demo-data/driving'
import { directionSegments } from './transform'
import { tanstackMount } from '../../shared/mount'

const arrows = directionSegments(driving)
const labels = driving.filter((row) => row.year % 5 === 0)

const definition = () =>
  defineChart({
    marks: [
      lineY(driving, {
        x: 'miles',
        y: 'gas',
        stroke: '#64748b',
        strokeWidth: 2.25,
        curve: d3Curve(curveCatmullRom.alpha(0.5)),
      }),
      dot(driving, {
        x: 'miles',
        y: 'gas',
        fill: '#0f766e',
        r: 3.25,
      }),
      arrow(arrows, {
        x1: 'miles1',
        y1: 'gas1',
        x2: 'miles2',
        y2: 'gas2',
        stroke: '#0f766e',
        strokeWidth: 1.5,
        headLength: 7,
      }),
      text(labels, {
        x: 'miles',
        y: 'gas',
        text: (row) => `${row.year}`,
        fill: '#0f172a',
        dy: -9,
      }),
    ],
    x: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Miles driven per person' },
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Cost of gasoline ($ per gallon)' },
    },
  })

export const mount = tanstackMount(
  definition,
  'Directed connected scatterplot over time',
)
