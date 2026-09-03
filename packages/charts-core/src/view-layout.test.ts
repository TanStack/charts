import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  fill,
  getViewLayoutMetadataInternal,
  grid,
  inset,
  layer,
  resolveViewLayoutInternal,
} from './view-layout'
import type {
  ViewLayout,
  ViewLayoutPlaced,
  ViewLayoutReferenced,
  ViewTrack,
} from './view-layout'

describe('view layout utilities', () => {
  it('retains placed and referenced view ids in its opaque type and metadata', () => {
    const layout = layer(
      grid({
        rows: [
          { id: 'top', size: 80 },
          { id: 'main', grow: 1 },
        ],
        columns: [{ id: 'main', grow: 1 }],
        cells: {
          top: { row: 'top', column: 'main' },
          main: { row: 'main', column: 'main' },
        },
      }),
      inset('summary', {
        relativeTo: 'main',
        anchor: 'top-right',
        width: 120,
        height: 90,
        offset: 8,
      }),
    )

    expectTypeOf(layout).toMatchTypeOf<
      ViewLayout<'top' | 'main' | 'summary', 'main'>
    >()
    expectTypeOf<ViewLayoutPlaced<typeof layout>>().toEqualTypeOf<
      'top' | 'main' | 'summary'
    >()
    expectTypeOf<ViewLayoutReferenced<typeof layout>>().toEqualTypeOf<'main'>()
    expect(getViewLayoutMetadataInternal(layout)).toEqual({
      placed: ['top', 'main', 'summary'],
      referenced: ['main'],
    })
  })

  it('resolves absolute grid frames and subsequent insets in paint order', () => {
    const layout = layer(
      grid({
        rows: [
          { id: 'top', size: 80 },
          { id: 'main', grow: 1 },
        ],
        columns: [
          { id: 'main', grow: 1 },
          { id: 'right', size: 100 },
        ],
        gap: 10,
        cells: {
          main: { row: 'main', column: 'main' },
          top: { row: 'top', column: 'main' },
          right: { row: 'main', column: 'right' },
        },
      }),
      inset('summary', {
        relativeTo: 'main',
        anchor: 'bottom-left',
        width: 120,
        height: 60,
        offset: 12,
      }),
    )

    expect(
      resolveViewLayoutInternal(layout, {
        x: 10,
        y: 20,
        width: 600,
        height: 400,
      }),
    ).toEqual([
      { id: 'main', x: 10, y: 110, width: 490, height: 310, order: 0 },
      { id: 'top', x: 10, y: 20, width: 490, height: 80, order: 1 },
      { id: 'right', x: 510, y: 110, width: 100, height: 310, order: 2 },
      { id: 'summary', x: 22, y: 348, width: 120, height: 60, order: 3 },
    ])
  })

  it('supports all nine inset anchors', () => {
    const anchors = {
      'top-left': [5, 5],
      top: [90, 5],
      'top-right': [175, 5],
      right: [175, 45],
      'bottom-right': [175, 85],
      bottom: [90, 85],
      'bottom-left': [5, 85],
      left: [5, 45],
      center: [90, 45],
    } as const

    Object.entries(anchors).forEach(([anchor, [x, y]]) => {
      const frames = resolveViewLayoutInternal(
        layer(
          fill('base'),
          inset(`inset-${anchor}`, {
            relativeTo: 'base',
            anchor: anchor as keyof typeof anchors,
            width: 20,
            height: 10,
            offset: 5,
          }),
        ),
        { x: 0, y: 0, width: 200, height: 100 },
      )
      expect(frames[1]).toMatchObject({ x, y, width: 20, height: 10 })
    })
  })

  it('shrinks inset size and offset proportionally inside its target', () => {
    const frames = resolveViewLayoutInternal(
      layer(
        fill('base'),
        inset('large', {
          relativeTo: 'base',
          anchor: 'top-right',
          width: 200,
          height: 100,
          offset: 10,
        }),
      ),
      { x: 0, y: 0, width: 100, height: 50 },
    )
    const resolved = frames[1]!

    expect(resolved.width).toBeCloseTo(250 / 3)
    expect(resolved.height).toBeCloseTo(125 / 3)
    expect(resolved.x).toBeCloseTo(12.5)
    expect(resolved.y).toBeCloseTo(25 / 6)
    expect(resolved.width / resolved.height).toBeCloseTo(2)
    expect(resolved.x + resolved.width).toBeLessThan(100)
    expect(resolved.y + resolved.height).toBeLessThan(50)
  })

  it('shrinks fixed and minimum tracks deterministically in narrow bounds', () => {
    const layout = grid({
      rows: [{ id: 'main', grow: 1 }],
      columns: [
        { id: 'fixed', size: 80 },
        { id: 'fluid', grow: 1, min: 40 },
      ],
      gap: 10,
      cells: {
        fixed: { row: 'main', column: 'fixed' },
        fluid: { row: 'main', column: 'fluid' },
      },
    })
    const frames = resolveViewLayoutInternal(layout, {
      x: 0,
      y: 0,
      width: 70,
      height: 30,
    })

    expect(frames[0]!.width).toBeCloseTo(40)
    expect(frames[1]!.x).toBeCloseTo(50)
    expect(frames[1]!.width).toBeCloseTo(20)
  })

  it('rejects invalid tracks, gaps, cells, dimensions, and opaque impostors', () => {
    expect(() => (layer as unknown as () => unknown)()).toThrow(
      /at least one layout/,
    )
    expect(() =>
      grid({
        rows: [{ id: 'main', grow: 1 }],
        columns: [{ id: 'main', grow: 1 }],
        cells: {} as never,
      }),
    ).toThrow(/at least one cell/)
    expect(() =>
      grid({
        rows: [{ id: 'main', grow: 1 }],
        columns: [{ id: 'main', grow: 1 }],
        cells: {
          first: { row: 'main', column: 'main' },
          second: { row: 'main', column: 'main' },
        },
      }),
    ).toThrow(/same grid cell/)
    expect(() =>
      grid({
        rows: [{ id: 'main', grow: 1 }],
        columns: [{ id: 'main', grow: 1 }],
        cells: { main: { row: 'main', column: 'main' } },
        gap: Number.NaN,
      }),
    ).toThrow(/gap must be nonnegative and finite/)
    expect(() =>
      grid({
        rows: [{ id: 'main', grow: 0 }],
        columns: [{ id: 'main', grow: 1 }],
        cells: { main: { row: 'main', column: 'main' } },
      }),
    ).toThrow(/grow must be positive and finite/)
    expect(() =>
      grid({
        rows: [{ id: 'main', grow: 1, min: 20, max: 10 }],
        columns: [{ id: 'main', grow: 1 }],
        cells: { main: { row: 'main', column: 'main' } },
      }),
    ).toThrow(/max must be at least min/)
    expect(() =>
      inset('summary', {
        relativeTo: 'main',
        anchor: 'center',
        width: Infinity,
        height: 20,
      }),
    ).toThrow(/width must be positive and finite/)
    expect(() =>
      inset('summary', {
        relativeTo: 'main',
        anchor: 'outside' as never,
        width: 20,
        height: 20,
      }),
    ).toThrow(/Unknown view inset anchor/)
    expect(() =>
      resolveViewLayoutInternal(fill('main'), {
        x: 0,
        y: 0,
        width: 0,
        height: 20,
      }),
    ).toThrow(/width must be positive and finite/)
    expect(() =>
      resolveViewLayoutInternal({} as ViewLayout<'main'>, {
        x: 0,
        y: 0,
        width: 20,
        height: 20,
      }),
    ).toThrow(/must be created with/)
  })

  it('rejects duplicate, unresolved, self-referential, and cyclic placements', () => {
    expect(() =>
      resolveViewLayoutInternal(layer(fill('main'), fill('main')), {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      }),
    ).toThrow(/places "main" more than once/)
    expect(() =>
      resolveViewLayoutInternal(
        layer(
          inset('a', {
            relativeTo: 'b',
            anchor: 'center',
            width: 20,
            height: 20,
          }),
          inset('b', {
            relativeTo: 'a',
            anchor: 'center',
            width: 20,
            height: 20,
          }),
        ),
        { x: 0, y: 0, width: 100, height: 100 },
      ),
    ).toThrow(/earlier resolved view.*cycle/)
    expect(() =>
      inset('same', {
        relativeTo: 'same',
        anchor: 'center',
        width: 20,
        height: 20,
      }),
    ).toThrow(/cannot reference itself/)
  })
})

if (false) {
  // @ts-expect-error A fixed track cannot also grow.
  const invalidTrack: ViewTrack = { id: 'main', size: 80, grow: 1 }
  void invalidTrack

  // @ts-expect-error Layer requires at least one child layout.
  layer()

  grid({
    // @ts-expect-error Grid requires a nonempty row tuple.
    rows: [],
    columns: [{ id: 'main', grow: 1 }],
    cells: { main: { row: 'main', column: 'main' } },
  })

  grid({
    rows: [{ id: 'main', grow: 1 }],
    columns: [{ id: 'main', grow: 1 }],
    cells: {
      // @ts-expect-error Grid cells must reference an authored row track.
      main: { row: 'missing', column: 'main' },
    },
  })
}
