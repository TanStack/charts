# Custom marks

Built-in marks use the same protocol available to application code.

```ts
import { createMark } from '@tanstack/charts'

const threshold = createMark<never, never, number>(() => ({
  id: 'threshold',
  channels: {
    y: {
      scale: 'y',
      values: [target],
    },
  },
  render: ({ chart, scales, theme }) => ({
    nodes: [
      {
        kind: 'rule',
        key: `target:${target}`,
        x1: chart.x,
        x2: chart.x + chart.width,
        y1: scales.y.map(target),
        y2: scales.y.map(target),
        style: {
          stroke: theme.foreground,
          strokeOpacity: 0.55,
        },
      },
    ],
  }),
}))
```

The generic parameters are the interactive datum, x value, and y value.
`never` is correct above because the rule emits no interactive points; its y
channel still constrains the chart to a numeric y scale. An interactive custom
mark over time-series rows would start with
`createMark<Row, Date, number>(...)` and return each original `Row` in its
`ChartPoint`.

## Protocol

`initialize` materializes channels once for a scene build. Every channel may
contribute values to a named scale. Set `includeZero` when a positional channel
requires a zero baseline.

`render` receives chart bounds, resolved scales, theme tokens, the global color
resolver, and the mark index. It returns:

- keyed renderer-neutral scene nodes;
- optional `ChartPoint` metadata for focus, tooltip, and application callbacks.

Available scene nodes are `group`, `rule`, `polyline`, `area`, `dot`, `rect`,
and `label`.

## Extension rules

- Keys must be deterministic across reorder and update.
- Scene generation must not access the DOM.
- Preserve the original datum in every interactive point.
- Declare scale inputs in `channels`; do not infer a private positional domain
  during render.
- Use the global `color(value)` resolver for categorical consistency across
  marks.
- Keep specialized dependencies in the custom mark’s module. Importing a
  built-in line must not load the extension.
- Do not cast channel data or emitted points. If a custom protocol cannot
  express its true datum or positional values, record that API gap.

Pass callable, copyable D3-compatible scales through `x.scale`, `y.scale`, and
`color.scale`. `ChartScale` and `ChartColorScale` remain for context-aware
adapters that need resolved range or theme context; ordinary scales should stay
as raw D3 callables. Color guides implement `ChartColorLegend`, and renderers
consume `ChartScene` directly. Use a custom mark for visuals that fit the
cartesian x/y contract, and keep specialized layouts in explicit modules rather
than patching scene internals.
