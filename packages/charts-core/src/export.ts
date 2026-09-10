export interface SerializeChartSvgOptions {
  width?: number
  height?: number
  includeFocus?: boolean
}

export interface RenderChartImageOptions extends SerializeChartSvgOptions {
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
  'stop-color',
  'stop-opacity',
] as const

export function serializeChartSvg(
  target: Element,
  options: SerializeChartSvgOptions = {},
): string {
  const svg = resolveSvg(target)
  const clone = svg.cloneNode(true) as SVGSVGElement
  inlinePresentation(svg, clone)
  inlineComputedDirection(svg, clone)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  if (!options.includeFocus) {
    clone
      .querySelectorAll('[data-ts-focus-layer]')
      .forEach((layer) => layer.remove())
  }
  const dimensions = svgDimensions(svg)
  const width = options.width ?? (dimensions.width || svg.clientWidth)
  const height = options.height ?? (dimensions.height || svg.clientHeight)
  if (width > 0) clone.setAttribute('width', String(width))
  if (height > 0) clone.setAttribute('height', String(height))
  const Serializer =
    svg.ownerDocument.defaultView?.XMLSerializer ?? XMLSerializer
  return new Serializer().serializeToString(clone)
}

function inlineComputedDirection(source: SVGSVGElement, clone: SVGSVGElement) {
  const direction =
    source.ownerDocument.defaultView?.getComputedStyle(source).direction
  if (direction === 'ltr' || direction === 'rtl') {
    clone.setAttribute('direction', direction)
  }
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
  options: RenderChartImageOptions = {},
): Promise<Blob> {
  const layeredSurface = findLayeredSurface(target)
  const svg = layeredSurface ? null : findSvg(target)
  const canvasSurface = layeredSurface || svg ? null : findCanvasSurface(target)
  if (!layeredSurface && !svg && !canvasSurface) {
    throw new Error('Expected a TanStack Chart SVG or Canvas surface')
  }
  const source = layeredSurface ?? svg ?? canvasSurface!
  const document = source.ownerDocument
  const view = document.defaultView
  if (!view) throw new Error('Chart image export requires a browser document')
  const dimensions = layeredSurface
    ? htmlSurfaceDimensions(layeredSurface)
    : svg
      ? svgDimensions(svg)
      : canvasSurfaceDimensions(canvasSurface!)
  const width = options.width ?? dimensions.width
  const height = options.height ?? dimensions.height
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

  if (layeredSurface) {
    await drawLayeredSurface(
      context,
      layeredSurface,
      width,
      height,
      options,
      view,
    )
  } else if (svg) {
    await drawSvg(context, svg, width, height, options, view)
  } else {
    drawCanvasSurface(context, canvasSurface!, width, height, options)
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
  options?: RenderChartImageOptions,
) {
  downloadBlob(
    target.ownerDocument,
    await renderChartImage(target, options),
    filename,
  )
}

function resolveSvg(target: Element): SVGSVGElement {
  if (findLayeredSurface(target)) {
    throw new Error(
      'Mixed-renderer charts require raster export through renderChartImage',
    )
  }
  const svg = findSvg(target)
  if (!svg) throw new Error('Expected a TanStack Chart SVG')
  return svg
}

function findSvg(target: Element): SVGSVGElement | null {
  return target.localName === 'svg'
    ? (target as SVGSVGElement)
    : target.querySelector<SVGSVGElement>('svg.ts-chart')
}

function findCanvasSurface(target: Element): HTMLElement | null {
  return target.classList.contains('ts-chart-canvas')
    ? (target as HTMLElement)
    : target.querySelector<HTMLElement>('.ts-chart-canvas')
}

function findLayeredSurface(target: Element): HTMLElement | null {
  return target.classList.contains('ts-chart-layers')
    ? (target as HTMLElement)
    : target.querySelector<HTMLElement>('.ts-chart-layers')
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

function canvasSurfaceDimensions(surface: HTMLElement) {
  const scene = surface.querySelector<HTMLCanvasElement>(
    '.ts-chart-canvas__scene',
  )
  const bounds = surface.getBoundingClientRect()
  const pixelRatio = positiveNumber(surface.dataset.tsChartPixelRatio) || 1
  return {
    width:
      positiveNumber(surface.dataset.tsChartWidth) ||
      bounds.width ||
      (scene ? scene.width / pixelRatio : 0),
    height:
      positiveNumber(surface.dataset.tsChartHeight) ||
      bounds.height ||
      (scene ? scene.height / pixelRatio : 0),
  }
}

function htmlSurfaceDimensions(surface: HTMLElement) {
  const bounds = surface.getBoundingClientRect()
  return {
    width: positiveNumber(surface.dataset.tsChartWidth) || bounds.width,
    height: positiveNumber(surface.dataset.tsChartHeight) || bounds.height,
  }
}

async function drawLayeredSurface(
  context: CanvasRenderingContext2D,
  surface: HTMLElement,
  width: number,
  height: number,
  options: RenderChartImageOptions,
  view: Window,
) {
  const constructors = view as Window & typeof globalThis
  const layers = [...surface.children].filter(
    (element): element is HTMLElement =>
      element instanceof constructors.HTMLElement &&
      element.classList.contains('ts-chart-layer'),
  )
  for (const layer of layers) {
    const svg = layer.querySelector<SVGSVGElement>('svg.ts-chart')
    const canvas = svg ? null : findCanvasSurface(layer)
    if (svg) {
      await drawSvg(context, svg, width, height, options, view)
    } else if (canvas) {
      drawCanvasSurface(context, canvas, width, height, options)
    } else {
      throw new Error('Layered chart export found an unsupported renderer')
    }
  }
}

async function drawSvg(
  context: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  width: number,
  height: number,
  options: RenderChartImageOptions,
  view: Window,
) {
  const constructors = view as Window & typeof globalThis
  const serialized = serializeChartSvg(svg, { ...options, width, height })
  const url = constructors.URL.createObjectURL(
    new constructors.Blob([serialized], {
      type: 'image/svg+xml;charset=utf-8',
    }),
  )
  try {
    const image = await loadImage(view, url)
    context.drawImage(image, 0, 0, width, height)
  } finally {
    constructors.URL.revokeObjectURL(url)
  }
}

function drawCanvasSurface(
  context: CanvasRenderingContext2D,
  surface: HTMLElement,
  width: number,
  height: number,
  options: RenderChartImageOptions,
) {
  const base = surface.querySelector<HTMLCanvasElement>(
    '.ts-chart-canvas__base',
  )
  const background = surface.querySelector<HTMLCanvasElement>(
    '.ts-chart-canvas__background',
  )
  const focusUnder = surface.querySelector<HTMLCanvasElement>(
    '.ts-chart-canvas__focus-under',
  )
  const scene = surface.querySelector<HTMLCanvasElement>(
    '.ts-chart-canvas__scene',
  )
  if (!scene) throw new Error('Expected a Canvas chart scene layer')
  if (!options.includeFocus && base) {
    context.drawImage(base, 0, 0, width, height)
    return
  }
  if (background) context.drawImage(background, 0, 0, width, height)
  if (options.includeFocus && focusUnder) {
    context.drawImage(focusUnder, 0, 0, width, height)
  }
  context.drawImage(scene, 0, 0, width, height)
  const focus = surface.querySelector<HTMLCanvasElement>(
    '.ts-chart-canvas__focus',
  )
  if (options.includeFocus && focus) {
    context.drawImage(focus, 0, 0, width, height)
  }
}

function positiveNumber(value: string | undefined): number {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
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
