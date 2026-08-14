import { forwardRef, useMemo } from 'react'
import { defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react/core'
import { createStackedCursorRenderer, stackedCursorDefinition } from './example'
import { stackedCursorRowsForRevision } from './model'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

const StackedCursorCatalogView = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function StackedCursorCatalogView({ input, idPrefix }, _ref) {
  const renderer = useMemo(createStackedCursorRenderer, [])
  const definition = useMemo(
    () =>
      defineChart(
        stackedCursorDefinition(stackedCursorRowsForRevision(input.revision)),
        {
          svgAnimation: false,
          ...(input.interactive ? {} : { focus: false }),
          keyboard: input.interactive,
          tooltip: false,
        },
      ),
    [input.interactive, input.revision],
  )
  const ariaLabel = 'Crimean War deaths with x band and y rule cursors'
  const ariaDescription =
    'Move over a stacked bar. The x cursor highlights the full stack and the dotted y cursor marks the focused segment endpoint.'

  if (input.preview) {
    return (
      <Chart
        idPrefix={idPrefix}
        definition={definition}
        renderer={renderer}
        initialWidth={input.width}
        aspectRatio={input.width / input.height}
        ariaLabel={ariaLabel}
        ariaDescription={ariaDescription}
      />
    )
  }

  return (
    <div
      data-conformance-view="main"
      style={{ width: input.width, height: input.height }}
    >
      <Chart
        idPrefix={idPrefix}
        definition={definition}
        renderer={renderer}
        width={input.width}
        height={input.height}
        ariaLabel={ariaLabel}
        ariaDescription={ariaDescription}
      />
    </div>
  )
})

export const catalogComponent = StackedCursorCatalogView
