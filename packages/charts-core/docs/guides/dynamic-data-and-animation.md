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
    const maximum = Math.max(1, max(ranked, (row) => row.value) ?? 0)

    return defineChart(({ width }) => ({
      marks: [
        barX(ranked, {
          x: 'value',
          y: 'label',
          key: 'id',
          fill: accent,
        }),
      ],
      x: {
        scale: scaleLinear().domain([0, maximum]).nice(),
        ticks: width < 420 ? 4 : 7,
      },
      y: {
        scale: scaleBand<string>()
          .domain(ranked.map((row) => row.label))
          .padding(0.1),
      },
    }))
  }, [rows, metric, accent])

  return (
    <Chart
      definition={definition}
      ariaLabel="Revenue ranking"
      animate={{ duration: 280, easing: 'ease-out' }}
    />
  )
}
```

Use the framework's native equivalent: `computed`, `createMemo`, `$derived`,
Angular `computed`, or Octane `useMemo`.

## Vanilla

```ts
host.update({
  ...options,
  definition: createRankingDefinition(nextRows, nextMetric, nextAccent),
  animate: true,
})
```

## Stable keys

Keys identify the same visual entity across definitions:

```ts
barX(rows, {
  x: 'value',
  y: 'label',
  key: 'id',
})
```

Do not use array position for reorderable, filtered, or rolling data. Stable
keys preserve surviving SVG elements, focused points, and transition
continuity.

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
