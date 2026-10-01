import { number, escapeAttribute } from './markup-internal'
import {
  renderChartSvgWithHooks,
  renderSceneNodes,
  renderSvgClip,
  type ChartSvgRenderHooks,
} from './svg-renderer'
import type { ChartScene, RenderChartSvgOptions } from './types'

export function renderChartSvg(
  scene: ChartScene,
  options: RenderChartSvgOptions,
): string {
  const resourceIds = new Set(
    [...scene.gradients, ...(scene.patterns ?? [])].map(
      (resource) => resource.id,
    ),
  )
  const hooks: ChartSvgRenderHooks = {
    renderDefinitions: (currentScene, idPrefix) =>
      renderGradients(currentScene, sanitizeId(idPrefix)) +
      renderPatterns(currentScene, sanitizeId(idPrefix), hooks),
    renderGroup: renderSvgClip,
    resolvePaint: resourceIds.size
      ? (value, idPrefix) => {
          const match = /^url\(#([^)]+)\)$/.exec(value)
          const id = match?.[1]
          return id && resourceIds.has(id)
            ? `url(#${scopedId(sanitizeId(idPrefix), id)})`
            : value
        }
      : undefined,
  }
  return renderChartSvgWithHooks(scene, options, hooks)
}

function renderGradients(scene: ChartScene, idPrefix: string) {
  if (!scene.gradients.length) return ''
  return `<defs data-ts-key="gradients">${scene.gradients
    .map((gradient) => {
      let minimumOffset = 0
      const stops = gradient.stops
        .map((stop, index) => {
          const offset = Math.max(minimumOffset, clampUnit(stop.offset))
          minimumOffset = offset
          return `<stop data-ts-key="gradient:${escapeAttribute(gradient.id)}:stop:${index}" offset="${percent(offset)}" stop-color="${escapeAttribute(stop.color)}"${stop.opacity === undefined ? '' : ` stop-opacity="${number(stop.opacity)}"`}/>`
        })
        .join('')
      if (gradient.type === 'radial') {
        const cx = gradient.cx ?? 0.5
        const cy = gradient.cy ?? 0.5
        return `<radialGradient data-ts-key="gradient:${escapeAttribute(gradient.id)}" id="${escapeAttribute(scopedId(idPrefix, gradient.id))}" cx="${percent(cx)}" cy="${percent(cy)}" r="${percent(gradient.r ?? 0.5)}" fx="${percent(gradient.fx ?? cx)}" fy="${percent(gradient.fy ?? cy)}">${stops}</radialGradient>`
      }
      return `<linearGradient data-ts-key="gradient:${escapeAttribute(gradient.id)}" id="${escapeAttribute(scopedId(idPrefix, gradient.id))}" x1="${percent(gradient.x1 ?? 0)}" y1="${percent(gradient.y1 ?? 1)}" x2="${percent(gradient.x2 ?? 0)}" y2="${percent(gradient.y2 ?? 0)}">${stops}</linearGradient>`
    })
    .join('')}</defs>`
}

function renderPatterns(
  scene: ChartScene,
  idPrefix: string,
  hooks: ChartSvgRenderHooks,
) {
  if (!scene.patterns?.length) return ''
  return `<defs data-ts-key="patterns">${scene.patterns
    .map(
      (pattern) =>
        `<pattern data-ts-key="pattern:${escapeAttribute(pattern.id)}" id="${escapeAttribute(scopedId(idPrefix, pattern.id))}" width="${number(pattern.width)}" height="${number(pattern.height)}" patternUnits="userSpaceOnUse"${pattern.angle ? ` patternTransform="rotate(${number(-pattern.angle)})"` : ''}>${renderSceneNodes(pattern.nodes, idPrefix, hooks)}</pattern>`,
    )
    .join('')}</defs>`
}

function scopedId(prefix: string, id: string) {
  return prefix ? `${prefix}-${id}` : id
}

function sanitizeId(value: string) {
  return value.replaceAll(/[^a-zA-Z0-9_-]/g, '')
}

function percent(value: number) {
  return `${number(clampUnit(value) * 100)}%`
}

function clampUnit(value: number) {
  return Number.isNaN(value) ? 0 : Math.max(0, Math.min(1, value))
}
