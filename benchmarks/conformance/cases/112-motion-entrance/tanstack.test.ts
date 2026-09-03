import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartRuntime } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { readChartMotionState, settleChartMotion } from '../../shared/motion'
import { entranceRows } from './model'
import { motionEntranceDefinition } from './tanstack'
import type { ChartSpecDatum } from '@tanstack/charts'
import type { MotionRow } from './model'

const settings = {
  duration: 1_100,
  staggerMs: 55,
  easing: undefined,
  customTiming: true,
} as const

describe('declarative entrance motion', () => {
  it('keeps ordinary geometry and all timing policy in the definition', () => {
    const definition = motionEntranceDefinition(settings)
    const scene = createChartRuntime<MotionRow, string, number>().render(
      definition,
      { width: 640, height: 400 },
    )
    type Datum = ChartSpecDatum<ReturnType<typeof motionEntranceDefinition>>

    expectTypeOf<Datum>().toEqualTypeOf<MotionRow>()
    expect(scene.points).toHaveLength(entranceRows.length * 2)
    for (const row of entranceRows) {
      expect(scene.points.filter(({ datum }) => datum === row)).toHaveLength(2)
    }
    expect(definition.motion).toEqual({
      transition: { type: 'tween', duration: 1_100, easing: undefined },
    })
    expect(definition.marks[0]?.motion).toBeTypeOf('function')
    expect(definition.marks[1]?.motion).toEqual({
      delay: 110,
      transition: { type: 'tween', duration: 858 },
    })
  })

  it('leaves only replay controls and renderer observation outside the definition', () => {
    const shellSource = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/112-motion-entrance/view.tsx',
      ),
      'utf8',
    )
    const definitionSource = readFileSync(
      resolve(
        process.cwd(),
        'benchmarks/conformance/cases/112-motion-entrance/example.tsx',
      ),
      'utf8',
    )

    expect(shellSource).toContain("from './example'")
    expect(shellSource).toContain("from '../../shared/motion'")
    expect(shellSource).toContain(
      '<ControlButton ref={replayRef} onClick={replay}>',
    )
    expect(shellSource).toContain('settleChartMotion(viewRef.current')
    expect(definitionSource).toContain('defineChart({')
    expect(definitionSource).toContain('motion: {')
    expect(definitionSource).toContain('barY(rows, {')
    expect(definitionSource).toContain('lineY(rows, {')
    expect(definitionSource).toContain('context.datumIndex * staggerMs')
    expect(definitionSource).not.toContain('createMark')
    expect(definitionSource).not.toContain('SceneNode')
    expect(definitionSource).not.toContain('requestAnimationFrame')
    expect(definitionSource).not.toContain('querySelector')
    expect(definitionSource).not.toContain('document.')
  })

  it('shares the renderer-state read and settle contract', async () => {
    const root = document.createElement('div')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add('ts-chart')
    root.append(svg)

    expect(readChartMotionState(root)).toBeNull()
    await expect(settleChartMotion(root, 1_000)).resolves.toBeUndefined()

    svg.setAttribute('data-ts-motion-state', 'running')
    expect(readChartMotionState(root)).toBe('running')

    let nextFrame: FrameRequestCallback | undefined
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        nextFrame = callback
        return 1
      })
    let settled = false
    const pending = settleChartMotion(root, 1_000).then(() => {
      settled = true
    })

    await Promise.resolve()
    expect(settled).toBe(false)
    expect(nextFrame).toBeTypeOf('function')

    svg.setAttribute('data-ts-motion-state', 'finished')
    nextFrame?.(window.performance.now())
    await pending

    expect(settled).toBe(true)
    expect(readChartMotionState(root)).toBe('finished')
    requestFrame.mockRestore()

    svg.setAttribute('data-ts-motion-state', 'running')
    const clock = vi
      .spyOn(window.performance, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValue(1_001)
    const unusedFrame = vi.spyOn(window, 'requestAnimationFrame')

    await expect(settleChartMotion(root, 1_000)).resolves.toBeUndefined()
    expect(unusedFrame).not.toHaveBeenCalled()
    clock.mockRestore()
    unusedFrame.mockRestore()
  })
})
