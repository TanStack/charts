import type { RenderChartSvgOptions, SceneGroup, SceneNode } from './types'

export type SvgRenderChildren = (
  group: SceneGroup,
) => readonly SceneNode[] | undefined

const childrenByOptions = new WeakMap<
  RenderChartSvgOptions,
  SvgRenderChildren
>()

export function svgRenderChildren(options: RenderChartSvgOptions) {
  return childrenByOptions.get(options)
}

/** Keep renderer-local presentation out of the public scene and options. */
export function withSvgRenderChildren<T>(
  options: RenderChartSvgOptions,
  children: SvgRenderChildren,
  render: () => T,
): T {
  const previous = childrenByOptions.get(options)
  childrenByOptions.set(options, children)
  try {
    return render()
  } finally {
    if (previous) childrenByOptions.set(options, previous)
    else childrenByOptions.delete(options)
  }
}
