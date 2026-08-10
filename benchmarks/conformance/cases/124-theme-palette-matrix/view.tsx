import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { motion } from '@tanstack/charts/motion'
import { Chart } from '@tanstack/charts/react/core'
import { settleChartMotion } from '../../shared/motion'
import { reactMount } from '../../shared/react-mount'
import { paletteMatrixDefinition } from './chart'
import {
  paletteMatrixRows,
  palettePaint,
  paletteTreatments,
  paletteValue,
  paletteVariable,
} from './model'
import type { CSSProperties } from 'react'
import type { ConformanceTarget, ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'
import type { PaletteMatrixRow, PaletteTreatment } from './model'

type PalettePanelStyle = CSSProperties & Record<`--ts-matrix-${string}`, string>

const ThemePaletteMatrix = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function ThemePaletteMatrix({ input, idPrefix }, ref) {
  const rootRef = useRef<HTMLDivElement>(null)
  const rows = useMemo(
    () => paletteMatrixRows(input.revision),
    [input.revision],
  )
  const definitions = useMemo(
    () =>
      paletteTreatments.map((treatment) =>
        paletteMatrixDefinition(rows, treatment, input.preview),
      ),
    [input.preview, rows],
  )
  const renderer = useMemo(
    () =>
      motion<PaletteMatrixRow, string, number>({
        initial: input.preview !== true,
        respectReducedMotion: true,
        transition: {
          type: 'spring',
          stiffness: 180,
          damping: 22,
          mass: 0.8,
        },
      }),
    [input.preview],
  )
  const gap = input.preview ? 4 : 10
  const padding = input.preview ? 0 : 12
  const availableHeight = input.height - padding * 2 - gap * 2
  const panelHeight = Math.max(1, availableHeight / 3)
  const labelWidth = input.width < 440 ? 120 : 124
  const chartWidth = input.preview
    ? input.width
    : Math.max(1, input.width - padding * 2 - labelWidth)

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        const treatment = treatmentFromTarget(target)
        const panel = treatment
          ? rootRef.current?.querySelector<HTMLElement>(
              `[data-palette-treatment="${treatment.id}"]`,
            )
          : null
        return panel ? center(panel) : null
      },
      readState() {
        return {
          revision: input.revision,
          rowCount: rows.length,
          paletteCount: paletteTreatments.length,
          svgCount:
            rootRef.current?.querySelectorAll('svg.ts-chart').length ?? 0,
          palettes: paletteTreatments.map((treatment) => treatment.id),
        }
      },
      settle() {
        const root = rootRef.current
        if (!root) return
        return Promise.all(
          [...root.querySelectorAll<HTMLElement>('.ts-chart-host')].map(
            (host) => settleChartMotion(host, 2_500),
          ),
        ).then(() => undefined)
      },
    }),
    [input.revision, rows.length],
  )

  return (
    <div
      ref={rootRef}
      data-catalog-preview-composition={
        input.preview ? 'theme-palette-matrix' : undefined
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
              display: input.preview ? 'block' : 'grid',
              gridTemplateColumns: input.preview
                ? undefined
                : `${labelWidth}px minmax(0, 1fr)`,
              alignItems: 'center',
              width: input.width - padding * 2,
              height: panelHeight,
              overflow: 'hidden',
              border: input.preview
                ? undefined
                : `1px solid ${palettePaint(treatment, 'grid')}`,
              borderRadius: input.preview ? undefined : 14,
              background: palettePaint(treatment, 'surface'),
              color: palettePaint(treatment, 'foreground'),
            }}
          >
            {input.preview ? null : (
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
})

export const catalogComponent = ThemePaletteMatrix
export const mount = reactMount(ThemePaletteMatrix)

function palettePanelStyle(treatment: PaletteTreatment): PalettePanelStyle {
  return Object.fromEntries(
    Object.keys(treatment.tokens).map((token) => [
      paletteVariable(treatment, token as keyof PaletteTreatment['tokens']),
      paletteValue(treatment, token as keyof PaletteTreatment['tokens']),
    ]),
  )
}

function treatmentFromTarget(target: ConformanceTarget) {
  if (target.view && target.view !== 'main') return null
  if (!target.anchor.startsWith('palette:')) return null
  const id = target.anchor.slice('palette:'.length)
  return paletteTreatments.find((treatment) => treatment.id === id) ?? null
}

function center(element: HTMLElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  }
}
