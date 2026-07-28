export interface FreeCursorControlValues {
  visible: boolean
  x: number | null
  y: number | null
  pinned: boolean
}

export interface FreeCursorControls {
  root: HTMLDivElement
  x: HTMLInputElement
  y: HTMLInputElement
  status: HTMLOutputElement
}

export function createFreeCursorControls(
  document: Document,
  onInput: (x: number, y: number) => void,
): FreeCursorControls {
  const root = document.createElement('div')
  root.setAttribute('role', 'group')
  root.setAttribute('aria-label', 'Free cursor coordinates')
  Object.assign(root.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gridTemplateRows: '44px 18px',
    alignItems: 'center',
    gap: '2px 14px',
    minHeight: '68px',
    padding: '4px 12px 2px',
    boxSizing: 'border-box',
    borderBottom: '1px solid color-mix(in srgb, CanvasText 16%, transparent)',
    background: 'color-mix(in srgb, Canvas 95%, CanvasText 5%)',
    color: 'CanvasText',
    font: '600 11px/1.2 system-ui, sans-serif',
  })

  const x = coordinateSlider(document, 'X coordinate')
  const y = coordinateSlider(document, 'Y coordinate')
  const xLabel = sliderLabel(document, 'X', x)
  const yLabel = sliderLabel(document, 'Y', y)
  const status = document.createElement('output')
  status.dataset.conformanceFreeCursorStatus = ''
  status.setAttribute('aria-live', 'polite')
  status.setAttribute('aria-atomic', 'true')
  status.textContent = 'Move the pointer or adjust X and Y'
  Object.assign(status.style, {
    gridColumn: '1 / -1',
    overflow: 'hidden',
    color: 'currentColor',
    fontWeight: '500',
    opacity: '0.72',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  })

  const emit = () => onInput(Number(x.value), Number(y.value))
  x.addEventListener('input', emit)
  y.addEventListener('input', emit)
  root.append(xLabel, yLabel, status)
  return { root, x, y, status }
}

export function updateFreeCursorControls(
  controls: FreeCursorControls,
  values: FreeCursorControlValues,
) {
  if (!values.visible || values.x === null || values.y === null) {
    controls.root.dataset.active = 'false'
    controls.root.dataset.pinned = 'false'
    controls.status.textContent = 'Move the pointer or adjust X and Y'
    return
  }
  const x = clamp(values.x)
  const y = clamp(values.y)
  controls.x.value = String(x)
  controls.y.value = String(y)
  controls.x.setAttribute('aria-valuetext', formatValue('X', x))
  controls.y.setAttribute('aria-valuetext', formatValue('Y', y))
  controls.root.dataset.active = 'true'
  controls.root.dataset.pinned = String(values.pinned)
  controls.status.textContent = `${formatValue('X', x)} · ${formatValue(
    'Y',
    y,
  )}${values.pinned ? ' · pinned' : ''}`
}

function coordinateSlider(document: Document, ariaLabel: string) {
  const input = document.createElement('input')
  input.type = 'range'
  input.min = '0'
  input.max = '100'
  input.step = '1'
  input.value = '50'
  input.setAttribute('aria-label', ariaLabel)
  Object.assign(input.style, {
    width: '100%',
    minWidth: '0',
    height: '44px',
    margin: '0',
    accentColor: '#0f766e',
  })
  return input
}

function sliderLabel(
  document: Document,
  labelText: string,
  input: HTMLInputElement,
) {
  const label = document.createElement('label')
  Object.assign(label.style, {
    display: 'grid',
    gridTemplateColumns: '14px minmax(0, 1fr)',
    alignItems: 'center',
    gap: '5px',
    minWidth: '0',
  })
  const text = document.createElement('span')
  text.textContent = labelText
  label.append(text, input)
  return label
}

function formatValue(axis: string, value: number) {
  return `${axis} ${value.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })}`
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value))
}
