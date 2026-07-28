import { createElement, useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis } from 'recharts'
import { chartTableData, isSelectionId, selectionPeriods } from './data'
import type { ReactNode } from 'react'
import type { ScatterPointItem, ScatterShapeProps } from 'recharts'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
} from '../../types'
import type { SelectionDatum, SelectionId } from './data'

interface ChartTableProps {
  input: ConformanceInput
  onSelectedIdChange: (id: SelectionId | null) => void
}

function ChartTable({ input, onSelectedIdChange }: ChartTableProps) {
  const [selectedId, setSelectedId] = useState<SelectionId | null>(null)
  const rows = chartTableData(input.revision)
  const statusHeight = 52
  const chartHeight = Math.max(96, input.height - 204)
  const tableHeight = Math.max(44, input.height - chartHeight - statusHeight)

  const selectId = (id: SelectionId | null) => {
    setSelectedId(id)
    onSelectedIdChange(id)
  }

  const selectPoint = (point: ScatterPointItem) => {
    const datum = rows.find((row) => row === point.payload)
    if (!datum) return
    selectId(datum.id)
  }

  const renderPoint = (props: ScatterShapeProps): ReactNode => {
    const datum = rows.find((row) => row === props.payload)
    if (!datum || props.cx === undefined || props.cy === undefined) return null
    return createElement('g', null, [
      createElement('circle', {
        key: 'point',
        className: 'recharts-dot',
        cx: props.cx,
        cy: props.cy,
        r: 4.5,
        fill: '#2563eb',
        'data-point-id': datum.id,
      }),
      datum.id === selectedId
        ? createElement('circle', {
            key: 'selection',
            cx: props.cx,
            cy: props.cy,
            r: 7,
            fill: '#f97316',
            stroke: '#ffffff',
            strokeWidth: 2,
            pointerEvents: 'none',
            'data-selected-overlay': '',
          })
        : null,
    ])
  }

  return createElement(
    'div',
    {
      'data-conformance-view': 'main',
      role: 'region',
      'aria-label': 'Selectable observations with data table',
      style: {
        width: `${input.width}px`,
        height: `${input.height}px`,
        display: 'grid',
        gridTemplateRows: `${chartHeight}px ${statusHeight}px ${tableHeight}px`,
      },
    },
    [
      createElement(
        ScatterChart,
        {
          key: 'chart',
          width: input.width,
          height: chartHeight,
          margin: { top: 16, right: 24, bottom: 8, left: 16 },
          accessibilityLayer: true,
        },
        [
          createElement(CartesianGrid, {
            key: 'grid',
            stroke: '#e2e8f0',
          }),
          createElement(XAxis, {
            key: 'x',
            type: 'category',
            dataKey: 'period',
            domain: selectionPeriods,
            allowDuplicatedCategory: false,
          }),
          createElement(YAxis, {
            key: 'y',
            type: 'number',
            dataKey: 'value',
            domain: [0, 100],
            ticks: [0, 25, 50, 75, 100],
            width: 52,
          }),
          createElement(Scatter<SelectionDatum, number>, {
            key: 'points',
            data: rows,
            dataKey: 'value',
            fill: '#2563eb',
            shape: renderPoint,
            onClick: selectPoint,
            isAnimationActive: false,
          }),
        ],
      ),
      createElement(
        'div',
        {
          key: 'status',
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: `${statusHeight}px`,
            padding: '4px 8px',
            boxSizing: 'border-box',
            gap: '8px',
            font: '600 12px/1.3 system-ui, sans-serif',
          },
        },
        [
          createElement(
            'span',
            {
              key: 'text',
              role: 'status',
              'aria-live': 'polite',
              'data-selection-status': '',
            },
            selectedId
              ? (() => {
                  const selected = rows.find((row) => row.id === selectedId)
                  return selected
                    ? `Selected ${selected.id}: ${selected.period}, ${selected.value.toLocaleString()}`
                    : 'No observation selected'
                })()
              : 'No observation selected',
          ),
          createElement(
            'button',
            {
              key: 'clear',
              type: 'button',
              'data-clear-selection': '',
              'aria-disabled': selectedId === null,
              onClick: () => {
                if (selectedId !== null) selectId(null)
              },
              style: {
                minWidth: '112px',
                minHeight: '44px',
                padding: '8px 10px',
                border:
                  '1px solid color-mix(in srgb, CanvasText 25%, transparent)',
                borderRadius: '5px',
                background: 'Canvas',
                color: 'CanvasText',
                cursor: selectedId === null ? 'default' : 'pointer',
                font: 'inherit',
                opacity: selectedId === null ? 0.55 : 1,
              },
            },
            'Clear selection',
          ),
        ],
      ),
      createElement(
        'div',
        {
          key: 'table-scroll',
          style: { overflow: 'auto' },
        },
        createElement(
          'table',
          {
            'aria-label': 'Observation values',
            style: {
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
            },
          },
          [
            createElement(
              'thead',
              { key: 'head' },
              createElement('tr', null, [
                createElement(
                  'th',
                  {
                    key: 'period',
                    scope: 'col',
                    style: { padding: '4px 8px', textAlign: 'left' },
                  },
                  'Period',
                ),
                createElement(
                  'th',
                  {
                    key: 'region',
                    scope: 'col',
                    style: { padding: '4px 8px', textAlign: 'left' },
                  },
                  'Region',
                ),
                createElement(
                  'th',
                  {
                    key: 'value',
                    scope: 'col',
                    style: { padding: '4px 8px', textAlign: 'right' },
                  },
                  'Value',
                ),
              ]),
            ),
            createElement(
              'tbody',
              { key: 'body' },
              rows.map((row) => {
                const selected = row.id === selectedId
                return createElement(
                  'tr',
                  {
                    key: row.id,
                    'data-row-id': row.id,
                    'aria-selected': selected,
                    style: {
                      borderTop:
                        '1px solid color-mix(in srgb, CanvasText 12%, transparent)',
                      background: selected
                        ? 'color-mix(in srgb, #f97316 16%, Canvas)'
                        : 'Canvas',
                      color: 'CanvasText',
                    },
                  },
                  [
                    createElement(
                      'td',
                      { key: 'period', style: { padding: '4px 8px' } },
                      row.period,
                    ),
                    createElement(
                      'th',
                      { key: 'region', scope: 'row', style: { padding: 0 } },
                      createElement(
                        'button',
                        {
                          type: 'button',
                          'data-row-select': row.id,
                          'aria-pressed': selected,
                          onClick: () => selectId(row.id),
                          style: {
                            width: '100%',
                            minHeight: '44px',
                            boxSizing: 'border-box',
                            padding: '4px 8px',
                            border: 0,
                            background: 'transparent',
                            color: 'inherit',
                            cursor: 'pointer',
                            textAlign: 'left',
                            outlineOffset: '-3px',
                            fontWeight: selected ? 750 : 600,
                          },
                        },
                        row.id,
                      ),
                    ),
                    createElement(
                      'td',
                      {
                        key: 'value',
                        style: {
                          padding: '4px 8px',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                        },
                      },
                      row.value,
                    ),
                  ],
                )
              }),
            ),
          ],
        ),
      ),
    ],
  )
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}

function selectionFromTarget(target: ConformanceTarget) {
  if (target.view !== undefined && target.view !== 'main') return null
  const [kind, id] = target.anchor.split(':')
  return (kind === 'point' || kind === 'row') && isSelectionId(id)
    ? { kind, id }
    : null
}

export const mount: ConformanceMount = (container, input) => {
  const surface = container.ownerDocument.createElement('div')
  container.append(surface)
  const root = createRoot(surface)
  let currentInput = input
  let selectedId: SelectionId | null = null

  const render = () => {
    flushSync(() => {
      root.render(
        createElement(ChartTable, {
          input: currentInput,
          onSelectedIdChange(id) {
            selectedId = id
          },
        }),
      )
    })
  }

  render()

  return {
    update(nextInput) {
      currentInput = nextInput
      render()
    },
    driver: {
      resolveTarget(target) {
        if (
          (target.view === undefined || target.view === 'main') &&
          target.anchor === 'control:clear-selection'
        ) {
          const button = surface.querySelector<HTMLButtonElement>(
            '[data-clear-selection]',
          )
          return button ? center(button) : null
        }
        const selection = selectionFromTarget(target)
        if (!selection) return null
        if (selection.kind === 'row') {
          const button = surface.querySelector<HTMLButtonElement>(
            `[data-row-select="${selection.id}"]`,
          )
          return button ? center(button) : null
        }
        const point = [
          ...surface.querySelectorAll<SVGElement>('[data-point-id]'),
        ].find(
          (element) => element.getAttribute('data-point-id') === selection.id,
        )
        return point ? center(point) : null
      },
      readState() {
        const selectedRow = surface.querySelector(
          '[data-row-id][aria-selected="true"]',
        )
        const selectedDatum = chartTableData(currentInput.revision).find(
          (row) => row.id === selectedId,
        )
        return {
          selectedId,
          selectedRow: selectedRow?.getAttribute('data-row-id') ?? null,
          selectedValue: selectedDatum?.value ?? null,
          announcement:
            surface.querySelector('[data-selection-status]')?.textContent ??
            null,
          focusedRow:
            surface.ownerDocument.activeElement instanceof HTMLElement
              ? (surface.ownerDocument.activeElement.dataset.rowSelect ?? null)
              : null,
          focusedControl:
            surface.ownerDocument.activeElement instanceof HTMLElement
              ? surface.ownerDocument.activeElement.dataset.clearSelection ===
                ''
                ? 'clear-selection'
                : null
              : null,
          selectedOverlayCount: surface.querySelectorAll(
            '[data-selected-overlay]',
          ).length,
        }
      },
    },
    destroy() {
      flushSync(() => {
        root.unmount()
      })
      surface.remove()
    },
  }
}
