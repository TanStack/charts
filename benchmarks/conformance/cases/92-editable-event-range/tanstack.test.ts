import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { act } from 'react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { editableDateKey, editableEventEndValues } from './model'
import { editableEventDefinition, mount } from './tanstack'
import { initialEditableEventEnd } from './scenario'
import type { ChartDefinition } from '@tanstack/charts'
import type { EditableEvent } from './scenario'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 360,
  revision: 0,
} satisfies ConformanceInput

describe('definition-owned editable event handle', () => {
  it('keeps the event marks and constrained handle in one typed definition', () => {
    const definition = editableEventDefinition(
      { ...input, end: initialEditableEventEnd },
      () => {},
    )
    type Datum =
      typeof definition extends ChartDefinition<
        infer TDatum,
        Date | number,
        string
      >
        ? TDatum
        : never
    const scene = createChartRuntime<Datum, Date | number, string>().render(
      definition,
      input,
    )

    expectTypeOf<Datum>().toMatchTypeOf<EditableEvent>()
    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<Datum, Date | number, string>
    >()
    expect(scene.controls ?? []).toHaveLength(1)
    expect(scene.controls?.[0]).toMatchObject({
      kind: 'handle-x',
      id: 'release-end',
      cross: scene.scales.y.map('Engineering'),
      ruleStyle: false,
    })
    expect(editableDateKey(editableEventEndValues[0]!)).toBe('2025-02-04')
    expect(editableDateKey(editableEventEndValues.at(-1)!)).toBe('2025-03-01')
  })

  it('uses the first-party handle while date validation stays application-owned', () => {
    const container = document.createElement('div')
    document.body.append(container)
    let mounted!: ReturnType<typeof mount>
    act(() => {
      mounted = mount(container, input)
    })
    const driver = mounted.driver
    const handle = container.querySelector<SVGElement>(
      '[data-chart-handle-surface="release-end"]',
    )
    const dateInput = container.querySelector<HTMLInputElement>(
      '.ts-conformance-event-date',
    )
    if (!driver || !handle || !dateInput) {
      throw new Error('Expected an editable handle and date input')
    }

    expect(driver.readState()).toMatchObject({
      editor: {
        end: '2025-02-12',
        durationDays: 9,
        editing: false,
        editCount: 0,
      },
    })

    handle.focus()
    act(() => {
      handle.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    expect(driver.readState()).toMatchObject({
      editor: {
        end: '2025-02-13',
        durationDays: 10,
        editing: false,
        editCount: 1,
      },
    })
    expect(document.activeElement).toBe(handle)

    dateInput.focus()
    dateInput.value = ''
    act(() => {
      dateInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(dateInput.getAttribute('aria-invalid')).toBe('true')
    expect(driver.readState()).toMatchObject({
      editor: { end: '2025-02-13', editCount: 1 },
    })

    act(() => {
      mounted.destroy()
    })
    expect(container.childElementCount).toBe(0)
    container.remove()
  })

  it('contains no TanStack-owned overlay, scale-to-DOM mapping, or gesture lifecycle', () => {
    const directory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/92-editable-event-range',
    )
    const source = readFileSync(resolve(directory, 'tanstack.ts'), 'utf8')
    const view = readFileSync(resolve(directory, 'view.tsx'), 'utf8')

    expect(existsSync(resolve(directory, 'overlay.ts'))).toBe(true)
    expect(existsSync(resolve(directory, 'controls.ts'))).toBe(false)
    for (const forbidden of [
      "from './overlay'",
      'createEditableHandleOverlay',
      'editableLayout',
      'sceneLocalPoint',
      'setPointerCapture',
      'releasePointerCapture',
      "addEventListener('pointerdown'",
      "addEventListener('pointermove'",
      "addEventListener('pointerup'",
      'createElementNS',
      "type = 'range'",
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).toContain("from '@tanstack/charts/interaction/handle'")
    expect(source).toContain('handleX<Date, string>({')
    expect(source).toContain('controlledSignal<')
    expect(source).toContain('(next, { reason }) => onEndChange(next, reason)')
    expect(view).toContain("from '@tanstack/charts/react'")
    expect(view).toContain('className="ts-conformance-event-date"')
  })
})
