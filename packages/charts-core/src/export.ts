export interface SerializeChartSvgOptions {
  width?: number
  height?: number
  includeFocus?: boolean
}

export interface RenderChartPngOptions extends SerializeChartSvgOptions {
  scale?: number
  background?: string
  type?: 'image/png' | 'image/jpeg' | 'image/webp'
  quality?: number
}

const presentationProperties = [
  'color',
  'fill',
  'fill-opacity',
  'font-family',
  'font-size',
  'font-weight',
  'opacity',
  'stroke',
  'stroke-opacity',
  'stroke-width',
  'stroke-dasharray',
] as const

export function serializeChartSvg(
  target: Element,
  options: SerializeChartSvgOptions = {},
): string {
  const svg = resolveSvg(target)
  const clone = svg.cloneNode(true) as SVGSVGElement
  inlinePresentation(svg, clone)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  if (!options.includeFocus)
    clone.querySelector('[data-ts-chart-focus]')?.remove()
  const dimensions = svgDimensions(svg)
  const width = options.width ?? (dimensions.width || svg.clientWidth)
  const height = options.height ?? (dimensions.height || svg.clientHeight)
  if (width > 0) clone.setAttribute('width', String(width))
  if (height > 0) clone.setAttribute('height', String(height))
  const Serializer =
    svg.ownerDocument.defaultView?.XMLSerializer ?? XMLSerializer
  return new Serializer().serializeToString(clone)
}

export function downloadChartSvg(
  target: Element,
  filename = 'chart.svg',
  options?: SerializeChartSvgOptions,
) {
  const contents = serializeChartSvg(target, options)
  const BlobConstructor = target.ownerDocument.defaultView?.Blob ?? Blob
  downloadBlob(
    target.ownerDocument,
    new BlobConstructor([contents], { type: 'image/svg+xml;charset=utf-8' }),
    filename,
  )
}

export async function renderChartImage(
  target: Element,
  options: RenderChartPngOptions = {},
): Promise<Blob> {
  const svg = resolveSvg(target)
  const document = svg.ownerDocument
  const view = document.defaultView
  if (!view) throw new Error('Chart image export requires a browser document')
  const dimensions = svgDimensions(svg)
  const width = options.width ?? (dimensions.width || svg.clientWidth)
  const height = options.height ?? (dimensions.height || svg.clientHeight)
  if (!(width > 0 && height > 0)) {
    throw new Error('Chart image export requires non-zero dimensions')
  }
  const scale = Math.max(0.1, options.scale ?? 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is unavailable')
  context.scale(scale, scale)
  if (options.background) {
    context.fillStyle = options.background
    context.fillRect(0, 0, width, height)
  }

  const source = serializeChartSvg(svg, {
    ...options,
    width,
    height,
  })
  const url = view.URL.createObjectURL(
    new view.Blob([source], { type: 'image/svg+xml;charset=utf-8' }),
  )
  try {
    const image = await loadImage(view, url)
    context.drawImage(image, 0, 0, width, height)
  } finally {
    view.URL.revokeObjectURL(url)
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Canvas export failed')),
      options.type ?? 'image/png',
      options.quality,
    )
  })
}

export async function downloadChartImage(
  target: Element,
  filename = 'chart.png',
  options?: RenderChartPngOptions,
) {
  downloadBlob(
    target.ownerDocument,
    await renderChartImage(target, options),
    filename,
  )
}

function resolveSvg(target: Element): SVGSVGElement {
  const svg =
    target.localName === 'svg'
      ? (target as SVGSVGElement)
      : target.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) throw new Error('Expected a TanStack Chart SVG')
  return svg
}

function svgDimensions(svg: SVGSVGElement) {
  const values = (svg.getAttribute('viewBox') ?? '')
    .trim()
    .split(/\s+/)
    .map(Number)
  return {
    width: Number.isFinite(values[2]) ? values[2] : 0,
    height: Number.isFinite(values[3]) ? values[3] : 0,
  }
}

function inlinePresentation(source: Element, clone: Element) {
  const view = source.ownerDocument.defaultView
  if (view) {
    const computed = view.getComputedStyle(source)
    for (const property of presentationProperties) {
      const authored =
        source.getAttribute(property) || source.getAttribute('style') || ''
      if (
        property === 'font-family' ||
        authored.includes('var(') ||
        authored.includes('currentColor')
      ) {
        const value = computed.getPropertyValue(property)
        if (value) clone.setAttribute(property, value)
      }
    }
  }
  const sourceChildren = [...source.children]
  const cloneChildren = [...clone.children]
  sourceChildren.forEach((child, index) => {
    const cloneChild = cloneChildren[index]
    if (cloneChild) inlinePresentation(child, cloneChild)
  })
}

function loadImage(view: Window, source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = view.document.createElement('img')
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to decode chart SVG'))
    image.src = source
  })
}

function downloadBlob(document: Document, blob: Blob, filename: string) {
  const Url = document.defaultView?.URL ?? URL
  const url = Url.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  queueMicrotask(() => Url.revokeObjectURL(url))
}
