import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { defineChart, dot } from '@tanstack/charts'
import { Chart } from '@tanstack/react-charts'
import { penguins } from '@charts-poc/demo-data/penguins'
import { scaleLinear } from 'd3-scale'
import { reactMount } from '../../shared/react-mount'
import {
  isSelectionId,
  penguinSelectionId,
  penguinSelectionLabel,
  selectionRows,
} from './model'
import type { ChartScene } from '@tanstack/charts'
import type { ConformanceTarget, ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'
import type { CompletePenguin, SelectionId } from './model'

const ChartTableExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function ChartTableExample({ input }, ref) {
  const viewRef = useRef<HTMLDivElement>(null)
  const chartSurfaceRef = useRef<HTMLDivElement>(null)
  const renderedChartRef = useRef<{
    scene: ChartScene<CompletePenguin, number, number>
    svg: SVGSVGElement
  } | null>(null)
  const [selectedId, setSelectedId] = useState<SelectionId | null>(null)
  const rows = useMemo(
    () => selectionRows(penguins, input.revision),
    [input.revision],
  )
  const selectedDatum = rows.find(
    (row) => penguinSelectionId(row) === selectedId,
  )
  const chartHeight = Math.max(96, input.height - 204)
  const tableHeight = Math.max(44, input.height - chartHeight - 52)
  const definition = useMemo(() => {
    const selectedRows = rows.filter(
      (row) => penguinSelectionId(row) === selectedId,
    )
    return defineChart(
      defineChart({
        marks: [
          dot(rows, {
            id: 'observations',
            x: 'flipper_length_mm',
            y: 'body_mass_g',
            r: 4.5,
            fill: '#2563eb',
          }),
          ...(selectedRows.length
            ? [
                dot(selectedRows, {
                  id: 'selected-observation',
                  x: 'flipper_length_mm',
                  y: 'body_mass_g',
                  r: 7,
                  fill: '#f97316',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }),
              ]
            : []),
        ],
        x: { scale: scaleLinear, axis: { label: 'Flipper length (mm)' } },
        y: {
          scale: scaleLinear,
          grid: true,
          axis: { ticks: { count: 5 }, label: 'Body mass (g)' },
        },
        margin: { top: 16, right: 24, bottom: 42, left: 62 },
      }),
      { animate: false, keyboard: true, maxFocusDistance: 40 },
    )
  }, [rows, selectedId])
  const announcement = selectedDatum
    ? `Selected ${penguinSelectionLabel(selectedDatum)}: ${selectedDatum.body_mass_g.toLocaleString()} g`
    : 'No observation selected'

  useImperativeHandle(
    ref,
    () => ({
      resolveTarget(target) {
        if (
          (target.view === undefined || target.view === 'main') &&
          target.anchor === 'control:clear-selection'
        ) {
          const button = viewRef.current?.querySelector<HTMLElement>(
            '[data-clear-selection]',
          )
          return button ? center(button) : null
        }
        const selection = selectionFromTarget(target)
        if (!selection) return null
        if (selection.kind === 'row') {
          const button = viewRef.current?.querySelector<HTMLElement>(
            `[data-row-select="${selection.id}"]`,
          )
          return button ? center(button) : null
        }
        return pointCoordinate(renderedChartRef.current, selection.id)
      },
      readState() {
        const activeElement = viewRef.current?.ownerDocument.activeElement
        return {
          selectedId,
          selectedRow: selectedDatum ? selectedId : null,
          selectedValue: selectedDatum?.body_mass_g ?? null,
          announcement,
          focusedRow:
            activeElement instanceof HTMLElement
              ? (activeElement.dataset.rowSelect ?? null)
              : null,
          focusedControl:
            activeElement instanceof HTMLElement &&
            activeElement.hasAttribute('data-clear-selection')
              ? 'clear-selection'
              : null,
          selectedOverlayCount:
            chartSurfaceRef.current?.querySelectorAll(
              '.ts-chart__dot[data-ts-key="selected-observation"] circle',
            ).length ?? 0,
        }
      },
    }),
    [announcement, selectedDatum, selectedId],
  )

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
          definition={definition}
          width={input.width}
          height={chartHeight}
          ariaLabel="Selectable observations chart"
          ariaDescription="Use arrow keys to move between observations and Enter or Space to select one. The table below offers the same selections."
          onSelect={(point) =>
            setSelectedId(point ? penguinSelectionId(point.datum) : null)
          }
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
})

export const mount = reactMount(ChartTableExample)

function selectionFromTarget(target: ConformanceTarget) {
  if (target.view !== undefined && target.view !== 'main') return null
  const [kind, id] = target.anchor.split(':')
  return (kind === 'point' || kind === 'row') && isSelectionId(id)
    ? { kind, id }
    : null
}

function pointCoordinate(
  renderedChart: {
    scene: ChartScene<CompletePenguin, number, number>
    svg: SVGSVGElement
  } | null,
  pointId: SelectionId,
) {
  if (!renderedChart) return null
  const { scene, svg } = renderedChart
  const point = scene.points.find(
    (candidate) =>
      candidate.markId === 'observations' &&
      penguinSelectionId(candidate.datum) === pointId,
  )
  if (!point) return null
  const bounds = svg.getBoundingClientRect()
  return {
    x: bounds.left + (point.x / scene.width) * bounds.width,
    y: bounds.top + (point.y / scene.height) * bounds.height,
    focusElement: svg,
  }
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
