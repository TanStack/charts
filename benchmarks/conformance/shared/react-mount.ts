import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'
import type {
  ConformanceInput,
  ConformanceMount,
  ConformanceTestDriver,
} from '../types'

export interface ReactConformanceProps {
  input: ConformanceInput
  idPrefix?: string
}

export type ReactConformanceComponent = ForwardRefExoticComponent<
  ReactConformanceProps & RefAttributes<ConformanceTestDriver>
>

export function reactMount(
  Component: ReactConformanceComponent,
): ConformanceMount {
  return (container, input) => {
    const root = createRoot(container)
    let activeDriver: ConformanceTestDriver | null = null
    const driver = new Proxy({} as ConformanceTestDriver, {
      get(_target, property) {
        const value = activeDriver?.[property as keyof ConformanceTestDriver]
        return typeof value === 'function' ? value.bind(activeDriver) : value
      },
    })
    const render = (nextInput: ConformanceInput) => {
      flushSync(() => {
        root.render(
          createElement(Component, {
            input: nextInput,
            ref: (nextDriver: ConformanceTestDriver | null) => {
              activeDriver = nextDriver
            },
          }),
        )
      })
    }

    render(input)

    return {
      update: render,
      driver,
      destroy() {
        flushSync(() => {
          root.unmount()
        })
      },
    }
  }
}
