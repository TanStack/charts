import * as React from 'react'
import { resolveChartAdapterLayout } from '@tanstack/charts'
import type { ReactConformanceComponent } from '../../../benchmarks/conformance/shared/react-mount'
import type { CatalogChartProps } from './index'

export function createCatalogView(
  Component: ReactConformanceComponent,
): React.ComponentType<CatalogChartProps> {
  function CatalogView({
    initialWidth = 640,
    width,
    height,
    aspectRatio,
    revision = 0,
    interactive = false,
    preview = false,
    idPrefix,
  }: CatalogChartProps) {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [measuredWidth, setMeasuredWidth] = React.useState<
      number | undefined
    >()
    const resolvedWidth = width ?? measuredWidth ?? initialWidth
    const layout = resolveChartAdapterLayout({
      aspectRatio,
      height,
      width: resolvedWidth,
    })
    const cssAspectRatio =
      height === undefined && layout.aspectRatio !== undefined
        ? String(layout.aspectRatio)
        : undefined
    const input = React.useMemo(
      () => ({
        width: resolvedWidth,
        height: layout.initialHeight,
        revision,
        interactive,
        preview,
      }),
      [interactive, layout.initialHeight, preview, resolvedWidth, revision],
    )

    React.useLayoutEffect(() => {
      if (width !== undefined) return
      const container = containerRef.current
      if (!container) return
      const measure = () => {
        const nextWidth = container.getBoundingClientRect().width
        if (!Number.isFinite(nextWidth) || nextWidth <= 0) return
        setMeasuredWidth((currentWidth) =>
          currentWidth === nextWidth ? currentWidth : nextWidth,
        )
      }

      measure()
      const ResizeObserverConstructor =
        container.ownerDocument.defaultView?.ResizeObserver
      if (!ResizeObserverConstructor) return
      const observer = new ResizeObserverConstructor(measure)
      observer.observe(container)
      return () => observer.disconnect()
    }, [width])

    return (
      <div
        ref={containerRef}
        style={{
          width: width === undefined ? '100%' : width,
          height,
          aspectRatio: cssAspectRatio,
          contain: cssAspectRatio === undefined ? undefined : 'size',
        }}
      >
        <Component input={input} idPrefix={idPrefix} />
      </div>
    )
  }

  return CatalogView
}
