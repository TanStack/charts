---
title: Dynamic Data and Animation
description: Recreate memoized definitions when application values change and animate keyed geometry safely.
---

Definition identity is the application update boundary. A framework memo
captures the current data and options; Charts rebuilds the scene when that
definition changes or when the chart surface changes size.

## React

```tsx
function RankingChart({ rows, metric, accent }: Props) {
  const definition = useMemo(() => {
    const ranked = rankRows(rows, metric)

    return defineChart({
      animate: { duration: 280, easing: 'ease-out' },
      chart: ({ width }) => ({
        marks: [
          barX(ranked, {
            x: 'value',
            y: 'label',
            key: 'id',
            fill: accent,
          }),
        ],
        x: {
          scale: scaleLinear,
          nice: true,
          ticks: width < 420 ? 4 : 7,
        },
        y: {
          scale: () => scaleBand<string>().padding(0.1),
        },
      }),
    })
  }, [rows, metric, accent])

  return <Chart definition={definition} ariaLabel="Revenue ranking" />
}
```

Use the framework's native equivalent: `computed`, `createMemo`, `$derived`,
Angular `computed`, or Octane `useMemo`.

## Vanilla

```ts
host.update({
  ...options,
  definition: createRankingDefinition(nextRows, nextMetric, nextAccent),
})
```

## Stable keys

Built-in marks first use an explicit `key`, then a unique `datum.id`. Bars,
lines, areas, and cells can also infer identity from their semantic positional
channels:

```ts
barX(rows, {
  x: 'value',
  y: 'label',
})
```

Here `barX` uses the unique `y` value when rows have no `id`. `barY` uses `x`;
`lineY` and `areaY` use `x`; `areaX` uses `y`; rects and cells use their x/y
interval tuple. Inference is scoped to each group and falls back to array
position when a candidate is incomplete or duplicated. Development builds
warn once for each affected mark.

Supply `key` when the inferred value is not the entity's identity or can
change independently of it. Stable identity preserves surviving SVG elements,
focused points, and transition continuity.

## Animation

`animate` accepts `true` or:

- `duration`: milliseconds;
- `easing`: `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, or a
  function from normalized progress to normalized progress;
- `respectReducedMotion`: defaults to `true`;
- `resize`: defaults to `false`, so responsive relayout does not repeatedly
  restart animation.

Numeric geometry and compatible path data interpolate. Entering and exiting
nodes reconcile by key. If an update interrupts a transition, it begins from
the geometry currently painted on screen.

Static SVG, server rendering, and `createChartScene` do not include animation.

## Streaming

For high-rate data:

1. Keep source history outside the chart if the product needs it.
2. Capture a bounded visible window or encoded representation.
3. Preserve keys for rows that survive the roll.
4. Keep viewport state controlled.
5. Coalesce upstream work when only the latest state matters.

The final definition passed to `host.update` is applied synchronously.
