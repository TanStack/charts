import {
  renderChartSvgWithHooks,
  type ChartSvgRenderHooks,
} from './svg-renderer'
import type { ChartScene, RenderChartSvgOptions, SceneGroup } from './types'

export function renderChartSvgWithResources(
  scene: ChartScene,
  options: RenderChartSvgOptions,
): string {
  const gradientIds = new Set(scene.gradients.map((gradient) => gradient.id))
  return renderChartSvgWithHooks(scene, options, {
    renderDefinitions: (currentScene, idPrefix) =>
      renderGradients(currentScene, sanitizeId(idPrefix)),
    renderGroup: (group, idPrefix) => renderClip(group, sanitizeId(idPrefix)),
    resolvePaint: (value, idPrefix) => {
      const match = /^url\(#([^)]+)\)$/.exec(value)
      const id = match?.[1]
      return id && gradientIds.has(id)
        ? `url(#${scopedId(sanitizeId(idPrefix), id)})`
        : value
    },
  } satisfies ChartSvgRenderHooks)
}

function renderGradients(scene: ChartScene, idPrefix: string) {
  if (!scene.gradients.length) return ''
  return `<defs data-ts-key="gradients">${scene.gradients
    .map(
      (gradient) =>
        `<linearGradient data-ts-key="gradient:${escapeAttribute(gradient.id)}" id="${escapeAttribute(scopedId(idPrefix, gradient.id))}" x1="${percent(gradient.x1 ?? 0)}" y1="${percent(gradient.y1 ?? 1)}" x2="${percent(gradient.x2 ?? 0)}" y2="${percent(gradient.y2 ?? 0)}">${gradient.stops
          .map(
            (stop, index) =>
              `<stop data-ts-key="gradient:${escapeAttribute(gradient.id)}:stop:${index}" offset="${percent(stop.offset)}" stop-color="${escapeAttribute(stop.color)}"${stop.opacity === undefined ? '' : ` stop-opacity="${number(stop.opacity)}"`}/>`,
          )
          .join('')}</linearGradient>`,
    )
    .join('')}</defs>`
}

function renderClip(group: SceneGroup, idPrefix: string) {
  if (!group.clip) return undefined
  const id = scopedId(idPrefix, `ts-chart-clip-${stableId(group.key)}`)
  return {
    attributes: ` clip-path="url(#${id})"`,
    content: `<defs data-ts-key="${escapeAttribute(`${group.key}:clip-defs`)}"><clipPath id="${id}"><rect x="${number(group.clip.x)}" y="${number(group.clip.y)}" width="${number(group.clip.width)}" height="${number(group.clip.height)}"/></clipPath></defs>`,
  }
}

function scopedId(prefix: string, id: string) {
  return prefix ? `${prefix}-${id}` : id
}

function sanitizeId(value: string) {
  return value.replaceAll(/[^a-zA-Z0-9_-]/g, '')
}

function percent(value: number) {
  return `${number(Math.max(0, Math.min(1, value)) * 100)}%`
}

function stableId(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619)
  }
  return (hash >>> 0).toString(36)
}

function number(value: number) {
  return String(Math.round(value * 100) / 100)
}

function escapeAttribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
