import { mountChartRenderer } from './renderer'
import { createChartRuntime } from './runtime'
import { focusedSceneNodes } from './focus-layer'
import { resolveMarkStateScene, resolveMarkStateTransition } from './mark-state'
import type {
  ChartRenderer,
  ChartRendererHost,
  ChartRendererHostOptions,
  ChartSurface,
  ChartSurfaceRenderOptions,
} from './dom-types'
import type {
  ChartAnimationOptions,
  ChartBounds,
  ChartMarkStateTransition,
  ChartPoint,
  ChartRuntime,
  ChartScene,
  ChartValue,
  RenderChartOptions,
  SceneNode,
  SceneStyle,
} from './types'

export interface CanvasChartRendererOptions {
  pixelRatio?: number
}

export interface CanvasChartSurface<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartSurface<TDatum, TXValue, TYValue> {
  readonly element: HTMLDivElement
  readonly canvas: HTMLCanvasElement
  readonly focusUnderCanvas: HTMLCanvasElement
  readonly focusCanvas: HTMLCanvasElement
}

export interface CanvasChartRenderer<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> extends ChartRenderer<TDatum, TXValue, TYValue> {
  mount: (
    container: HTMLElement,
    requestRender: (force?: boolean) => void,
  ) => CanvasChartSurface<TDatum, TXValue, TYValue>
}

interface UniversalCanvasChartRenderer {
  readonly id: string
  prerender: <
    TDatum = unknown,
    TXValue extends ChartValue = ChartValue,
    TYValue extends ChartValue = ChartValue,
  >(
    scene: ChartScene<TDatum, TXValue, TYValue>,
    options: RenderChartOptions,
  ) => string
  mount: <
    TDatum = unknown,
    TXValue extends ChartValue = ChartValue,
    TYValue extends ChartValue = ChartValue,
  >(
    container: HTMLElement,
    requestRender: (force?: boolean) => void,
  ) => CanvasChartSurface<TDatum, TXValue, TYValue>
}

type DistributiveOmit<TValue, TKey extends PropertyKey> = TValue extends unknown
  ? Omit<TValue, TKey>
  : never

export type CanvasChartHostOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = DistributiveOmit<
  ChartRendererHostOptions<TDatum, TXValue, TYValue>,
  'renderer'
>

export interface CanvasChartHost<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  update: (options: CanvasChartHostOptions<TDatum, TXValue, TYValue>) => void
  getScene: () => ChartScene<TDatum, TXValue, TYValue>
  destroy: () => void
}

interface PaintState {
  fill: string | null
  fillOpacity: number
  stroke: string | null
  strokeOpacity: number
  strokeWidth: number
  opacity: number
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
  strokeDasharray: string
}

interface FontState {
  family: string
  size: number
  style: string
  weight: string
  stretch: CanvasFontStretch
  direction: CanvasDirection
  letterSpacing: string
}

interface ScenePainter {
  context: CanvasRenderingContext2D
  resolver: CanvasPaintResolver
  scene: ChartScene
  Path: typeof Path2D | undefined
  font: FontState
}

const defaultPaint: PaintState = {
  fill: 'black',
  fillOpacity: 1,
  stroke: null,
  strokeOpacity: 1,
  strokeWidth: 1,
  opacity: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  strokeDasharray: '',
}

export function createCanvasChartRenderer<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  rendererOptions: CanvasChartRendererOptions = {},
): CanvasChartRenderer<TDatum, TXValue, TYValue> {
  return createUniversalCanvasChartRenderer(rendererOptions)
}

function createUniversalCanvasChartRenderer(
  rendererOptions: CanvasChartRendererOptions = {},
): UniversalCanvasChartRenderer {
  const renderer: UniversalCanvasChartRenderer = {
    id: 'canvas',
    prerender(scene, options) {
      return renderCanvasShell(scene, options)
    },
    mount<
      TDatum = unknown,
      TXValue extends ChartValue = ChartValue,
      TYValue extends ChartValue = ChartValue,
    >(container: HTMLElement, requestRender: (force?: boolean) => void) {
      const document = container.ownerDocument
      const view = document.defaultView
      const root = findOrCreateRoot(container)
      const focusUnderCanvas = findOrCreateCanvas(
        root,
        'ts-chart-canvas__focus-under',
      )
      const canvas = findOrCreateCanvas(root, 'ts-chart-canvas__scene')
      const focusCanvas = findOrCreateCanvas(root, 'ts-chart-canvas__focus')
      const resolver = new CanvasPaintResolver(root)
      const mutationObserver = observeTheme(container, requestRender)
      const colorScheme = view?.matchMedia?.('(prefers-color-scheme: dark)')
      const forcedColors = view?.matchMedia?.('(forced-colors: active)')
      const handleEnvironmentChange = () => requestRender(true)
      colorScheme?.addEventListener?.('change', handleEnvironmentChange)
      forcedColors?.addEventListener?.('change', handleEnvironmentChange)
      view?.addEventListener('resize', handleEnvironmentChange)

      let scene: ChartScene<TDatum, TXValue, TYValue> | undefined
      let pixelRatio = 1
      let cancelAnimation = () => {}
      let stateTransition: ChartMarkStateTransition | undefined
      let destroyed = false

      const surface: CanvasChartSurface<TDatum, TXValue, TYValue> = {
        renderer,
        element: root,
        canvas,
        focusUnderCanvas,
        focusCanvas,
        render(nextScene, options) {
          if (destroyed) return
          cancelAnimation()
          cancelAnimation = () => {}
          configureRoot(root, options)
          resolver.refresh()
          const nextPixelRatio = resolvePixelRatio(
            rendererOptions.pixelRatio,
            view,
          )
          const canAnimate =
            options.animation !== undefined &&
            scene !== undefined &&
            scene.width === nextScene.width &&
            scene.height === nextScene.height &&
            pixelRatio === nextPixelRatio
          pixelRatio = nextPixelRatio
          sizeCanvas(canvas, nextScene, pixelRatio)
          sizeCanvas(focusUnderCanvas, nextScene, pixelRatio)
          sizeCanvas(focusCanvas, nextScene, pixelRatio)
          root.dataset.tsChartWidth = String(nextScene.width)
          root.dataset.tsChartHeight = String(nextScene.height)
          root.dataset.tsChartPixelRatio = String(pixelRatio)
          clearCanvas(focusUnderCanvas, nextScene, pixelRatio)
          clearCanvas(focusCanvas, nextScene, pixelRatio)

          if (canAnimate) {
            cancelAnimation = animateScene(
              canvas,
              nextScene,
              pixelRatio,
              options.animation!,
              resolver,
              root,
            )
          } else {
            paintCanvas(canvas, nextScene, pixelRatio, resolver, root)
          }
          scene = nextScene
          stateTransition = undefined
        },
        clientToScene(currentScene, clientX, clientY) {
          const bounds = root.getBoundingClientRect()
          if (!bounds.width || !bounds.height) return null
          return {
            x: ((clientX - bounds.left) / bounds.width) * currentScene.width,
            y: ((clientY - bounds.top) / bounds.height) * currentScene.height,
          }
        },
        paintFocus(focus, pointer) {
          if (!scene || destroyed) return
          const resolved = resolveMarkStateScene(scene, focus, pointer)
          const previousTransition = stateTransition
          if (resolved.scene !== scene || previousTransition) {
            cancelAnimation()
            const transition = resolveMarkStateTransition(
              resolved.transition ?? previousTransition,
              root,
            )
            if (transition) {
              cancelAnimation = animateScene(
                canvas,
                resolved.scene,
                pixelRatio,
                transition,
                resolver,
                root,
              )
            } else {
              paintCanvas(canvas, resolved.scene, pixelRatio, resolver, root)
              cancelAnimation = () => {}
            }
          }
          stateTransition = focus
            ? (resolved.transition ?? previousTransition)
            : undefined
          paintFocusCanvas(
            focusUnderCanvas,
            resolved.scene,
            focusedSceneNodes(resolved.scene, focus, 'under'),
            pixelRatio,
            resolver,
            root,
          )
          paintFocusCanvas(
            focusCanvas,
            resolved.scene,
            focusedSceneNodes(resolved.scene, focus, 'over'),
            pixelRatio,
            resolver,
            root,
          )
          return resolved.scene
        },
        destroy() {
          if (destroyed) return
          destroyed = true
          cancelAnimation()
          mutationObserver?.disconnect()
          colorScheme?.removeEventListener?.('change', handleEnvironmentChange)
          forcedColors?.removeEventListener?.('change', handleEnvironmentChange)
          view?.removeEventListener('resize', handleEnvironmentChange)
          resolver.destroy()
        },
      }

      return surface
    },
  }

  return renderer
}

export const canvasChartRenderer = createUniversalCanvasChartRenderer()

export function mountCanvasChart<
  TDatum,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  container: HTMLElement,
  initialOptions: CanvasChartHostOptions<TDatum, TXValue, TYValue>,
  runtime: ChartRuntime<TDatum, TXValue, TYValue> = createChartRuntime<
    TDatum,
    TXValue,
    TYValue
  >(),
): CanvasChartHost<TDatum, TXValue, TYValue> {
  const withRenderer = (
    options: CanvasChartHostOptions<TDatum, TXValue, TYValue>,
  ): ChartRendererHostOptions<TDatum, TXValue, TYValue> => {
    return { ...options, renderer: canvasChartRenderer }
  }
  const host: ChartRendererHost<TDatum, TXValue, TYValue> = mountChartRenderer(
    container,
    withRenderer(initialOptions),
    runtime,
  )

  return {
    update(options) {
      host.update(withRenderer(options))
    },
    getScene: host.getScene,
    destroy: host.destroy,
  }
}

function renderCanvasShell(
  scene: ChartScene,
  options: ChartSurfaceRenderOptions,
): string {
  const className = options.className
    ? `ts-chart ts-chart-canvas ${options.className}`
    : 'ts-chart ts-chart-canvas'
  const description = options.ariaDescription
    ? ` aria-description="${escapeAttribute(options.ariaDescription)}"`
    : ''
  const width = integer(scene.width)
  const height = integer(scene.height)
  return `<div class="${escapeAttribute(className)}" role="img" aria-roledescription="chart" aria-label="${escapeAttribute(options.ariaLabel)}"${description} tabindex="${integer(options.tabIndex ?? 0)}" data-ts-chart-width="${width}" data-ts-chart-height="${height}" data-ts-chart-pixel-ratio="1" style="display:block;position:relative;width:100%;height:100%;overflow:visible"><canvas class="ts-chart-canvas__focus-under" width="${width}" height="${height}" aria-hidden="true" style="display:block;position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></canvas><canvas class="ts-chart-canvas__scene" width="${width}" height="${height}" aria-hidden="true" style="display:block;position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></canvas><canvas class="ts-chart-canvas__focus" width="${width}" height="${height}" aria-hidden="true" style="display:block;position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></canvas></div>`
}

function findOrCreateRoot(container: HTMLElement): HTMLDivElement {
  const existing = container.querySelector<HTMLDivElement>(
    ':scope > .ts-chart-canvas',
  )
  if (existing) return existing
  const root = container.ownerDocument.createElement('div')
  container.replaceChildren(root)
  return root
}

function findOrCreateCanvas(
  root: HTMLDivElement,
  className: string,
): HTMLCanvasElement {
  const existing = root.querySelector<HTMLCanvasElement>(`.${className}`)
  if (existing) return existing
  const canvas = root.ownerDocument.createElement('canvas')
  canvas.className = className
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, {
    display: 'block',
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  })
  root.append(canvas)
  return canvas
}

function configureRoot(
  root: HTMLDivElement,
  options: ChartSurfaceRenderOptions,
): void {
  root.className = options.className
    ? `ts-chart ts-chart-canvas ${options.className}`
    : 'ts-chart ts-chart-canvas'
  root.setAttribute('role', 'img')
  root.setAttribute('aria-roledescription', 'chart')
  root.setAttribute('aria-label', options.ariaLabel)
  if (options.ariaDescription) {
    root.setAttribute('aria-description', options.ariaDescription)
  } else {
    root.removeAttribute('aria-description')
  }
  root.tabIndex = options.tabIndex ?? 0
  Object.assign(root.style, {
    display: 'block',
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'visible',
  })
}

function resolvePixelRatio(
  configured: number | undefined,
  view: Window | null,
): number {
  const value = configured ?? view?.devicePixelRatio ?? 1
  return Number.isFinite(value) && value > 0 ? value : 1
}

function sizeCanvas(
  canvas: HTMLCanvasElement,
  scene: ChartScene,
  pixelRatio: number,
): void {
  const width = Math.max(1, Math.ceil(scene.width * pixelRatio))
  const height = Math.max(1, Math.ceil(scene.height * pixelRatio))
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
}

function clearCanvas(
  canvas: HTMLCanvasElement,
  scene: ChartScene,
  pixelRatio: number,
): void {
  const context = requiredContext(canvas)
  resetContext(context, pixelRatio)
  context.clearRect(0, 0, scene.width, scene.height)
}

function paintCanvas(
  canvas: HTMLCanvasElement,
  scene: ChartScene,
  pixelRatio: number,
  resolver: CanvasPaintResolver,
  root: HTMLDivElement,
): void {
  const context = requiredContext(canvas)
  resetContext(context, pixelRatio)
  context.clearRect(0, 0, scene.width, scene.height)
  paintScene(context, scene, resolver, root)
}

function resetContext(
  context: CanvasRenderingContext2D,
  pixelRatio: number,
): void {
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  context.globalAlpha = 1
  context.setLineDash([])
}

function animateScene(
  canvas: HTMLCanvasElement,
  scene: ChartScene,
  pixelRatio: number,
  animation: ChartAnimationOptions,
  resolver: CanvasPaintResolver,
  root: HTMLDivElement,
): () => void {
  const document = canvas.ownerDocument
  const view = document.defaultView
  const duration = Math.max(0, animation.duration ?? 250)
  if (!view?.requestAnimationFrame || duration === 0) {
    paintCanvas(canvas, scene, pixelRatio, resolver, root)
    return () => {}
  }

  const previous = document.createElement('canvas')
  previous.width = canvas.width
  previous.height = canvas.height
  requiredContext(previous).drawImage(canvas, 0, 0)
  const target = document.createElement('canvas')
  target.width = canvas.width
  target.height = canvas.height
  paintCanvas(target, scene, pixelRatio, resolver, root)

  const context = requiredContext(canvas)
  const ease = resolveEasing(animation.easing)
  let frame: number | undefined
  let canceled = false
  let start: number | undefined

  const paintFrame = (time: number) => {
    if (canceled) return
    start ??= time
    const progress = duration === 0 ? 1 : Math.min(1, (time - start) / duration)
    const eased = ease(progress)
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.globalAlpha = 1 - eased
    context.drawImage(previous, 0, 0)
    context.globalAlpha = eased
    context.drawImage(target, 0, 0)
    context.globalAlpha = 1
    if (progress < 1) {
      frame = view.requestAnimationFrame(paintFrame)
    } else {
      frame = undefined
    }
  }

  frame = view.requestAnimationFrame(paintFrame)
  return () => {
    canceled = true
    if (frame !== undefined) view.cancelAnimationFrame(frame)
  }
}

function resolveEasing(
  easing: ChartAnimationOptions['easing'],
): (progress: number) => number {
  if (typeof easing === 'function') return easing
  switch (easing) {
    case 'ease-in':
      return (progress) => progress * progress
    case 'ease-out':
      return (progress) => 1 - (1 - progress) * (1 - progress)
    case 'ease':
    case 'ease-in-out':
      return (progress) =>
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2
    default:
      return (progress) => progress
  }
}

function paintScene(
  context: CanvasRenderingContext2D,
  scene: ChartScene,
  resolver: CanvasPaintResolver,
  root: HTMLDivElement,
): void {
  const Path = root.ownerDocument.defaultView?.Path2D
  const font = readFont(root)
  const painter: ScenePainter = { context, resolver, scene, Path, font }
  if (scene.theme.background !== 'transparent') {
    const background = resolver.resolve(scene.theme.background)
    if (background) {
      context.fillStyle = background
      context.fillRect(0, 0, scene.width, scene.height)
    }
  }
  paintNodes(painter, scene.nodes, defaultPaint)
}

function paintFocusCanvas(
  canvas: HTMLCanvasElement,
  scene: ChartScene,
  nodes: readonly SceneNode[],
  pixelRatio: number,
  resolver: CanvasPaintResolver,
  root: HTMLDivElement,
) {
  const context = requiredContext(canvas)
  resetContext(context, pixelRatio)
  context.clearRect(0, 0, scene.width, scene.height)
  if (!nodes.length) return
  const Path = root.ownerDocument.defaultView?.Path2D
  const font = readFont(root)
  paintNodes({ context, resolver, scene, Path, font }, nodes, defaultPaint)
}

function paintNodes(
  painter: ScenePainter,
  nodes: readonly SceneNode[],
  parent: PaintState,
): void {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (!node) continue
    if (node.kind === 'dot') {
      index = paintDotRun(painter, nodes, index, parent)
    } else {
      paintNode(painter, node, parent)
    }
  }
}

function paintNode(
  painter: ScenePainter,
  node: SceneNode,
  parent: PaintState,
): void {
  const state = resolveStyle(parent, node.style)
  const { context } = painter
  context.save()

  try {
    switch (node.kind) {
      case 'group': {
        if (node.focus) return
        context.translate(node.translateX ?? 0, node.translateY ?? 0)
        if (node.clip) {
          context.beginPath()
          context.rect(
            node.clip.x,
            node.clip.y,
            node.clip.width,
            node.clip.height,
          )
          context.clip()
        }
        paintNodes(painter, node.children, state)
        return
      }
      case 'rule':
        context.beginPath()
        context.moveTo(node.x1, node.y1)
        context.lineTo(node.x2, node.y2)
        strokeCurrentPath(painter, state, boundsForNode(node))
        return
      case 'polyline': {
        const pathData = node.pathGeometry?.data ?? node.path
        if (pathData) {
          const path = pathFromData(painter, pathData)
          paintPath(painter, path, state, boundsForNode(node))
        } else {
          beginPointPath(context, node.points, false)
          paintCurrentPath(painter, state, boundsForNode(node))
        }
        return
      }
      case 'area': {
        const pathData = node.pathGeometry?.data ?? node.path
        if (pathData) {
          const path = pathFromData(painter, pathData)
          paintPath(painter, path, state, boundsForNode(node))
        } else {
          beginPointPath(context, node.points, true)
          paintCurrentPath(painter, state, boundsForNode(node))
        }
        return
      }
      case 'dot':
        context.beginPath()
        context.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        paintCurrentPath(painter, state, boundsForNode(node))
        return
      case 'rect':
        beginRoundedRect(
          context,
          node.x,
          node.y,
          node.width,
          node.height,
          node.radius ?? 0,
        )
        paintCurrentPath(painter, state, boundsForNode(node))
        return
      case 'label':
        paintLabel(painter, node, state)
    }
  } finally {
    context.restore()
  }
}

function paintDotRun(
  painter: ScenePainter,
  nodes: readonly SceneNode[],
  start: number,
  parent: PaintState,
): number {
  const first = nodes[start]
  if (!first || first.kind !== 'dot') return start
  const state = resolveStyle(parent, first.style)
  if (usesGradient(state)) {
    paintNode(painter, first, parent)
    return start
  }

  const { context } = painter
  context.save()
  try {
    context.beginPath()
    let index = start
    for (; index < nodes.length; index += 1) {
      const node = nodes[index]
      if (
        !node ||
        node.kind !== 'dot' ||
        !samePaintState(resolveStyle(parent, node.style), state)
      ) {
        break
      }
      context.moveTo(node.x + node.radius, node.y)
      context.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
    }
    paintCurrentPath(painter, state, null)
    return index - 1
  } finally {
    context.restore()
  }
}

function usesGradient(state: PaintState): boolean {
  return Boolean(
    state.fill?.startsWith('url(#') || state.stroke?.startsWith('url(#'),
  )
}

function samePaintState(left: PaintState, right: PaintState): boolean {
  return (
    left.fill === right.fill &&
    left.fillOpacity === right.fillOpacity &&
    left.stroke === right.stroke &&
    left.strokeOpacity === right.strokeOpacity &&
    left.strokeWidth === right.strokeWidth &&
    left.opacity === right.opacity &&
    left.lineCap === right.lineCap &&
    left.lineJoin === right.lineJoin &&
    left.strokeDasharray === right.strokeDasharray
  )
}

function pathFromData(painter: ScenePainter, data: string): Path2D {
  if (!painter.Path) {
    throw new Error(
      'Canvas rendering of curved, polar, or geographic paths requires Path2D.',
    )
  }
  return new painter.Path(data)
}

function beginPointPath(
  context: CanvasRenderingContext2D,
  points: readonly (readonly [number, number])[],
  close: boolean,
): void {
  context.beginPath()
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  })
  if (close && points.length) context.closePath()
}

function beginRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const resolved = Math.max(0, Math.min(radius, width / 2, height / 2))
  context.beginPath()
  if (resolved === 0) {
    context.rect(x, y, width, height)
    return
  }
  context.moveTo(x + resolved, y)
  context.lineTo(x + width - resolved, y)
  context.arcTo(x + width, y, x + width, y + resolved, resolved)
  context.lineTo(x + width, y + height - resolved)
  context.arcTo(
    x + width,
    y + height,
    x + width - resolved,
    y + height,
    resolved,
  )
  context.lineTo(x + resolved, y + height)
  context.arcTo(x, y + height, x, y + height - resolved, resolved)
  context.lineTo(x, y + resolved)
  context.arcTo(x, y, x + resolved, y, resolved)
  context.closePath()
}

function paintPath(
  painter: ScenePainter,
  path: Path2D,
  state: PaintState,
  bounds: ChartBounds | null,
): void {
  fillPath(painter, state, bounds, path)
  strokePath(painter, state, bounds, path)
}

function paintCurrentPath(
  painter: ScenePainter,
  state: PaintState,
  bounds: ChartBounds | null,
): void {
  fillCurrentPath(painter, state, bounds)
  strokeCurrentPath(painter, state, bounds)
}

function fillPath(
  painter: ScenePainter,
  state: PaintState,
  bounds: ChartBounds | null,
  path: Path2D,
): void {
  const fill = resolvePaint(painter, state.fill, bounds)
  if (!fill) return
  painter.context.globalAlpha = state.opacity * state.fillOpacity
  painter.context.fillStyle = fill
  painter.context.fill(path)
}

function strokePath(
  painter: ScenePainter,
  state: PaintState,
  bounds: ChartBounds | null,
  path: Path2D,
): void {
  const stroke = resolvePaint(painter, state.stroke, bounds)
  if (!stroke) return
  configureStroke(painter.context, state, stroke)
  painter.context.stroke(path)
}

function fillCurrentPath(
  painter: ScenePainter,
  state: PaintState,
  bounds: ChartBounds | null,
): void {
  const fill = resolvePaint(painter, state.fill, bounds)
  if (!fill) return
  painter.context.globalAlpha = state.opacity * state.fillOpacity
  painter.context.fillStyle = fill
  painter.context.fill()
}

function strokeCurrentPath(
  painter: ScenePainter,
  state: PaintState,
  bounds: ChartBounds | null,
): void {
  const stroke = resolvePaint(painter, state.stroke, bounds)
  if (!stroke) return
  configureStroke(painter.context, state, stroke)
  painter.context.stroke()
}

function configureStroke(
  context: CanvasRenderingContext2D,
  state: PaintState,
  stroke: string | CanvasGradient,
): void {
  context.globalAlpha = state.opacity * state.strokeOpacity
  context.strokeStyle = stroke
  context.lineWidth = state.strokeWidth
  context.lineCap = state.lineCap
  context.lineJoin = state.lineJoin
  context.setLineDash(parseDasharray(state.strokeDasharray))
}

function paintLabel(
  painter: ScenePainter,
  node: Extract<SceneNode, { kind: 'label' }>,
  state: PaintState,
): void {
  const { context } = painter
  const fontSize = node.fontSize ?? painter.font.size
  const fontWeight = node.fontWeight ?? painter.font.weight
  context.translate(node.x, node.y)
  if (node.rotate !== undefined) {
    context.rotate((node.rotate * Math.PI) / 180)
  }
  context.font = [
    painter.font.style,
    fontWeight,
    `${fontSize}px`,
    painter.font.family,
  ].join(' ')
  if ('fontStretch' in context) context.fontStretch = painter.font.stretch
  if ('letterSpacing' in context) {
    context.letterSpacing = painter.font.letterSpacing
  }
  context.direction = painter.font.direction
  context.textAlign =
    node.anchor === 'middle'
      ? 'center'
      : node.anchor === 'end'
        ? 'right'
        : 'left'
  context.textBaseline =
    node.baseline === 'middle'
      ? 'middle'
      : node.baseline === 'hanging'
        ? 'hanging'
        : 'alphabetic'
  const fill = resolvePaint(painter, state.fill, null)
  if (fill) {
    context.globalAlpha = state.opacity * state.fillOpacity
    context.fillStyle = fill
    context.fillText(node.text, 0, 0)
  }
  const stroke = resolvePaint(painter, state.stroke, null)
  if (stroke) {
    configureStroke(context, state, stroke)
    context.strokeText(node.text, 0, 0)
  }
}

function resolveStyle(parent: PaintState, style: SceneStyle | undefined) {
  if (!style) return parent
  return {
    fill: style.fill === undefined ? parent.fill : paintValue(style.fill),
    fillOpacity: style.fillOpacity ?? parent.fillOpacity,
    stroke:
      style.stroke === undefined ? parent.stroke : paintValue(style.stroke),
    strokeOpacity: style.strokeOpacity ?? parent.strokeOpacity,
    strokeWidth: style.strokeWidth ?? parent.strokeWidth,
    opacity: parent.opacity * (style.opacity ?? 1),
    lineCap: style.lineCap ?? parent.lineCap,
    lineJoin: resolveLineJoin(style.lineJoin) ?? parent.lineJoin,
    strokeDasharray: style.strokeDasharray ?? parent.strokeDasharray,
  } satisfies PaintState
}

function paintValue(value: string): string | null {
  return value === 'none' ? null : value
}

function resolveLineJoin(
  value: SceneStyle['lineJoin'],
): CanvasLineJoin | undefined {
  if (value === 'arcs') return 'round'
  if (value === 'miter-clip') return 'miter'
  return value
}

function resolvePaint(
  painter: ScenePainter,
  value: string | null,
  bounds: ChartBounds | null,
): string | CanvasGradient | null {
  if (!value) return null
  const match = /^url\(#([^)]+)\)$/.exec(value)
  if (!match) return painter.resolver.resolve(value)
  const gradient = painter.scene.gradients.find(
    (candidate) => candidate.id === match[1],
  )
  if (!gradient) return null
  if (!bounds) {
    throw new Error(
      `Canvas gradient "${gradient.id}" requires geometry with measurable bounds.`,
    )
  }
  const canvasGradient = painter.context.createLinearGradient(
    bounds.x + (gradient.x1 ?? 0) * bounds.width,
    bounds.y + (gradient.y1 ?? 1) * bounds.height,
    bounds.x + (gradient.x2 ?? 0) * bounds.width,
    bounds.y + (gradient.y2 ?? 0) * bounds.height,
  )
  for (const stop of gradient.stops) {
    const color = painter.resolver.resolve(stop.color)
    if (!color) continue
    canvasGradient.addColorStop(
      Math.max(0, Math.min(1, stop.offset)),
      stop.opacity === undefined
        ? color
        : painter.resolver.withOpacity(color, stop.opacity),
    )
  }
  return canvasGradient
}

function boundsForNode(node: Exclude<SceneNode, { kind: 'group' | 'label' }>) {
  switch (node.kind) {
    case 'rule':
      return boundsFromPoints([
        [node.x1, node.y1],
        [node.x2, node.y2],
      ])
    case 'polyline':
    case 'area':
      return node.pathGeometry?.bounds ?? boundsFromPoints(node.points)
    case 'dot':
      return {
        x: node.x - node.radius,
        y: node.y - node.radius,
        width: node.radius * 2,
        height: node.radius * 2,
      }
    case 'rect':
      return { x: node.x, y: node.y, width: node.width, height: node.height }
  }
}

function boundsFromPoints(
  points: readonly (readonly [number, number])[],
): ChartBounds | null {
  if (!points.length) return null
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const [x, y] of points) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }
}

function parseDasharray(value: string): number[] {
  if (!value || value === 'none') return []
  return value
    .split(/[,\s]+/)
    .map(Number)
    .filter((part) => Number.isFinite(part) && part >= 0)
}

function readFont(root: HTMLDivElement): FontState {
  const computed = root.ownerDocument.defaultView?.getComputedStyle(root)
  const size = Number.parseFloat(computed?.fontSize ?? '')
  return {
    family: computed?.fontFamily || 'sans-serif',
    size: Number.isFinite(size) && size > 0 ? size : 16,
    style: computed?.fontStyle || 'normal',
    weight: computed?.fontWeight || '400',
    stretch: normalizeFontStretch(computed?.fontStretch),
    direction:
      computed?.direction === 'rtl'
        ? 'rtl'
        : computed?.direction === 'ltr'
          ? 'ltr'
          : 'inherit',
    letterSpacing: computed?.letterSpacing || '0px',
  }
}

function normalizeFontStretch(value: string | undefined): CanvasFontStretch {
  if (
    value === 'ultra-condensed' ||
    value === 'extra-condensed' ||
    value === 'condensed' ||
    value === 'semi-condensed' ||
    value === 'normal' ||
    value === 'semi-expanded' ||
    value === 'expanded' ||
    value === 'extra-expanded' ||
    value === 'ultra-expanded'
  ) {
    return value
  }
  return 'normal'
}

class CanvasPaintResolver {
  readonly #root: HTMLDivElement
  readonly #probe: HTMLSpanElement
  readonly #cache = new Map<string, string>()

  constructor(root: HTMLDivElement) {
    this.#root = root
    this.#probe = root.ownerDocument.createElement('span')
    this.#probe.setAttribute('aria-hidden', 'true')
    Object.assign(this.#probe.style, {
      position: 'absolute',
      width: '0',
      height: '0',
      overflow: 'hidden',
      pointerEvents: 'none',
      visibility: 'hidden',
    })
    root.append(this.#probe)
  }

  refresh(): void {
    this.#cache.clear()
  }

  resolve(value: string): string | null {
    if (value === 'none') return null
    const cached = this.#cache.get(value)
    if (cached) return cached
    this.#probe.style.color = ''
    this.#probe.style.color = value
    if (!this.#probe.style.color) {
      throw new TypeError(`Invalid Canvas paint: ${value}`)
    }
    const resolved =
      this.#root.ownerDocument.defaultView?.getComputedStyle(this.#probe)
        .color || value
    this.#cache.set(value, resolved)
    return resolved
  }

  withOpacity(color: string, opacity: number): string {
    const value = `color-mix(in srgb, ${color} ${Math.max(0, Math.min(1, opacity)) * 100}%, transparent)`
    return this.resolve(value) ?? 'transparent'
  }

  destroy(): void {
    this.#probe.remove()
    this.#cache.clear()
  }
}

function observeTheme(
  container: HTMLElement,
  requestRender: (force?: boolean) => void,
): MutationObserver | undefined {
  const Observer = container.ownerDocument.defaultView?.MutationObserver
  if (!Observer) return undefined
  const observer = new Observer(() => requestRender(true))
  let current: HTMLElement | null = container
  while (current) {
    observer.observe(current, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    })
    current = current.parentElement
  }
  return observer
}

function requiredContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('The Canvas renderer requires a Canvas 2D context.')
  }
  return context
}

function integer(value: number): string {
  return String(Math.max(0, Math.round(value)))
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
