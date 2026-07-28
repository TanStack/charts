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

function selectionFromTarget(target: ConformanceTarget) {
  if (target.view !== undefined && target.view !== 'main') return null
  const [kind, id] = target.anchor.split(':')
  return (kind === 'point' || kind === 'row') && isSelectionId(id)
    ? { kind, id }
    : null
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
  view.setAttribute('role', 'region')
  view.setAttribute('aria-label', 'Selectable observations with data table')
  view.style.width = `${input.width}px`
  view.style.height = `${input.height}px`
  view.style.display = 'grid'

  const chartSurface = container.ownerDocument.createElement('div')
  const selectionStatus = container.ownerDocument.createElement('div')
  const selectionText = container.ownerDocument.createElement('span')
  const clearButton = container.ownerDocument.createElement('button')
  const tableScroller = container.ownerDocument.createElement('div')
  const table = container.ownerDocument.createElement('table')
  selectionText.setAttribute('role', 'status')
  selectionText.setAttribute('aria-live', 'polite')
  selectionText.dataset.selectionStatus = ''
  selectionStatus.style.display = 'flex'
  selectionStatus.style.alignItems = 'center'
  selectionStatus.style.justifyContent = 'space-between'
  selectionStatus.style.minHeight = '52px'
  selectionStatus.style.padding = '4px 8px'
  selectionStatus.style.boxSizing = 'border-box'
  selectionStatus.style.gap = '8px'
  selectionStatus.style.font = '600 12px/1.3 system-ui, sans-serif'
  clearButton.type = 'button'
  clearButton.textContent = 'Clear selection'
  clearButton.dataset.clearSelection = ''
  Object.assign(clearButton.style, {
    minWidth: '112px',
    minHeight: '44px',
    padding: '8px 10px',
    border: '1px solid color-mix(in srgb, CanvasText 25%, transparent)',
    borderRadius: '5px',
    background: 'Canvas',
    color: 'CanvasText',
    cursor: 'pointer',
    font: 'inherit',
  })
  selectionStatus.append(selectionText, clearButton)
  table.setAttribute('aria-label', 'Observation values')
  table.style.width = '100%'
  table.style.borderCollapse = 'collapse'
  table.style.fontSize = '12px'
  tableScroller.style.overflow = 'auto'
  tableScroller.append(table)

  view.append(chartSurface, selectionStatus, tableScroller)
  container.append(view)

  let currentInput = input
  let selectedId: SelectionId | null = null
  let host: ChartHost<SelectionDatum, ChartTableInput>
  const rowElements = new Map<
    SelectionId,
    {
      row: HTMLTableRowElement
      button: HTMLButtonElement
      period: HTMLTableCellElement
      value: HTMLTableCellElement
    }
  >()

  const chartHeight = () => Math.max(96, currentInput.height - 204)
  const sizeLayout = () => {
    const chart = chartHeight()
    const tableHeight = Math.max(44, currentInput.height - chart - 52)
    view.style.gridTemplateRows = `${chart}px 52px ${tableHeight}px`
  }

  const options = (): ChartHostOptions<SelectionDatum, ChartTableInput> => ({
    definition,
    input: {
      ...currentInput,
      selectedId,
    },
    width: currentInput.width,
    height: chartHeight(),
    ariaLabel: 'Selectable observations chart',
    ariaDescription:
      'Use arrow keys to move between observations and Enter or Space to select one. The table below offers the same selections.',
    animate: false,
    keyboard: true,
    maxFocusDistance: 40,
    onSelect(point) {
      select(point?.datum.id ?? null)
    },
  })

  const updateTable = () => {
    const rows = chartTableData(currentInput.revision)
    for (const datum of rows) {
      const elements = rowElements.get(datum.id)
      if (!elements) continue
      const selected = datum.id === selectedId
      elements.period.textContent = datum.period
      elements.value.textContent = datum.value.toLocaleString()
      elements.row.setAttribute('aria-selected', String(selected))
      elements.row.style.background = selected
        ? 'color-mix(in srgb, #f97316 16%, Canvas)'
        : 'Canvas'
      elements.row.style.color = 'CanvasText'
      elements.button.setAttribute('aria-pressed', String(selected))
      elements.button.style.fontWeight = selected ? '750' : '600'
    }
    const selectedDatum = rows.find((row) => row.id === selectedId)
    selectionText.textContent = selectedDatum
      ? `Selected ${selectedDatum.id}: ${selectedDatum.period}, ${selectedDatum.value.toLocaleString()}`
      : 'No observation selected'
    const clearDisabled = selectedId === null
    clearButton.setAttribute('aria-disabled', String(clearDisabled))
    clearButton.style.cursor = clearDisabled ? 'default' : 'pointer'
    clearButton.style.opacity = clearDisabled ? '0.55' : '1'
  }

  const select = (nextId: SelectionId | null) => {
    selectedId = nextId
    updateTable()
    host.update(options())
  }

  const head = container.ownerDocument.createElement('thead')
  const headerRow = container.ownerDocument.createElement('tr')
  for (const label of ['Period', 'Region', 'Value']) {
    const cell = container.ownerDocument.createElement('th')
    cell.scope = 'col'
    cell.textContent = label
    cell.style.padding = '4px 8px'
    cell.style.textAlign = label === 'Value' ? 'right' : 'left'
    headerRow.append(cell)
  }
  head.append(headerRow)
  const body = container.ownerDocument.createElement('tbody')
  for (const datum of chartTableData(currentInput.revision)) {
    const tableRow = container.ownerDocument.createElement('tr')
    const period = container.ownerDocument.createElement('td')
    const region = container.ownerDocument.createElement('th')
    const button = container.ownerDocument.createElement('button')
    const value = container.ownerDocument.createElement('td')
    tableRow.dataset.rowId = datum.id
    tableRow.style.borderTop =
      '1px solid color-mix(in srgb, CanvasText 12%, transparent)'
    period.style.padding = '4px 8px'
    region.scope = 'row'
    region.style.padding = '0'
    button.type = 'button'
    button.dataset.rowSelect = datum.id
    button.textContent = datum.id
    Object.assign(button.style, {
      width: '100%',
      minHeight: '44px',
      boxSizing: 'border-box',
      padding: '4px 8px',
      border: '0',
      background: 'transparent',
      color: 'inherit',
      cursor: 'pointer',
      textAlign: 'left',
      outlineOffset: '-3px',
    })
    button.addEventListener('click', () => select(datum.id))
    region.append(button)
    value.style.padding = '4px 8px'
    value.style.textAlign = 'right'
    value.style.fontVariantNumeric = 'tabular-nums'
    tableRow.append(period, region, value)
    body.append(tableRow)
    rowElements.set(datum.id, { row: tableRow, button, period, value })
  }
  table.replaceChildren(head, body)
  clearButton.addEventListener('click', () => select(null))
  sizeLayout()
  updateTable()
  host = mountChart(chartSurface, options())

  return {
    update(nextInput) {
      currentInput = nextInput
      view.style.width = `${nextInput.width}px`
      view.style.height = `${nextInput.height}px`
      sizeLayout()
      updateTable()
      host.update(options())
    },
    driver: {
      resolveTarget(target) {
        if (
          (target.view === undefined || target.view === 'main') &&
          target.anchor === 'control:clear-selection'
        ) {
          return center(clearButton)
        }
        const selection = selectionFromTarget(target)
        if (!selection) return null
        if (selection.kind === 'row') {
          const button = rowElements.get(selection.id)?.button
          return button ? center(button) : null
        }
        return pointCoordinate(chartSurface, host, selection.id)
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
          announcement: selectionText.textContent,
          focusedRow:
            container.ownerDocument.activeElement instanceof HTMLElement
              ? (container.ownerDocument.activeElement.dataset.rowSelect ??
                null)
              : null,
          focusedControl:
            container.ownerDocument.activeElement === clearButton
              ? 'clear-selection'
              : null,
          selectedOverlayCount: chartSurface.querySelectorAll(
            '.ts-chart__dot[data-ts-key="selected-observation"] circle',
          ).length,
        }
      },
    },
    destroy() {
      host.destroy()
      view.remove()
    },
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
