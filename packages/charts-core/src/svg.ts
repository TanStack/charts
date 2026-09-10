import { number, escapeAttribute } from './markup-internal'
import {
  renderChartSvgWithHooks,
  renderSvgClip,
  type ChartSvgRenderHooks,
} from './svg-renderer'
import type { ChartScene, RenderChartSvgOptions } from './types'

export function renderChartSvg(
  scene: ChartScene,
  options: RenderChartSvgOptions,
): string {
  const gradientIds = new Set(scene.gradients.map((gradient) => gradient.id))
  return renderChartSvgWithHooks(scene, options, {
    renderDefinitions: (currentScene, idPrefix) =>
      renderGradients(currentScene, sanitizeId(idPrefix)),
    renderGroup: renderSvgClip,
    resolvePaint: gradientIds.size
      ? (value, idPrefix) => {
          const match = /^url\(#([^)]+)\)$/.exec(value)
          const id = match?.[1]
          return id && gradientIds.has(id)
            ? `url(#${scopedId(sanitizeId(idPrefix), id)})`
            : value
        }
      : undefined,
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

function scopedId(prefix: string, id: string) {
  return prefix ? `${prefix}-${id}` : id
}

function sanitizeId(value: string) {
  return value.replaceAll(/[^a-zA-Z0-9_-]/g, '')
}

function percent(value: number) {
  return `${number(Math.max(0, Math.min(1, value)) * 100)}%`
}
