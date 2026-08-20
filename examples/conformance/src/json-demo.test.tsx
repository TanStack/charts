import * as React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { ChartJsonDemo } from './json-demo'

const mounted: Array<() => void> = []

afterEach(async () => {
  while (mounted.length) await act(async () => mounted.pop()?.())
  document.body.replaceChildren()
})

describe('Chart JSON workbench', () => {
  it('retains the last valid chart and exposes structured issues', async () => {
    const target = await mountDemo()
    const editor = target.querySelector<HTMLTextAreaElement>('textarea')
    expect(editor?.getAttribute('aria-invalid')).toBe('false')
    expect(target.querySelectorAll('g.ts-chart__bar-y > rect')).toHaveLength(3)
    expect(target.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Category totals',
    )

    await act(async () => {
      setNativeValue(editor!, '{')
      editor?.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => button(target, 'Apply').click())

    expect(editor?.getAttribute('aria-invalid')).toBe('true')
    expect(target.textContent).toContain('invalid-json')
    expect(target.textContent).toContain('/')
    expect(target.textContent).toContain('previous preview retained')
    expect(target.querySelectorAll('g.ts-chart__bar-y > rect')).toHaveLength(3)
    expect(button(target, 'Replace data').disabled).toBe(true)
  })

  it('rebuilds the same source with host-supplied replacement data', async () => {
    const target = await mountDemo()
    const initialGeometry = barGeometry(target)

    await act(async () => button(target, 'Replace data').click())

    expect(target.textContent).toContain('Applied · host data override 1')
    expect(barGeometry(target)).not.toEqual(initialGeometry)
    expect(target.querySelectorAll('[role="tab"], table')).toHaveLength(0)
  })

  it('loads a donut source that can be edited into a pie', async () => {
    const target = await mountDemo()
    const example = target.querySelector<HTMLSelectElement>(
      'select[aria-label="Example source"]',
    )
    const editor = target.querySelector<HTMLTextAreaElement>('textarea')

    await act(async () => {
      example!.value = 'donut'
      example?.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(example?.value).toBe('donut')
    expect(editor?.value).toContain('"$call": "tanstack.mark.pie"')
    expect(editor?.value).toContain('"innerRadiusRatio": 0.55')
    expect(target.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Category share',
    )
    expect(target.textContent).toContain(
      'Shares for Alpha, Beta, and Gamma. Set innerRadiusRatio to 0 for a pie.',
    )
    expect(target.querySelector('g.ts-chart__legend')?.textContent).toContain(
      'Category',
    )
    const donutGeometry = arcGeometry(target)
    expect(donutGeometry).toHaveLength(3)

    await act(async () => button(target, 'Replace data').click())
    expect(arcGeometry(target)).not.toEqual(donutGeometry)

    await act(async () => {
      setNativeValue(
        editor!,
        editor!.value.replace(
          '"innerRadiusRatio": 0.55',
          '"innerRadiusRatio": 0',
        ),
      )
      editor?.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const overriddenDonutGeometry = arcGeometry(target)
    await act(async () => button(target, 'Apply').click())

    expect(editor?.getAttribute('aria-invalid')).toBe('false')
    expect(arcGeometry(target)).not.toEqual(overriddenDonutGeometry)

    await act(async () => button(target, 'Reset').click())
    expect(example?.value).toBe('donut')
    expect(editor?.value).toContain('"innerRadiusRatio": 0.55')
    expect(target.textContent).toContain('Applied · bundled data')
  })

  it('layers a threshold, an event marker, and labels', async () => {
    const target = await mountDemo()
    const example = target.querySelector<HTMLSelectElement>(
      'select[aria-label="Example source"]',
    )
    const editor = target.querySelector<HTMLTextAreaElement>('textarea')

    await act(async () => {
      example!.value = 'annotations'
      example?.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(example?.value).toBe('annotations')
    expect(editor?.value).toContain('"$call": "tanstack.mark.rule-x"')
    expect(editor?.value).toContain('"$call": "tanstack.mark.rule-y"')
    expect(editor?.value).toContain('"$call": "tanstack.mark.text"')
    expect(target.querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Annotated signups',
    )

    const verticalRule = target.querySelector<SVGLineElement>(
      'g.ts-chart__rule-x line',
    )
    const horizontalRule = target.querySelector<SVGLineElement>(
      'g.ts-chart__rule-y line',
    )
    expect(verticalRule?.getAttribute('x1')).toBe(
      verticalRule?.getAttribute('x2'),
    )
    expect(verticalRule?.getAttribute('y1')).not.toBe(
      verticalRule?.getAttribute('y2'),
    )
    expect(horizontalRule?.getAttribute('x1')).not.toBe(
      horizontalRule?.getAttribute('x2'),
    )
    expect(horizontalRule?.getAttribute('y1')).toBe(
      horizontalRule?.getAttribute('y2'),
    )
    expect(annotationLabels(target)).toEqual(
      expect.arrayContaining(['Target 10', 'Launch']),
    )

    const initialLine = lineGeometry(target)
    await act(async () => button(target, 'Replace data').click())

    expect(target.textContent).toContain('Applied · host data override 1')
    expect(lineGeometry(target)).not.toBe(initialLine)
    expect(target.querySelectorAll('g.ts-chart__rule-x line')).toHaveLength(1)
    expect(target.querySelectorAll('g.ts-chart__rule-y line')).toHaveLength(1)
    expect(annotationLabels(target)).toEqual(
      expect.arrayContaining(['Target 10', 'Launch']),
    )
  })
})

async function mountDemo(): Promise<HTMLElement> {
  const target = document.createElement('div')
  document.body.append(target)
  const root = createRoot(target)
  mounted.push(() => root.unmount())
  await act(async () => root.render(<ChartJsonDemo />))
  return target
}

function barGeometry(container: HTMLElement): readonly (string | null)[] {
  return [
    ...container.querySelectorAll<SVGRectElement>('g.ts-chart__bar-y > rect'),
  ].flatMap((bar) => [bar.getAttribute('y'), bar.getAttribute('height')])
}

function arcGeometry(container: HTMLElement): readonly (string | null)[] {
  return [
    ...container.querySelectorAll<SVGPathElement>('g.ts-chart__arc path'),
  ].map((arc) => arc.getAttribute('d'))
}

function lineGeometry(container: HTMLElement): string | null | undefined {
  return container
    .querySelector<SVGPathElement>('g.ts-chart__line path')
    ?.getAttribute('d')
}

function annotationLabels(container: HTMLElement): readonly string[] {
  return [
    ...container.querySelectorAll<SVGTextElement>('g.ts-chart__text text'),
  ].map((label) => label.textContent ?? '')
}

function button(container: HTMLElement, name: string): HTMLButtonElement {
  const match = [
    ...container.querySelectorAll<HTMLButtonElement>('button'),
  ].find((entry) => entry.textContent?.trim() === name)
  if (!match) throw new Error(`Missing button ${JSON.stringify(name)}`)
  return match
}

function setNativeValue(element: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  )?.set
  setter?.call(element, value)
}
