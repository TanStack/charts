import { defineChart, dot, mountChart } from '@tanstack/charts'
import { penguins } from '@charts-poc/demo-data/penguins'
import { scaleLinear } from 'd3-scale'
import {
  isSelectionId,
  penguinSelectionId,
  penguinSelectionLabel,
  selectionRows,
} from './model'
import type { ChartHost, ChartHostOptions } from '@tanstack/charts'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTarget,
} from '../../types'
import type { CompletePenguin, SelectionId } from './model'

interface ChartTableInput extends ConformanceInput {
  selectedId: SelectionId | null
}

const definition = (input: ChartTableInput) => {
  const rows = selectionRows(penguins, input.revision)
  const selectedRows = rows.filter(
    (row) => penguinSelectionId(row) === input.selectedId,
  )

  return defineChart({
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
    x: {
      scale: scaleLinear,
      label: 'Flipper length (mm)',
    },
    y: {
      scale: scaleLinear,
      ticks: 5,
      grid: true,
      label: 'Body mass (g)',
    },
    margin: { top: 16, right: 24, bottom: 42, left: 62 },
  })
}

function selectionFromTarget(target: ConformanceTarget) {
  if (target.view !== undefined && target.view !== 'main') return null
  const [kind, id] = target.anchor.split(':')
  return (kind === 'point' || kind === 'row') && isSelectionId(id)
    ? { kind, id }
    : null
}

function pointCoordinate(
  chartSurface: HTMLElement,
  host: ChartHost<CompletePenguin>,
  pointId: SelectionId,
) {
  const scene = host.getScene()
  const point = scene.points.find(
    (candidate) =>
      candidate.markId === 'observations' &&
      penguinSelectionId(candidate.datum) === pointId,
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
  let host: ChartHost<CompletePenguin>
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

  const options = (): ChartHostOptions<CompletePenguin> => ({
    definition: defineChart(
      definition({
        ...currentInput,
        selectedId,
      }),
      { animate: false, keyboard: true, maxFocusDistance: 40 },
    ),
    width: currentInput.width,
    height: chartHeight(),
    ariaLabel: 'Selectable observations chart',
    ariaDescription:
      'Use arrow keys to move between observations and Enter or Space to select one. The table below offers the same selections.',
    onSelect(point) {
      select(point ? penguinSelectionId(point.datum) : null)
    },
  })

  const updateTable = () => {
    const rows = selectionRows(penguins, currentInput.revision)
    for (const datum of rows) {
      const id = penguinSelectionId(datum)
      if (!id) continue
      const elements = rowElements.get(id)
      if (!elements) continue
      const selected = id === selectedId
      elements.period.textContent = datum.island
      elements.value.textContent = datum.body_mass_g.toLocaleString()
      elements.row.setAttribute('aria-selected', String(selected))
      elements.row.style.background = selected
        ? 'color-mix(in srgb, #f97316 16%, Canvas)'
        : 'Canvas'
      elements.row.style.color = 'CanvasText'
      elements.button.setAttribute('aria-pressed', String(selected))
      elements.button.style.fontWeight = selected ? '750' : '600'
    }
    const selectedDatum = rows.find(
      (row) => penguinSelectionId(row) === selectedId,
    )
    selectionText.textContent = selectedDatum
      ? `Selected ${penguinSelectionLabel(selectedDatum)}: ${selectedDatum.body_mass_g.toLocaleString()} g`
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
  for (const label of ['Island', 'Penguin', 'Body mass (g)']) {
    const cell = container.ownerDocument.createElement('th')
    cell.scope = 'col'
    cell.textContent = label
    cell.style.padding = '4px 8px'
    cell.style.textAlign = label === 'Body mass (g)' ? 'right' : 'left'
    headerRow.append(cell)
  }
  head.append(headerRow)
  const body = container.ownerDocument.createElement('tbody')
  for (const datum of selectionRows(penguins, currentInput.revision)) {
    const id = penguinSelectionId(datum)
    if (!id) continue
    const tableRow = container.ownerDocument.createElement('tr')
    const period = container.ownerDocument.createElement('td')
    const region = container.ownerDocument.createElement('th')
    const button = container.ownerDocument.createElement('button')
    const value = container.ownerDocument.createElement('td')
    tableRow.dataset.rowId = id
    tableRow.style.borderTop =
      '1px solid color-mix(in srgb, CanvasText 12%, transparent)'
    period.style.padding = '4px 8px'
    region.scope = 'row'
    region.style.padding = '0'
    button.type = 'button'
    button.dataset.rowSelect = id
    button.textContent = penguinSelectionLabel(datum)
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
    button.addEventListener('click', () => select(id))
    region.append(button)
    value.style.padding = '4px 8px'
    value.style.textAlign = 'right'
    value.style.fontVariantNumeric = 'tabular-nums'
    tableRow.append(period, region, value)
    body.append(tableRow)
    rowElements.set(id, { row: tableRow, button, period, value })
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
        const selectedDatum = selectionRows(
          penguins,
          currentInput.revision,
        ).find((row) => penguinSelectionId(row) === selectedId)
        return {
          selectedId,
          selectedRow: selectedRow?.getAttribute('data-row-id') ?? null,
          selectedValue: selectedDatum?.body_mass_g ?? null,
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
