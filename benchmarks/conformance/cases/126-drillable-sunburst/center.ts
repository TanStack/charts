import {
  flareAggregateValue,
  flareLabel,
  flareParentId,
  formatFlareValue,
} from './model'

export interface SunburstCenterLabel {
  readonly id: 'current' | 'detail'
  readonly angle: number
  readonly radius: number
  readonly text: string
  readonly dy: number
}

export function sunburstCenterLabels(
  rootId: string,
): readonly SunburstCenterLabel[] {
  const parentId = flareParentId(rootId)
  return [
    {
      id: 'current',
      angle: 0,
      radius: 0,
      text: flareLabel(rootId),
      dy: -6,
    },
    {
      id: 'detail',
      angle: 0,
      radius: 0,
      text: parentId
        ? `↑ ${flareLabel(parentId)}`
        : formatFlareValue(flareAggregateValue(rootId)),
      dy: 9,
    },
  ]
}

export function createSunburstCenterOverlay(document: Document): SVGSVGElement {
  const namespace = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(namespace, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.dataset.conformanceSunburstCenter = ''
  Object.assign(svg.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    overflow: 'visible',
  })
  for (const id of ['current', 'detail']) {
    const label = document.createElementNS(namespace, 'text')
    label.dataset.sunburstCenterLabel = id
    label.setAttribute('fill', 'CanvasText')
    label.setAttribute('text-anchor', 'middle')
    label.setAttribute('dominant-baseline', 'middle')
    label.setAttribute('font-size', id === 'current' ? '12' : '10')
    label.setAttribute('font-weight', id === 'current' ? '700' : '500')
    svg.append(label)
  }
  return svg
}

export function updateSunburstCenterOverlay(
  svg: SVGSVGElement,
  rootId: string,
  width: number,
  height: number,
) {
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  for (const label of sunburstCenterLabels(rootId)) {
    const element = svg.querySelector<SVGTextElement>(
      `[data-sunburst-center-label="${label.id}"]`,
    )
    element?.setAttribute('x', String(width / 2))
    element?.setAttribute('y', String(height / 2 + label.dy))
    if (element) element.textContent = label.text
  }
}

export function createSunburstCenterControl(
  document: Document,
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.conformanceSunburstBack = ''
  styleSunburstCenterControl(button)
  return button
}

export function styleSunburstCenterControl(button: HTMLButtonElement) {
  Object.assign(button.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    border: '0',
    borderRadius: '999px',
    background: 'transparent',
    color: 'transparent',
    padding: '0',
  })
}

export function updateSunburstCenterControl(
  button: HTMLButtonElement,
  rootId: string,
  width: number,
  height: number,
) {
  const parentId = flareParentId(rootId)
  const diameter = Math.max(44, Math.min(width, height) * 0.27)
  button.style.width = `${diameter}px`
  button.style.height = `${diameter}px`
  button.disabled = parentId === null
  button.style.cursor = parentId ? 'pointer' : 'default'
  button.style.pointerEvents = parentId ? 'auto' : 'none'
  button.setAttribute(
    'aria-label',
    parentId
      ? `Back to ${flareLabel(parentId)}`
      : `${flareLabel(rootId)}, ${formatFlareValue(flareAggregateValue(rootId))}`,
  )
}
