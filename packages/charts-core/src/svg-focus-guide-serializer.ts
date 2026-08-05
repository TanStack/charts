import { renderFocusGuideLayer } from './svg-renderer'
import type {
  ChartScene,
  ChartSvgRenderer,
  ChartValue,
  RenderChartSvgOptions,
  SceneGroup,
  SceneNode,
} from './types'

export function renderFocusGuideLayerWithRenderer<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>(
  svg: SVGSVGElement,
  scene: ChartScene<TDatum, TXValue, TYValue>,
  nodes: readonly SceneNode[],
  placement: 'under' | 'over',
  options: RenderChartSvgOptions,
  renderSvg: ChartSvgRenderer<TDatum, TXValue, TYValue>,
): string {
  const document = svg.ownerDocument
  const key = `focus-guide-layer:${placement}`
  const wrapper: SceneGroup = {
    kind: 'group',
    key,
    className: `ts-chart__focus-guide-layer ts-chart__focus-guide-layer--${placement}`,
    ariaHidden: true,
    children: nodes,
  }
  const markup = renderSvg(
    {
      ...scene,
      nodes: [wrapper],
      focusGuides: undefined,
    },
    options,
  )
  const root = parseSvgMarkup(document, markup)
  const layer = root ? keyedElement(root, key) : undefined
  if (!root || !layer || layer.localName !== 'g') {
    throw new Error(
      `The SVG renderer must preserve a g[data-ts-key="${key}"] element when serializing focus guides.`,
    )
  }

  layer.classList.add(
    'ts-chart__focus-guide-layer',
    `ts-chart__focus-guide-layer--${placement}`,
  )
  layer.setAttribute('data-ts-focus-layer', placement)
  layer.setAttribute('data-ts-focus-guide-layer', placement)
  layer.setAttribute('aria-hidden', 'true')
  layer.setAttribute('visibility', nodes.length ? 'visible' : 'hidden')
  mergeFocusGuideClipFallback(
    document,
    layer,
    nodes,
    placement,
    options.idPrefix ?? '',
  )
  copyMissingRendererDefinitions(svg, root, layer, key)
  return layer.outerHTML
}

function mergeFocusGuideClipFallback(
  document: Document,
  layer: Element,
  nodes: readonly SceneNode[],
  placement: 'under' | 'over',
  idPrefix: string,
): void {
  const fallback = parseSvgFragment(
    document,
    renderFocusGuideLayer(nodes, placement, idPrefix),
  )
  if (!fallback) return

  for (const source of keyedElements(fallback)) {
    const clipPath = source.getAttribute('clip-path')
    const key = source.getAttribute('data-ts-key')
    if (!clipPath || !key) continue
    const target = keyedElement(layer, key)
    if (!target || target.hasAttribute('clip-path')) continue
    target.setAttribute('clip-path', clipPath)
    const clipDefinition = keyedElement(fallback, `${key}:clip-defs`)
    if (clipDefinition) {
      target.insertBefore(clipDefinition.cloneNode(true), target.firstChild)
    }
  }
}

function copyMissingRendererDefinitions(
  svg: SVGSVGElement,
  renderedRoot: Element,
  layer: Element,
  layerKey: string,
): void {
  const pending = [...referencedIds(layer)]
  const visited = new Set<string>()
  let definitions: Element | undefined

  while (pending.length) {
    const id = pending.shift()
    if (!id || visited.has(id)) continue
    visited.add(id)
    if (elementWithId(layer, id) || baseElementWithId(svg, id)) continue
    const source = elementWithId(renderedRoot, id)
    if (!source) continue
    if (!definitions) {
      definitions = svg.ownerDocument.createElementNS(
        'http://www.w3.org/2000/svg',
        'defs',
      )
      definitions.setAttribute('data-ts-key', `${layerKey}:renderer-defs`)
      layer.insertBefore(definitions, layer.firstChild)
    }
    const clone = source.cloneNode(true) as Element
    definitions.append(clone)
    pending.push(...referencedIds(clone))
  }
}

function baseElementWithId(
  svg: SVGSVGElement,
  id: string,
): Element | undefined {
  const element = elementWithId(svg, id)
  return element?.closest('[data-ts-focus-guide-layer]') ? undefined : element
}

function referencedIds(root: Element): Set<string> {
  const ids = new Set<string>()
  for (const element of [root, ...root.querySelectorAll<Element>('*')]) {
    for (const attribute of element.attributes) {
      for (const match of attribute.value.matchAll(/url\(#([^)]+)\)/g)) {
        if (match[1]) ids.add(match[1])
      }
      if (
        (attribute.localName === 'href' || attribute.name === 'xlink:href') &&
        attribute.value.startsWith('#')
      ) {
        ids.add(attribute.value.slice(1))
      }
    }
  }
  return ids
}

function elementWithId(root: Element, id: string): Element | undefined {
  return [
    ...(root.getAttribute('id') === id ? [root] : []),
    ...root.querySelectorAll<Element>('[id]'),
  ].find((element) => element.getAttribute('id') === id)
}

function parseSvgMarkup(
  document: Document,
  markup: string,
): Element | undefined {
  const template = document.createElement('template')
  template.innerHTML = markup.trim()
  const root = template.content.firstElementChild
  return root?.localName === 'svg' ? root : undefined
}

function parseSvgFragment(
  document: Document,
  markup: string,
): Element | undefined {
  const template = document.createElement('template')
  template.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`
  return template.content.firstElementChild?.firstElementChild ?? undefined
}

function keyedElement(root: Element, key: string): Element | undefined {
  return keyedElements(root).find(
    (element) => element.getAttribute('data-ts-key') === key,
  )
}

function keyedElements(root: Element): Element[] {
  return [
    ...(root.hasAttribute('data-ts-key') ? [root] : []),
    ...root.querySelectorAll<Element>('[data-ts-key]'),
  ]
}
