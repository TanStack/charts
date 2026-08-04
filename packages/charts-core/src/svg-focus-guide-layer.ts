export type SvgFocusGuidePlacement = 'under' | 'over'

export type SvgFocusGuideLayers = Partial<
  Record<SvgFocusGuidePlacement, SVGGElement>
>

export function detachSvgFocusGuideLayers(
  svg: SVGSVGElement | null,
): SvgFocusGuideLayers {
  const layers: SvgFocusGuideLayers = {}
  if (!svg) return layers
  for (const placement of ['under', 'over'] as const) {
    const layer = findSvgFocusGuideLayer(svg, placement)
    if (!layer) continue
    layers[placement] = layer
    layer.remove()
  }
  return layers
}

export function restoreSvgFocusGuideLayers(
  svg: SVGSVGElement,
  layers: SvgFocusGuideLayers,
  include: (placement: SvgFocusGuidePlacement) => boolean = () => true,
): void {
  for (const placement of ['under', 'over'] as const) {
    const layer = layers[placement]
    if (layer && include(placement)) {
      placeSvgFocusGuideLayer(svg, layer, placement)
    }
  }
}

export function ensureSvgFocusGuideLayer(
  svg: SVGSVGElement,
  placement: SvgFocusGuidePlacement,
): SVGGElement {
  const existing = findSvgFocusGuideLayer(svg, placement)
  if (existing) return existing
  const layer = svg.ownerDocument.createElementNS(
    'http://www.w3.org/2000/svg',
    'g',
  )
  layer.dataset.tsKey = `focus-guide-layer:${placement}`
  layer.dataset.tsFocusLayer = placement
  layer.dataset.tsFocusGuideLayer = placement
  layer.setAttribute(
    'class',
    `ts-chart__focus-guide-layer ts-chart__focus-guide-layer--${placement}`,
  )
  layer.setAttribute('aria-hidden', 'true')
  layer.setAttribute('visibility', 'hidden')
  placeSvgFocusGuideLayer(svg, layer, placement)
  return layer
}

export function removeSvgFocusGuideLayer(
  svg: SVGSVGElement,
  placement: SvgFocusGuidePlacement,
): void {
  findSvgFocusGuideLayer(svg, placement)?.remove()
}

function placeSvgFocusGuideLayer(
  svg: SVGSVGElement,
  layer: SVGGElement,
  placement: SvgFocusGuidePlacement,
): void {
  if (placement === 'under') {
    const marks = [...svg.children].find((child) =>
      child.classList.contains('ts-chart__marks'),
    )
    svg.insertBefore(layer, marks ?? null)
  } else {
    svg.append(layer)
  }
}

function findSvgFocusGuideLayer(
  svg: SVGSVGElement,
  placement: SvgFocusGuidePlacement,
): SVGGElement | undefined {
  return [...svg.children].find(
    (child): child is SVGGElement =>
      child.localName === 'g' &&
      child.getAttribute('data-ts-focus-guide-layer') === placement,
  )
}
