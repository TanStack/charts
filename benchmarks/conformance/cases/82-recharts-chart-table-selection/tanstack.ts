import { defineChart, dot, mountChart } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { chartTableData, isSelectionId, selectionPeriods } from './data'
import type { ChartHost, ChartHostOptions } from '@tanstack/charts'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
} from '../../types'
import type { SelectionDatum, SelectionId } from './data'

interface ChartTableInput extends ConformanceInput {
  selectedId: SelectionId | null
}

const definition = defineChart<ChartTableInput>()(({ input }) => {
  const rows = chartTableData(input.revision)
  const selectedRows = rows.filter((row) => row.id === input.selectedId)

  return {
    marks: [
      dot(rows, {
        id: 'observations',
        x: 'period',
        y: 'value',
        key: 'id',
        r: 4.5,
        fill: '#2563eb',
      }),
      ...(selectedRows.length
        ? [
            dot(selectedRows, {
              id: 'selected-observation',
              x: 'period',
              y: 'value',
              key: 'id',
              r: 7,
              fill: '#f97316',
              stroke: '#ffffff',
              strokeWidth: 2,
            }),
          ]
        : []),
    ],
    x: {
      scale: scaleBand<string>()
        .domain(selectionPeriods)
        .paddingInner(0.1)
        .paddingOuter(0.05),
    },
    y: {
      scale: scaleLinear().domain([0, 100]),
      ticks: 5,
      grid: true,
    },
    margin: { top: 16, right: 24, bottom: 42, left: 62 },
  }
})

function pointFromTarget(target: ConformanceTarget) {
  if (target.view !== undefined && target.view !== 'main') return null
  const [kind, id] = target.anchor.split(':')
  return kind === 'point' && isSelectionId(id) ? id : null
}

function pointCoordinate(
  chartSurface: HTMLElement,
  host: ChartHost<SelectionDatum, ChartTableInput>,
  pointId: SelectionId,
) {
  const scene = host.getScene()
  const point = scene.points.find(
    (candidate) =>
      candidate.markId === 'observations' && candidate.datum.id === pointId,
  )
  const svg = chartSurface.querySelector<SVGSVGElement>('svg')
  if (!point || !svg) return null
  const bounds = svg.getBoundingClientRect()
  return {
    x: bounds.left + (point.x / scene.width) * bounds.width,
    y: bounds.top + (point.y / scene.height) * bounds.height,
    focusElement: svg,
  }
}

export const mount: ConformanceMount = (container, input) => {
  const view = container.ownerDocument.createElement('div')
  view.dataset.conformanceView = 'main'
  view.style.width = `${input.width}px`
  view.style.minHeight = `${input.height}px`
  view.style.display = 'grid'

  const chartSurface = container.ownerDocument.createElement('div')
  const table = container.ownerDocument.createElement('table')
  table.setAttribute('aria-label', 'Observation values')
  table.style.width = '100%'
  table.style.borderCollapse = 'collapse'
  table.style.fontSize = '12px'

  view.append(chartSurface, table)
  container.append(view)

  let currentInput = input
  let selectedId: SelectionId | null = null
  let host: ChartHost<SelectionDatum, ChartTableInput>

  const chartHeight = () => Math.max(205, currentInput.height - 122)

  const options = (): ChartHostOptions<SelectionDatum, ChartTableInput> => ({
    definition,
    input: {
      ...currentInput,
      selectedId,
    },
    width: currentInput.width,
    height: chartHeight(),
    ariaLabel: 'Selectable observations with data table',
    animate: false,
    keyboard: false,
    onSelect(point) {
      selectedId = point?.datum.id ?? null
      renderTable()
      host.update(options())
    },
  })

  const renderTable = () => {
    const head = container.ownerDocument.createElement('thead')
    const headerRow = container.ownerDocument.createElement('tr')
    for (const label of ['Period', 'Region', 'Value']) {
      const cell = container.ownerDocument.createElement('th')
      cell.scope = 'col'
      cell.textContent = label
      headerRow.append(cell)
    }
    head.append(headerRow)

    const body = container.ownerDocument.createElement('tbody')
    for (const row of chartTableData(currentInput.revision)) {
      const tableRow = container.ownerDocument.createElement('tr')
      const selected = row.id === selectedId
      tableRow.dataset.rowId = row.id
      tableRow.setAttribute('aria-selected', String(selected))
      tableRow.style.background = selected ? '#ffedd5' : 'transparent'
      tableRow.style.color = selected ? '#9a3412' : 'inherit'

      const period = container.ownerDocument.createElement('td')
      period.textContent = row.period
      const region = container.ownerDocument.createElement('th')
      region.scope = 'row'
      region.textContent = row.id
      const value = container.ownerDocument.createElement('td')
      value.textContent = String(row.value)
      tableRow.append(period, region, value)
      body.append(tableRow)
    }

    table.replaceChildren(head, body)
  }

  renderTable()
  host = mountChart(chartSurface, options())

  return {
    update(nextInput) {
      currentInput = nextInput
      view.style.width = `${nextInput.width}px`
      renderTable()
      host.update(options())
    },
    driver: {
      resolveTarget(target) {
        const pointId = pointFromTarget(target)
        return pointId ? pointCoordinate(chartSurface, host, pointId) : null
      },
      readState() {
        const selectedRow = table.querySelector(
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
      host.destroy()
      view.remove()
    },
  }
}
