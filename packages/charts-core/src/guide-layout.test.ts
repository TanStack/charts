import { describe, expect, it, vi } from 'vitest'
import {
  estimateSceneText,
  measureSceneLabelBounds,
  resolveGuideMargins,
} from './guide-layout'
import type { ChartTextMeasurer, SceneGroup, SceneLabel } from './types'

const fixedText: ChartTextMeasurer = (_text, options) => ({
  x: options.anchor === 'middle' ? -20 : options.anchor === 'end' ? -40 : 0,
  y:
    options.baseline === 'middle'
      ? -5
      : options.baseline === 'hanging'
        ? 0
        : -8,
  width: 40,
  height: 10,
})

describe('guide layout', () => {
  it('estimates text deterministically from its typography', () => {
    const regular = estimateSceneText('Margin 100', {
      fontSize: 10,
      fontWeight: 400,
      anchor: 'start',
      baseline: 'auto',
    })
    const repeated = estimateSceneText('Margin 100', {
      fontSize: 10,
      fontWeight: 400,
      anchor: 'start',
      baseline: 'auto',
    })
    const large = estimateSceneText('Margin 100', {
      fontSize: 20,
      fontWeight: 400,
      anchor: 'start',
      baseline: 'auto',
    })
    const bold = estimateSceneText('Margin 100', {
      fontSize: 10,
      fontWeight: 700,
      anchor: 'start',
      baseline: 'auto',
    })

    expect(repeated).toEqual(regular)
    expect(large.width).toBeCloseTo(regular.width * 2)
    expect(large.height).toBe(regular.height * 2)
    expect(bold.width).toBeGreaterThan(regular.width)
  })

  it('accounts for anchors and dominant baselines', () => {
    expect(
      measureSceneLabelBounds(label({ anchor: 'start' }), fixedText),
    ).toEqual({
      x: 100,
      y: 42,
      width: 40,
      height: 10,
    })
    expect(
      measureSceneLabelBounds(
        label({ anchor: 'middle', baseline: 'middle' }),
        fixedText,
      ),
    ).toEqual({
      x: 80,
      y: 45,
      width: 40,
      height: 10,
    })
    expect(
      measureSceneLabelBounds(
        label({ anchor: 'end', baseline: 'hanging' }),
        fixedText,
      ),
    ).toEqual({
      x: 60,
      y: 50,
      width: 40,
      height: 10,
    })
  })

  it('rotates the measured rectangle around the label position', () => {
    const bounds = measureSceneLabelBounds(
      label({
        anchor: 'start',
        baseline: 'hanging',
        rotate: 90,
      }),
      fixedText,
    )

    expect(bounds.x).toBeCloseTo(90)
    expect(bounds.y).toBeCloseTo(50)
    expect(bounds.width).toBeCloseTo(10)
    expect(bounds.height).toBeCloseTo(40)
  })

  it('traverses translated axis groups and resolves every outer side', () => {
    const measureText = vi.fn(fixedText)
    const axes: SceneGroup = {
      kind: 'group',
      key: 'axes',
      children: [
        label({
          key: 'y-tick',
          x: 42,
          y: 60,
          anchor: 'end',
          baseline: 'middle',
        }),
        {
          kind: 'group',
          key: 'translated-axis',
          translateX: 2,
          translateY: 3,
          children: [
            label({
              key: 'x-tick',
              x: 148,
              y: 112,
              anchor: 'middle',
            }),
          ],
        },
        label({
          key: 'top-title',
          x: 100,
          y: 16,
          anchor: 'middle',
        }),
        {
          kind: 'rule',
          key: 'ignored-rule',
          x1: -1_000,
          x2: 1_000,
          y1: -1_000,
          y2: 1_000,
        },
      ],
    }

    expect(
      resolveGuideMargins(
        axes,
        { x: 50, y: 20, width: 100, height: 80 },
        { measureText, inset: 4 },
      ),
    ).toEqual({
      top: 16,
      right: 24,
      bottom: 21,
      left: 52,
    })
    expect(measureText).toHaveBeenCalledWith('label', {
      fontSize: 11,
      fontWeight: 600,
      anchor: 'end',
      baseline: 'middle',
    })
    expect(measureText).toHaveBeenCalledTimes(3)
  })

  it('includes rotated endpoint labels on both adjacent sides', () => {
    const axes: SceneGroup = {
      kind: 'group',
      key: 'axes',
      children: [
        label({
          x: 150,
          y: 110,
          anchor: 'start',
          baseline: 'hanging',
          rotate: 45,
        }),
      ],
    }

    const margin = resolveGuideMargins(
      axes,
      { x: 50, y: 20, width: 100, height: 80 },
      { measureText: fixedText, inset: 4 },
    )

    expect(margin.left).toBeCloseTo(4)
    expect(margin.bottom).toBeCloseTo(49.355, 3)
    expect(margin.right).toBeCloseTo(32.284, 3)
  })

  it('returns only the outer inset when no labels need space', () => {
    const axes: SceneGroup = {
      kind: 'group',
      key: 'axes',
      children: [],
    }

    expect(
      resolveGuideMargins(
        axes,
        { x: 20, y: 20, width: 100, height: 80 },
        { inset: 3 },
      ),
    ).toEqual({
      top: 3,
      right: 3,
      bottom: 3,
      left: 3,
    })
  })
})

function label(overrides: Partial<SceneLabel> = {}): SceneLabel {
  return {
    kind: 'label',
    key: 'label',
    x: 100,
    y: 50,
    text: 'label',
    fontSize: 11,
    fontWeight: 600,
    ...overrides,
  }
}
