---
title: Legends and Color
description: Map categorical or quantitative values to color, render responsive legends, and preserve meaning across themes.
---

Color is a channel. The chart's `color` configuration defines its semantic
mapping, while most marks emit categorical values through `z`. `fill` and
`stroke` are literal or data-driven paint overrides; they are not field-name
lookups. Bars also expose a separate `color` channel when subgroup geometry and
paint need different fields.

## Automatic categorical color

When marks emit group values and no color scale is supplied, TanStack Charts
uses the chart theme palette. This is the convenient default for a small,
stable set of categories.

For persistent product semantics, supply an explicit configured D3 ordinal
scale:

```ts
import { scaleOrdinal } from 'd3-scale'
import { colorLegend, defineChart, lineY } from '@tanstack/charts'

const series = ['core', 'react', 'octane'] as const
const color = scaleOrdinal<string, string>()
  .domain(series)
  .range(['#2563eb', '#f97316', '#10b981'])

const definition = defineChart({
  marks: [
    lineY(rows, {
      x: 'date',
      y: 'value',
      z: 'series',
      key: 'id',
    }),
  ],
  x,
  y,
  color: {
    scale: color,
    legend: colorLegend({ label: 'Package' }),
  },
})
```

The application owns the domain order and paint assignment. This prevents a
category from changing color when data is filtered or reordered.

## Quantitative color

Supply a continuous D3 color scale for numeric values and use
`colorGradientLegend`:

```ts
import { scaleSequential } from 'd3-scale'
import { interpolateBlues } from 'd3-scale-chromatic'
import { colorGradientLegend } from '@tanstack/charts'

const color = {
  scale: () => scaleSequential(interpolateBlues),
  legend: colorGradientLegend({
    label: 'Requests per minute',
    format: (value) => value.toLocaleString(),
  }),
}
```

The factory keeps the interpolator and lets the chart infer the numeric domain
from color-channel values. Pass a configured scale instance when the color
domain is a product threshold or must remain stable across filtered data.

`d3-scale-chromatic` and its matching type package are optional direct
application dependencies. They are never pulled into charts that do not import
them. The [D3 integration page](../concepts/scales-and-d3.md) owns the install
and API-reference links.

## Categorical legend

`colorLegend` renders responsive swatches and labels. Options:

- `label`: optional legend title;
- `itemWidth`: minimum width used to decide column count.

The legend reserves its own layout height. It is visual guidance and is hidden
from the SVG accessibility tree; essential category meaning should also be
available through direct labels, surrounding HTML, or a table.

<iframe
  src="https://tanstack.com/charts/catalog/embed/bar-grouped/?theme=system&height=380"
  title="Grouped bars with a responsive categorical color legend"
  loading="lazy"
  style="width: 100%; height: 380px; border: 0;"
></iframe>

## Gradient legend

`colorGradientLegend` requires a numeric color-scale domain. Options:

- `label`: optional title;
- `steps`: rendered color samples, with a minimum of two;
- `width`: preferred width capped by the chart;
- `format`: formatter for the domain endpoints.

The legend communicates the supplied scale. It does not infer thresholds,
units, or a meaningful domain from data.

## Direct labels versus legends

Prefer direct labels when:

- there are only a few lines or regions;
- labels fit near endpoints;
- the reader would otherwise move repeatedly between marks and a legend.

Prefer a legend when:

- the same category appears in many places;
- marks are too dense for direct labels;
- a shared mapping spans several views.

It is valid to use both when the legend establishes the complete domain and
direct labels help with the primary comparison.

## Theme and accessibility rules

- Keep semantic category colors stable across updates.
- Test every supplied color against light and dark backgrounds.
- Use a sequential scale for ordered magnitude and a diverging scale only when
  a meaningful center exists.
- Do not imply order with an unordered rainbow palette.
- Do not use color as the only signal for selection, status, or error.
- Use `unknown` behavior on the D3 scale when unexpected categories must not
  silently join the domain.

See [Themes and Styling](./themes-and-styling.md) and
[Accessibility](./accessibility.md) for the surrounding policies.
