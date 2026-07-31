import { defineChart, dot, lineY, text } from '@tanstack/charts'
import { greatest, least } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { aapl } from '@charts-poc/demo-data/aapl'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import { tanstackMount } from '../../shared/mount'

interface ExtremumAnnotation extends AaplRow {
  label: string
  anchor: 'middle' | 'end'
  dx: number
  dy: number
}

const annotationColor = '#dc2626'

const definition = () => {
  const annotations = selectExtrema(aapl)

  return defineChart({
    marks: [
      lineY(aapl, {
        x: 'Date',
        y: 'Close',
        stroke: '#2563eb',
        strokeWidth: 2.25,
      }),
      dot(annotations, {
        x: 'Date',
        y: 'Close',
        fill: annotationColor,
        r: 5,
      }),
      text(annotations, {
        x: 'Date',
        y: 'Close',
        text: 'label',
        fill: annotationColor,
        anchor: (point) => point.anchor,
        dx: (point) => point.dx,
        dy: (point) => point.dy,
      }),
    ],
    x: { scale: scaleUtc, axis: { label: 'Date' } },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Apple close (USD)' } },
  })
}

export const mount = tanstackMount(
  definition,
  'Apple closing price with minimum and maximum annotations',
)

function selectExtrema(
  rows: readonly AaplRow[],
): readonly ExtremumAnnotation[] {
  const minimum = least(rows, (point) => point.Close)
  const maximum = greatest(rows, (point) => point.Close)
  const annotations: ExtremumAnnotation[] = []

  if (minimum) {
    annotations.push({
      ...minimum,
      label: `Low $${minimum.Close.toFixed(2)}`,
      anchor: 'middle',
      dx: 0,
      dy: 13,
    })
  }
  if (maximum) {
    annotations.push({
      ...maximum,
      label: `High $${maximum.Close.toFixed(2)}`,
      anchor: 'end',
      dx: -7,
      dy: -13,
    })
  }

  return annotations
}
