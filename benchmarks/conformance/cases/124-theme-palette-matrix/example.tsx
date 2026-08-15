import { useMemo, useRef } from 'react'
import { motion } from '@tanstack/charts/motion'
import { Chart } from '@tanstack/charts/react/core'
import {
  paletteMatrixRows,
  palettePaint,
  paletteTreatments,
  paletteValue,
  paletteVariable,
} from './model'
import type { CSSProperties } from 'react'
import type { PaletteMatrixRow, PaletteTreatment } from './model'
import { areaY, defineChart, dot, lineY } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'
type PalettePanelStyle = CSSProperties & Record<`--ts-matrix-${string}`, string>

function palettePanelStyle(treatment: PaletteTreatment): PalettePanelStyle {
  return Object.fromEntries(
    Object.keys(treatment.tokens).map((token) => [
      paletteVariable(treatment, token as keyof PaletteTreatment['tokens']),
      paletteValue(treatment, token as keyof PaletteTreatment['tokens']),
    ]),
  )
}

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

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

export default function ThemePaletteMatrix({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '124-theme-palette-matrix'
  const rootRef = useRef<HTMLDivElement>(null)

  const rows = useMemo(
    () => paletteMatrixRows(input.revision),
    [input.revision],
  )

  const definitions = useMemo(
    () =>
      paletteTreatments.map((treatment) =>
        paletteMatrixDefinition(rows, treatment, false),
      ),
    [false, rows],
  )

  const renderer = useMemo(
    () =>
      motion({
        initial: true,
        respectReducedMotion: true,
        transition: {
          type: 'spring',
          stiffness: 180,
          damping: 22,
          mass: 0.8,
        },
      }),
    [],
  )

  const gap = false ? 4 : 10

  const padding = false ? 0 : 12

  const availableHeight = input.height - padding * 2 - gap * 2

  const panelHeight = Math.max(1, availableHeight / 3)

  const labelWidth = input.width < 440 ? 120 : 124

  const chartWidth = false
    ? input.width
    : Math.max(1, input.width - padding * 2 - labelWidth)

  return (
    <div
      ref={rootRef}
      data-catalog-preview-composition={
        false ? 'theme-palette-matrix' : undefined
      }
      data-conformance-view="main"
      role="region"
      aria-label="Theme palette matrix"
      style={{
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateRows: `repeat(3, ${panelHeight}px)`,
        gap,
        width: input.width,
        height: input.height,
        padding,
      }}
    >
      {paletteTreatments.map((treatment, index) => {
        const definition = definitions[index]
        if (!definition) return null
        const style = palettePanelStyle(treatment)

        return (
          <section
            key={treatment.id}
            data-palette-treatment={treatment.id}
            aria-label={`${treatment.label} palette`}
            style={{
              ...style,
              boxSizing: 'border-box',
              colorScheme: 'light dark',
              display: false ? 'block' : 'grid',
              gridTemplateColumns: false
                ? undefined
                : `${labelWidth}px minmax(0, 1fr)`,
              alignItems: 'center',
              width: input.width - padding * 2,
              height: panelHeight,
              overflow: 'hidden',
              border: false
                ? undefined
                : `1px solid ${palettePaint(treatment, 'grid')}`,
              borderRadius: false ? undefined : 14,
              background: palettePaint(treatment, 'surface'),
              color: palettePaint(treatment, 'foreground'),
            }}
          >
            {false ? null : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 0,
                  paddingInline: input.width < 440 ? 10 : 14,
                  font: '650 12px/1.2 system-ui, sans-serif',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    flex: '0 0 auto',
                    borderRadius: 999,
                    background: palettePaint(treatment, 'primary'),
                  }}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {treatment.label}
                </span>
              </div>
            )}
            <Chart
              idPrefix={idPrefix ? `${idPrefix}-${treatment.id}` : undefined}
              definition={definition}
              renderer={renderer}
              width={chartWidth}
              height={panelHeight}
              ariaLabel={`${treatment.label} revenue trend`}
            />
          </section>
        )
      })}
    </div>
  )
}
