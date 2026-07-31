---
title: Legends and Color
description: Map categorical or quantitative values to color, render responsive legends, and preserve meaning across themes.
---

Color has one semantic path. A mark's `color` channel contributes values to the
chart-level `color` scale and legend. `z` partitions series or interaction
groups and supplies the color value only when `color` is omitted. `fill` and
`stroke` are final paint overrides; using either bypasses scale mapping for
that paint.

## Automatic categorical color

When marks emit categorical color values and no color scale is supplied,
TanStack Charts uses the chart theme palette. This is the convenient default
for a small, stable set of categories.

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

Supply a D3 color-scale factory and put the numeric field on the mark's
`color` channel:

```ts
import { scaleSequential } from 'd3-scale'
import { interpolateBlues } from 'd3-scale-chromatic'
import { colorLegend } from '@tanstack/charts'

const color = {
  scale: () => scaleSequential(interpolateBlues),
  legend: colorLegend({
    label: 'Requests per minute',
    format: (value) => value.toLocaleString(),
  }),
}
```

The factory keeps the interpolator and lets the chart infer the numeric domain
from color-channel values. Continuous and quantize factories infer a finite
extent. Quantile factories receive the complete observed numeric population,
including duplicates. Threshold factories require an explicit domain because
their cuts are policy, not an extent:

```ts
import { scaleThreshold } from 'd3-scale'

const colors = ['#eff6ff', '#bfdbfe', '#60a5fa', '#1d4ed8']

const color = {
  scale: scaleThreshold<number, string>,
  domain: [5, 12, 24],
  range: colors,
  legend: colorLegend({ label: 'Incidents' }),
}
```

`d3-scale-chromatic` and its matching type package are optional direct
application dependencies. They are never pulled into charts that do not import
them. The [D3 integration page](../concepts/scales-and-d3.md) owns the install
and API-reference links.

## Automatic color legend

`colorLegend` reads the resolved scale:

- categorical scales render labeled swatches;
- continuous scales render a sampled ramp;
- quantize, quantile, and threshold scales render exact bins and boundaries.

Options:

- `label`: optional legend title;
- `itemWidth`: minimum categorical item width;
- `width`: preferred quantitative legend width;
- `format`: numeric boundary formatter.

The legend reserves its own layout height. It is visual guidance and is hidden
from the SVG accessibility tree; essential category meaning should also be
available through direct labels, surrounding HTML, or a table.

<iframe
  src="https://tanstack.com/charts/catalog/embed/bar-grouped/?theme=system&height=480"
  title="Grouped bars with a responsive categorical color legend"
  loading="lazy"
  style="width: 100%; height: 480px; border: 0;"
></iframe>

## Explicit gradient legend

`colorGradientLegend` requires a numeric color-scale domain. Options:

- `label`: optional title;
- `steps`: rendered color samples, with a minimum of two;
- `width`: preferred width capped by the chart;
- `format`: formatter for the domain endpoints.

Use `colorGradientLegend` only when a discrete scale should intentionally be
shown as a sampled ramp. It requires a numeric domain and does not invent
units or semantic thresholds.

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
