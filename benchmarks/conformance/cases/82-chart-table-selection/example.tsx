import { useMemo, useRef, useState } from 'react'
import { defineChart, dot } from '@tanstack/charts'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { keyedSelection, whenSelected } from '@tanstack/charts/selection'
import { Chart } from '@tanstack/charts/react'
import { penguins } from '@tanstack/charts-data/penguins'
import { scaleLinear } from 'd3-scale'
import {
  penguinSelectionId,
  penguinSelectionLabel,
  selectionRowId,
  selectionRows,
} from './model'
import type { ChartScene } from '@tanstack/charts'
import type { KeyedSelectionChange } from '@tanstack/charts/selection'
import type { CompletePenguin, SelectionId } from './model'

const catalogPreviewSelectionId = 'adelie-biscoe-female' satisfies SelectionId

export function chartTableSelectionDefinition(
  revision: number,
  selectedId: SelectionId | null,
  onSelectedIdChange: (selectedId: SelectionId | null) => void,
) {
  const rows = selectionRows(penguins, revision)
  const selection = keyedSelection<
    CompletePenguin,
    SelectionId,
    number,
    number
  >({
    selected: controlledSignal<
      SelectionId | null,
      KeyedSelectionChange<CompletePenguin, SelectionId, number, number>
    >(selectedId, (next) => onSelectedIdChange(next)),
    key: (datum) => penguinSelectionId(datum),
  })

  return defineChart({
    marks: [
      dot(rows, {
        id: 'observations',
        x: 'flipper_length_mm',
        y: 'body_mass_g',
        key: selectionRowId,
        r: 4.5,
        fill: '#2563eb',
      }),
      whenSelected(
        dot(rows, {
          id: 'selected-observation',
          x: 'flipper_length_mm',
          y: 'body_mass_g',
          key: selectionRowId,
          r: 7,
          fill: '#f97316',
          stroke: '#ffffff',
          strokeWidth: 2,
        }),
        selection,
      ),
    ],
    x: { scale: scaleLinear, axis: { label: 'Flipper length (mm)' } },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { ticks: { count: 5 }, label: 'Body mass (g)' },
    },
    margin: { top: 16, right: 24, bottom: 42, left: 62 },
    svgAnimation: false,
    keyboard: true,
    maxFocusDistance: 40,
    selection,
  })
}

export interface ExampleProps {
  width?: number
  height?: number
  revision?: number
}

export default function ChartTableExample({
  width = 640,
  height = 480,
  revision = 0,
}: ExampleProps = {}) {
  const input = { width, height, revision, preview: false, interactive: true }
  const idPrefix = '82-chart-table-selection'
  const viewRef = useRef<HTMLDivElement>(null)

  const chartSurfaceRef = useRef<HTMLDivElement>(null)

  const renderedChartRef = useRef<{
    scene: ChartScene<CompletePenguin, number, number>
    svg: SVGSVGElement
  } | null>(null)

  const [selectedId, setSelectedId] = useState<SelectionId | null>(
    false ? catalogPreviewSelectionId : null,
  )

  const rows = useMemo(
    () => selectionRows(penguins, input.revision),
    [input.revision],
  )

  const selectedDatum = rows.find(
    (row) => penguinSelectionId(row) === selectedId,
  )

  const chartHeight = Math.max(96, input.height - 204)

  const tableHeight = Math.max(44, input.height - chartHeight - 52)

  const definition = useMemo(
    () =>
      chartTableSelectionDefinition(input.revision, selectedId, setSelectedId),
    [input.revision, selectedId],
  )

  const announcement = selectedDatum
    ? `Selected ${penguinSelectionLabel(selectedDatum)}: ${selectedDatum.body_mass_g.toLocaleString()} g`
    : 'No observation selected'

  return (
    <div
      ref={viewRef}
      data-conformance-view="main"
      role="region"
      aria-label="Selectable observations with data table"
      style={{
        width: input.width,
        height: input.height,
        display: 'grid',
        gridTemplateRows: `${chartHeight}px 52px ${tableHeight}px`,
      }}
    >
      <div ref={chartSurfaceRef}>
        <Chart
          idPrefix={idPrefix}
          definition={definition}
          width={input.width}
          height={chartHeight}
          ariaLabel="Selectable observations chart"
          ariaDescription="Use arrow keys to move between observations and Enter or Space to select one. The table below offers the same selections."
          onRender={({ scene, svg }) => {
            renderedChartRef.current = { scene, svg }
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 52,
          padding: '4px 8px',
          boxSizing: 'border-box',
          gap: 8,
          font: '600 12px/1.3 system-ui, sans-serif',
        }}
      >
        <span role="status" aria-live="polite" data-selection-status>
          {announcement}
        </span>
        <button
          type="button"
          data-clear-selection
          aria-disabled={selectedId === null}
          onClick={() => setSelectedId(null)}
          style={{
            minWidth: 112,
            minHeight: 44,
            padding: '8px 10px',
            border: '1px solid color-mix(in srgb, CanvasText 25%, transparent)',
            borderRadius: 5,
            background: 'Canvas',
            color: 'CanvasText',
            cursor: selectedId === null ? 'default' : 'pointer',
            font: 'inherit',
            opacity: selectedId === null ? 0.55 : 1,
          }}
        >
          Clear selection
        </button>
      </div>
      <div style={{ overflow: 'auto' }}>
        <table
          aria-label="Observation values"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              {['Island', 'Penguin', 'Body mass (g)'].map((label) => (
                <th
                  key={label}
                  scope="col"
                  style={{
                    padding: '4px 8px',
                    textAlign: label === 'Body mass (g)' ? 'right' : 'left',
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((datum) => {
              const id = penguinSelectionId(datum)
              if (!id) return null
              const selected = id === selectedId
              return (
                <tr
                  key={id}
                  data-row-id={id}
                  aria-selected={selected}
                  style={{
                    borderTop:
                      '1px solid color-mix(in srgb, CanvasText 12%, transparent)',
                    background: selected
                      ? 'color-mix(in srgb, #f97316 16%, Canvas)'
                      : 'Canvas',
                    color: 'CanvasText',
                  }}
                >
                  <td style={{ padding: '4px 8px' }}>{datum.island}</td>
                  <th scope="row" style={{ padding: 0 }}>
                    <button
                      type="button"
                      data-row-select={id}
                      aria-pressed={selected}
                      onClick={() => setSelectedId(id)}
                      style={{
                        width: '100%',
                        minHeight: 44,
                        boxSizing: 'border-box',
                        padding: '4px 8px',
                        border: 0,
                        background: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                        textAlign: 'left',
                        outlineOffset: -3,
                        fontWeight: selected ? 750 : 600,
                      }}
                    >
                      {penguinSelectionLabel(datum)}
                    </button>
                  </th>
                  <td
                    style={{
                      padding: '4px 8px',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {datum.body_mass_g.toLocaleString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
