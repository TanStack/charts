import { defineChart, dot, lineY, select, text } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { aapl } from '@charts-poc/demo-data/aapl'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import { tanstackCase, tanstackMount } from '../../shared/mount'
import { samplePreviewData } from '../../shared/preview'
import type { ConformanceInput } from '../../types'

const annotationColor = '#dc2626'
const dateKey = (row: AaplRow) => row.Date.getTime()

export const minimumAapl = select(aapl, {
  value: 'Close',
  select: 'min',
})
export const maximumAapl = select(aapl, {
  value: 'Close',
  select: 'max',
})

function selectExtremaChart(rows: readonly AaplRow[], preview = false) {
  return defineChart({
    marks: [
      lineY(rows, {
        id: 'close-line',
        x: 'Date',
        y: 'Close',
        key: dateKey,
        stroke: '#2563eb',
        strokeWidth: 2.25,
      }),
      dot(minimumAapl, {
        id: 'minimum-point',
        x: 'Date',
        y: 'Close',
        key: dateKey,
        fill: annotationColor,
        r: 5,
      }),
      dot(maximumAapl, {
        id: 'maximum-point',
        x: 'Date',
        y: 'Close',
        key: dateKey,
        fill: annotationColor,
        r: 5,
      }),
      decorative(
        text(minimumAapl, {
          id: 'minimum-label',
          x: 'Date',
          y: 'Close',
          key: dateKey,
          text: ({ Close }) => `Low $${Close.toFixed(2)}`,
          fill: annotationColor,
          anchor: preview ? 'start' : 'middle',
          dx: preview ? 6 : 0,
          dy: preview ? -13 : 13,
        }),
      ),
      decorative(
        text(maximumAapl, {
          id: 'maximum-label',
          x: 'Date',
          y: 'Close',
          key: dateKey,
          text: ({ Close }) => `High $${Close.toFixed(2)}`,
          fill: annotationColor,
          anchor: 'end',
          dx: -7,
          dy: preview ? 13 : -13,
        }),
      ),
    ],
    x: { scale: scaleUtc, axis: { label: 'Date' } },
    y: { scale: scaleLinear, grid: true, axis: { label: 'Apple close (USD)' } },
  })
}

export const selectExtremaDefinition = () => selectExtremaChart(aapl)

const catalogSelectExtremaDefinition = (input: ConformanceInput) =>
  selectExtremaChart(
    samplePreviewData(aapl, input, 80, [
      (row) => row.Date.getTime(),
      (row) => row.Close,
    ]),
    input.preview === true,
  )

export const mount = tanstackMount(
  selectExtremaDefinition,
  'Apple closing price with minimum and maximum annotations',
)

export const catalogCase = tanstackCase(
  catalogSelectExtremaDefinition,
  mount.ariaLabel,
  mount.interactiveTooltip,
)
