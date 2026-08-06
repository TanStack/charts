import type {
  ChartScene,
  RenderChartSvgOptions,
  SceneGroup,
  SceneNode,
  ScenePolygon,
  SceneStyle,
} from './types'

export interface ChartSvgRenderHooks {
  renderDefinitions?: (scene: ChartScene, idPrefix: string) => string
  renderGroup?: (
    node: SceneGroup,
    idPrefix: string,
  ) => { attributes: string; content: string } | undefined
  resolvePaint?: (value: string, idPrefix: string) => string
}

export function renderChartSvgWithHooks(
  scene: ChartScene,
  options: RenderChartSvgOptions,
  hooks?: ChartSvgRenderHooks,
): string {
  const idPrefix = options.idPrefix ?? ''
  const className = options.className
    ? `ts-chart ${options.className}`
    : 'ts-chart'
  const description = options.ariaDescription
    ? `<desc>${escapeText(options.ariaDescription)}</desc>`
    : ''
  const definitions = hooks?.renderDefinitions?.(scene, idPrefix) ?? ''
  const background =
    scene.theme.background === 'transparent'
      ? ''
      : renderNode(
          {
            kind: 'rect',
            key: 'background',
            x: 0,
            y: 0,
            width: scene.width,
            height: scene.height,
            style: { fill: scene.theme.background },
          },
          hooks,
          idPrefix,
        )

  return `<svg class="${escapeAttribute(className)}" width="100%" height="100%" viewBox="0 0 ${number(scene.width)} ${number(scene.height)}" role="img" aria-roledescription="chart" aria-label="${escapeAttribute(options.ariaLabel)}" tabindex="${number(options.tabIndex ?? 0)}" style="display:block;overflow:visible">${description}${definitions}${background}${scene.nodes.map((node) => renderNode(node, hooks, idPrefix)).join('')}</svg>`
}

function renderNode(
  node: SceneNode,
  hooks: ChartSvgRenderHooks | undefined,
  idPrefix: string,
): string {
  const common = renderCommon(node, hooks, idPrefix)

  switch (node.kind) {
    case 'group': {
      const transform =
        node.translateX === undefined && node.translateY === undefined
          ? ''
          : ` transform="translate(${number(node.translateX ?? 0)} ${number(node.translateY ?? 0)})"`
      const extension = hooks?.renderGroup?.(node, idPrefix)
      const focus = node.focus
        ? ` data-ts-focus-layer="${node.focus.placement}"${node.focus.retarget ? ' data-ts-focus-retarget="true"' : ''} visibility="hidden"`
        : ''
      return `<g${common}${transform}${focus}${extension?.attributes ?? ''}>${extension?.content ?? ''}${node.children.map((child) => renderNode(child, hooks, idPrefix)).join('')}</g>`
    }
    case 'rule':
      return `<line${common} x1="${number(node.x1)}" y1="${number(node.y1)}" x2="${number(node.x2)}" y2="${number(node.y2)}"/>`
    case 'polyline': {
      const path =
        node.path ??
        node.points
          .map(
            ([x, y], index) =>
              `${index === 0 ? 'M' : 'L'}${number(x)},${number(y)}`,
          )
          .join('')
      return `<path${common} d="${path}" vector-effect="non-scaling-stroke"/>`
    }
    case 'area': {
      const path =
        node.polygons !== undefined
          ? polygonsPath(node.polygons)
          : (node.path ?? pointsPath(node.points, true))
      const fillRule = node.polygons === undefined ? '' : ' fill-rule="evenodd"'
      return `<path${common} d="${path}"${fillRule} vector-effect="non-scaling-stroke"/>`
    }
    case 'dot':
      return `<circle${common} cx="${number(node.x)}" cy="${number(node.y)}" r="${number(node.radius)}"/>`
    case 'rect':
      return `<rect${common} x="${number(node.x)}" y="${number(node.y)}" width="${number(node.width)}" height="${number(node.height)}"${node.radius === undefined ? '' : ` rx="${number(node.radius)}"`}/>`
    case 'label': {
      const transform =
        node.rotate === undefined
          ? ''
          : ` transform="rotate(${number(node.rotate)} ${number(node.x)} ${number(node.y)})"`
      const anchor = node.anchor ? ` text-anchor="${node.anchor}"` : ''
      const baseline = node.baseline
        ? ` dominant-baseline="${node.baseline}"`
        : ''
      const fontSize =
        node.fontSize === undefined
          ? ''
          : ` font-size="${number(node.fontSize)}"`
      const fontWeight =
        node.fontWeight === undefined
          ? ''
          : ` font-weight="${number(node.fontWeight)}"`
      return `<text${common} x="${number(node.x)}" y="${number(node.y)}"${anchor}${baseline}${transform}${fontSize}${fontWeight} font-family="inherit">${escapeText(node.text)}</text>`
    }
  }
}

function polygonsPath(polygons: readonly ScenePolygon[]) {
  return polygons
    .flatMap((polygon) => polygon)
    .filter((ring) => ring.length > 0)
    .map((ring) => pointsPath(ring, true))
    .join('')
}

function pointsPath(
  points: readonly (readonly [number, number])[],
  close: boolean,
) {
  return `${points
    .map(
      ([x, y], index) => `${index === 0 ? 'M' : 'L'}${number(x)},${number(y)}`,
    )
    .join('')}${close ? 'Z' : ''}`
}

function renderCommon(
  node: SceneNode,
  hooks: ChartSvgRenderHooks | undefined,
  idPrefix: string,
): string {
  const key = ` data-ts-key="${escapeAttribute(node.key)}"`
  const className = node.className
    ? ` class="${escapeAttribute(node.className)}"`
    : ''
  const ariaHidden = node.ariaHidden ? ' aria-hidden="true"' : ''
  return `${key}${className}${ariaHidden}${renderStyle(node.style, hooks, idPrefix)}`
}

function renderStyle(
  style: SceneStyle | undefined,
  hooks: ChartSvgRenderHooks | undefined,
  idPrefix: string,
): string {
  if (!style) return ''
  const paint = (value: string | undefined) =>
    value && hooks?.resolvePaint ? hooks.resolvePaint(value, idPrefix) : value
  const attributes: [string, string | number | undefined][] = [
    ['fill', paint(style.fill)],
    ['fill-opacity', style.fillOpacity],
    ['stroke', paint(style.stroke)],
    ['stroke-opacity', style.strokeOpacity],
    ['stroke-width', style.strokeWidth],
    ['opacity', style.opacity],
    ['stroke-linecap', style.lineCap],
    ['stroke-linejoin', style.lineJoin],
    ['stroke-dasharray', style.strokeDasharray],
  ]
  return attributes
    .filter((entry): entry is [string, string | number] => entry[1] != null)
    .map(
      ([name, value]) =>
        ` ${name}="${typeof value === 'number' ? number(value) : escapeAttribute(value)}"`,
    )
    .join('')
}

function number(value: number): string {
  return String(Math.round(value * 100) / 100)
}

function escapeText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', '&quot;')
}
