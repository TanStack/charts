import { defineChart, dot, lineY, text } from '@tanstack/charts'
import { greatest, least } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'
import { extremumData, extremumDateDomain, extremumValueDomain } from './data'
import type { ExtremumPoint } from './data'

interface ExtremumAnnotation extends ExtremumPoint {
  label: string
  anchor: 'middle' | 'end'
  dx: number
  dy: number
}

const annotationColor = '#dc2626'

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = extremumData(input.revision)
    const annotations = selectExtrema(rows)

    return {
      marks: [
        lineY(rows, {
          x: 'date',
          y: 'value',
          key: 'id',
          stroke: '#2563eb',
          strokeWidth: 2.25,
        }),
        dot(annotations, {
          x: 'date',
          y: 'value',
          key: 'id',
          fill: annotationColor,
          r: 5,
        }),
        text(annotations, {
          x: 'date',
          y: 'value',
          text: 'label',
          key: 'id',
          fill: annotationColor,
          anchor: (point) => point.anchor,
          dx: (point) => point.dx,
          dy: (point) => point.dy,
        }),
      ],
      x: {
        scale: scaleUtc().domain(extremumDateDomain),
        label: 'Week',
      },
      y: {
        scale: scaleLinear().domain(extremumValueDomain),
        grid: true,
        label: 'Index',
      },
    }
  })

export const mount = tanstackMount(
  definition,
  'Time series with minimum and maximum annotations',
)

function selectExtrema(
  rows: readonly ExtremumPoint[],
): readonly ExtremumAnnotation[] {
  const minimum = least(rows, (point) => point.value)
  const maximum = greatest(rows, (point) => point.value)
  const annotations: ExtremumAnnotation[] = []

  if (minimum) {
    annotations.push({
      ...minimum,
      label: `Low ${minimum.value}`,
      anchor: 'middle',
      dx: 0,
      dy: 13,
    })
  }
  if (maximum) {
    annotations.push({
      ...maximum,
      label: `High ${maximum.value}`,
      anchor: 'end',
      dx: -7,
      dy: -13,
    })
  }

  return annotations
}
