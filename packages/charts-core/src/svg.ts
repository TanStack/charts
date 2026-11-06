import {
  renderChartSvgWithHooks,
  renderSvgClip,
  escapeAttribute,
  number,
  type ChartSvgRenderHooks,
} from './svg-renderer'
import type { ChartScene, RenderChartSvgOptions } from './types'

export function renderChartSvg(
  scene: ChartScene,
  options: RenderChartSvgOptions,
): string {
  const idPrefix = sanitizeId(options.idPrefix ?? '')
  const paints = new Map(
    scene.gradients.map(({ id }) => [
      `url(#${id})`,
      `url(#${scopedId(idPrefix, id)})`,
    ]),
  )
  return renderChartSvgWithHooks(scene, options, {
    renderDefinitions: (currentScene) =>
      renderGradients(currentScene, idPrefix),
    renderGroup: renderSvgClip,
    resolvePaint: (value) => paints.get(value) ?? value,
  } satisfies ChartSvgRenderHooks)
}

function renderGradients(scene: ChartScene, idPrefix: string) {
  if (!scene.gradients.length) return ''
  return `<defs data-ts-key="gradients">${scene.gradients
    .map((gradient) => {
      const id = escapeAttribute(gradient.id)
      return `<linearGradient data-ts-key="gradient:${id}" id="${scopedId(idPrefix, id)}" x1="${percent(gradient.x1 ?? 0)}" y1="${percent(gradient.y1 ?? 1)}" x2="${percent(gradient.x2 ?? 0)}" y2="${percent(gradient.y2 ?? 0)}">${gradient.stops
        .map(
          (stop, index) =>
            `<stop data-ts-key="gradient:${id}:stop:${index}" offset="${percent(stop.offset)}" stop-color="${escapeAttribute(stop.color)}"${stop.opacity === undefined ? '' : ` stop-opacity="${number(stop.opacity)}"`}/>`,
        )
        .join('')}</linearGradient>`
    })
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
