import { createElement, forwardRef, useImperativeHandle, useRef } from 'react'
import Example, { createExampleChart } from './example'
import { dashboardTableRows, filterDashboardData } from './data'
import { reactMount } from '../../shared/react-mount'
import { tanstackExampleMount } from '../../shared/mount'
import type { ConformanceTestDriver } from '../../types'
import type { ReactConformanceProps } from '../../shared/react-mount'

export * from './example'

const ConformanceExample = forwardRef<
  ConformanceTestDriver,
  ReactConformanceProps
>(function ConformanceExample({ input }, ref) {
  const rootRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => ({
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const value = target.anchor.startsWith('range:')
        ? target.anchor.slice('range:'.length)
        : null
      const element = rootRef.current?.querySelector<HTMLElement>(
        `[data-range-value="${value}"]`,
      )
      if (!element) return null
      const bounds = element.getBoundingClientRect()
      return {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
        focusElement: element,
      }
    },
    readState() {
      const range =
        rootRef.current?.querySelector<HTMLElement>('.shadcn-dashboard')
          ?.dataset.range ?? '90d'
      return {
        range,
        chartRows: filterDashboardData(range as '90d' | '30d' | '7d').length,
        tableRows: dashboardTableRows.length,
      }
    },
    viewBounds(view) {
      if (view && view !== 'main') return null
      const bounds = rootRef.current
        ?.querySelector<HTMLElement>('.shadcn-dashboard')
        ?.getBoundingClientRect()
      return bounds
        ? {
            x: bounds.left,
            y: bounds.top,
            width: bounds.width,
            height: bounds.height,
          }
        : null
    },
  }))
  return createElement(
    'div',
    { ref: rootRef },
    createElement(Example, { width: input.width, height: input.height }),
  )
})

export const mount = reactMount(ConformanceExample)
export const catalogCase = tanstackExampleMount(
  () => createExampleChart(filterDashboardData('90d'), 288),
  'Total visitors for the last three months',
  { margin: true },
)
