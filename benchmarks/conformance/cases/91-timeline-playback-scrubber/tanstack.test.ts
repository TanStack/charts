import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createChartScene } from '@tanstack/charts'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { initialPlaybackIndex, selectPlaybackRows } from './model'
import { aapl } from '@charts-poc/demo-data/aapl'
import { mount, playbackDefinition } from './tanstack'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type { ChartDefinition, ChartSpecDatum } from '@tanstack/charts'
import type { ConformanceInput } from '../../types'

const input = {
  width: 640,
  height: 360,
  revision: 0,
} satisfies ConformanceInput
const rows = selectPlaybackRows(aapl)
const initialFrame = rows[initialPlaybackIndex]!.Date

describe('definition-owned playback handle', () => {
  it('keeps raw observations and the semantic playhead in one typed definition', () => {
    const definition = playbackDefinition(initialFrame, () => {})
    const scene = createChartScene(definition, {
      width: input.width,
      height: input.height,
    })
    type Datum = ChartSpecDatum<typeof definition>

    expectTypeOf<Datum>().toEqualTypeOf<AaplRow>()
    expectTypeOf(definition).toMatchTypeOf<
      ChartDefinition<AaplRow, Date, number>
    >()
    expect(definition.marks).toHaveLength(2)
    expect(scene.points).toHaveLength(rows.length)
    expect(
      scene.points.every(({ markId }) => markId === 'playback-points'),
    ).toBe(true)
    expect(scene.controls ?? []).toHaveLength(1)
    expect(scene.controls?.[0]).toMatchObject({ kind: 'handle-x' })
  })

  it('keeps playback timing in the application while handle changes stay semantic', () => {
    vi.useFakeTimers()
    try {
      const container = document.createElement('div')
      document.body.append(container)
      const handle = mount(container, input)
      const driver = handle.driver
      const surface = container.querySelector<SVGElement>(
        '[data-chart-handle-surface]',
      )
      const play = container.querySelector<HTMLButtonElement>(
        'button[aria-label="Play timeline"]',
      )
      if (!driver || !surface || !play) {
        throw new Error('Expected a mounted playback handle and controls')
      }

      expect(driver.readState()).toMatchObject({
        playhead: { index: 2, date: '2018-01-04' },
        interaction: { dragging: false, scrubCount: 0, playing: false },
      })

      surface.focus()
      surface.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'End',
          bubbles: true,
          cancelable: true,
        }),
      )
      expect(driver.readState()).toMatchObject({
        playhead: { index: 7, date: '2018-01-11' },
        interaction: { scrubCount: 1, playing: false },
      })
      expect(document.activeElement).toBe(surface)

      play.click()
      expect(driver.readState()).toMatchObject({
        playhead: { index: 0, date: '2018-01-02' },
        interaction: { playing: true },
      })
      vi.advanceTimersByTime(700)
      expect(driver.readState()).toMatchObject({
        playhead: { index: 1, date: '2018-01-03' },
        interaction: { playing: true },
      })
      play.click()
      expect(driver.readState()).toMatchObject({
        interaction: { playing: false },
      })

      handle.update({ ...input, revision: 1 })
      expect(driver.readState()).toMatchObject({
        playhead: { index: 1, date: '2018-01-03' },
      })

      handle.destroy()
      expect(container.childElementCount).toBe(0)
      container.remove()
    } finally {
      vi.useRealTimers()
    }
  })

  it('contains no case-owned handle layout, scale mapping, or gesture lifecycle', () => {
    const directory = resolve(
      process.cwd(),
      'benchmarks/conformance/cases/91-timeline-playback-scrubber',
    )
    const source = readFileSync(resolve(directory, 'tanstack.ts'), 'utf8')

    expect(existsSync(resolve(directory, 'overlay.ts'))).toBe(true)
    for (const forbidden of [
      "from './overlay'",
      'createPlaybackOverlay',
      'playbackLayout',
      'nearestFrameIndex',
      'setPointerCapture',
      'releasePointerCapture',
      "addEventListener('pointerdown'",
      "addEventListener('pointermove'",
      "addEventListener('pointerup'",
      "addEventListener('pointercancel'",
      'createElementNS',
    ]) {
      expect(source).not.toContain(forbidden)
    }
    expect(source).toContain("from '@tanstack/charts/interaction/handle'")
    expect(source).toContain('handleX({')
    expect(source).toContain('controlledSignal<')
    expect(source).toContain('(next, { reason }) => onChange(next, reason)')
    expect(source).toContain('setInterval(')
  })
})
