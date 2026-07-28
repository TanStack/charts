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
  onSelectedIdChange: (id: SelectionId) => void
}

function ChartTable({ input, onSelectedIdChange }: ChartTableProps) {
  const [selectedId, setSelectedId] = useState<SelectionId | null>(null)
  const rows = chartTableData(input.revision)
  const chartHeight = Math.max(205, input.height - 122)

  const selectPoint = (point: ScatterPointItem) => {
    const datum = rows.find((row) => row === point.payload)
    if (!datum) return
    setSelectedId(datum.id)
    onSelectedIdChange(datum.id)
  }

  const renderPoint = (props: ScatterShapeProps): ReactNode => {
    const datum = rows.find((row) => row === props.payload)
    if (!datum || props.cx === undefined || props.cy === undefined) return null
    const selected = datum.id === selectedId
    return createElement('circle', {
      className: 'recharts-dot',
      cx: props.cx,
      cy: props.cy,
      r: selected ? 7 : 4.5,
      fill: selected ? '#f97316' : '#2563eb',
      stroke: selected ? '#ffffff' : 'none',
      strokeWidth: selected ? 2 : 0,
      'data-point-id': datum.id,
    })
  }

  return createElement(
    'div',
    {
      'data-conformance-view': 'main',
      style: {
        width: `${input.width}px`,
        minHeight: `${input.height}px`,
        display: 'grid',
        gridTemplateRows: `${chartHeight}px auto`,
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
        'table',
        {
          key: 'table',
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
              createElement('th', { key: 'period', scope: 'col' }, 'Period'),
              createElement('th', { key: 'region', scope: 'col' }, 'Region'),
              createElement('th', { key: 'value', scope: 'col' }, 'Value'),
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
                    background: selected ? '#ffedd5' : 'transparent',
                    color: selected ? '#9a3412' : 'inherit',
                  },
                },
                [
                  createElement('td', { key: 'period' }, row.period),
                  createElement('th', { key: 'region', scope: 'row' }, row.id),
                  createElement('td', { key: 'value' }, row.value),
                ],
              )
            }),
          ),
        ],
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

function pointFromTarget(target: ConformanceTarget) {
  if (target.view !== undefined && target.view !== 'main') return null
  const [kind, id] = target.anchor.split(':')
  return kind === 'point' && isSelectionId(id) ? id : null
}

export const mount: ConformanceMount = (container, input) => {
  const surface = container.ownerDocument.createElement('div')
  surface.setAttribute('role', 'img')
  surface.setAttribute('aria-label', 'Selectable observations with data table')
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
        const pointId = pointFromTarget(target)
        if (!pointId) return null
        const point = [
          ...surface.querySelectorAll<SVGElement>('[data-point-id]'),
        ].find((element) => element.getAttribute('data-point-id') === pointId)
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
