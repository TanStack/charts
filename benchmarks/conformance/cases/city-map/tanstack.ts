import { createElement, forwardRef, useImperativeHandle, useRef } from 'react'
import Example, { createExampleChart, exampleAriaLabel } from './example'
import { reactMount } from '../../shared/react-mount'
import { tanstackExampleMount } from '../../shared/mount'
import type { ReactConformanceProps } from '../../shared/react-mount'
import type { ConformanceTestDriver } from '../../types'

export * from './example'

const ConformanceExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function ConformanceExample({ input }, ref) {
  const root = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => ({
    resolveTarget(target) {
      const selector =
        target.anchor === 'top-view'
          ? '.atlas-city-perspective-button:nth-of-type(2)'
          : target.anchor === 'isometric-view'
            ? '.atlas-city-perspective-button:nth-of-type(1)'
            : target.anchor === 'controls'
              ? '.atlas-city-camera-button--visibility'
              : null
      const element = selector
        ? root.current?.querySelector<HTMLElement>(selector)
        : null
      if (!element) return null
      const box = element.getBoundingClientRect()
      return {
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
        focusElement: element,
      }
    },
    readState() {
      const buttons = root.current?.querySelectorAll(
        '.atlas-city-perspective-button',
      )
      return {
        view:
          buttons?.[1]?.getAttribute('aria-pressed') === 'true' ? 'top' : 'iso',
        canvasCount: root.current?.querySelectorAll('canvas').length ?? 0,
        controlsVisible:
          root.current?.querySelector<HTMLElement>('.atlas-city-scene-controls')
            ?.dataset.controlsVisible === 'true',
      }
    },
  }))
  return createElement(
    'div',
    { ref: root, 'data-conformance-view': 'main' },
    createElement(Example, {
      width: input.width,
      height: input.height,
      revision: input.revision,
    }),
  )
})

export const mount = reactMount(ConformanceExample)
// The existing SVG scene is the compact semantic top view, as with other
// application examples that provide a definition-only catalog preview.
export const catalogCase = tanstackExampleMount(
  createExampleChart,
  exampleAriaLabel,
)
