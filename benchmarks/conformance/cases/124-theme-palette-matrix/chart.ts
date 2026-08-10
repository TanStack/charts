import { areaY, defineChart, dot, lineY } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'
import { palettePaint } from './model'
import type { PaletteMatrixRow, PaletteTreatment } from './model'

const gradientId = 'palette-area'

export function paletteMatrixDefinition(
  rows: readonly PaletteMatrixRow[],
  treatment: PaletteTreatment,
  preview = false,
) {
  const primary = palettePaint(treatment, 'primary')
  const secondary = palettePaint(treatment, 'secondary')
  const surface = palettePaint(treatment, 'surface')

  return defineChart({
    motion: {
      transition: {
        type: 'spring',
        stiffness: 180,
        damping: 22,
        mass: 0.8,
      },
    },
    marks: [
      areaY(rows, {
        id: 'value-area',
        x: 'period',
        y: 'value',
        key: 'id',
        fill: `url(#${gradientId})`,
      }),
      lineY(rows, {
        id: 'value-line',
        x: 'period',
        y: 'value',
        key: 'id',
        stroke: primary,
        strokeWidth: preview ? 2 : 2.5,
      }),
      lineY(rows, {
        id: 'comparison-line',
        x: 'period',
        y: 'comparison',
        key: 'id',
        stroke: secondary,
        strokeOpacity: 0.8,
        strokeWidth: preview ? 1 : 1.5,
        strokeDasharray: '3 4',
        motion: {
          transition: { type: 'tween', duration: 420, easing: 'ease-out' },
        },
      }),
      dot(rows.slice(-1), {
        id: 'latest-value',
        x: 'period',
        y: 'value',
        key: 'id',
        r: preview ? 2 : 3.5,
        fill: primary,
        stroke: surface,
        strokeWidth: preview ? 1 : 2,
        motion: { transition: { type: 'spring', mass: 1.15 } },
      }),
    ],
    x: {
      scale: () =>
        scalePoint<string>()
          .domain(rows.map((row) => row.period))
          .padding(0.12),
    },
    y: { scale: scaleLinear().domain([20, 100]) },
    guides: false,
    margin: preview ? 5 : { top: 12, right: 14, bottom: 10, left: 14 },
    gradients: [
      {
        id: gradientId,
        x1: 0,
        y1: 1,
        x2: 0,
        y2: 0,
        stops: [
          { offset: 0, color: primary, opacity: 0.02 },
          { offset: 0.55, color: primary, opacity: 0.16 },
          { offset: 1, color: primary, opacity: 0.52 },
        ],
      },
    ],
    clip: true,
    theme: {
      background: surface,
      foreground: palettePaint(treatment, 'foreground'),
      muted: palettePaint(treatment, 'muted'),
      grid: palettePaint(treatment, 'grid'),
      palette: [primary, secondary],
    },
    focus: false,
    keyboard: false,
    tooltip: false,
  })
}
