# Responsive design, themes, and accessibility

## Container responsiveness

Omit `width` for the normal responsive path:

```tsx
<Chart
  definition={chart}
  height={320}
  initialWidth={640}
  ariaLabel="Weekly downloads"
/>
```

The host observes its container, coalesces resize notifications into one
animation frame, and redraws only after a non-zero width is available.
`initialWidth` is the deterministic server and hidden-container fallback.

Definitions receive `width` and `height`, so details can adapt to the chart
container rather than the viewport:

```ts
import { extent } from 'd3-array'
import { scaleLinear } from 'd3-scale'

chart: ({ prepared, width }) => {
  const [valueMin = 0, valueMax = 1] = extent(prepared)

  return {
    marks: [lineY(prepared)],
    x: {
      scale: scaleLinear().domain([0, Math.max(1, prepared.length - 1)]),
      ticks: width < 420 ? 4 : 8,
    },
    y: {
      scale: scaleLinear().domain([valueMin, valueMax]).nice(),
      label: width < 480 ? undefined : 'Weekly downloads',
    },
  }
}
```

Use fixed `width` only for export, email, print, or a deliberately fixed
graphic.

Use `aspectRatio` instead of `height` when the chart should grow
proportionally with its container:

```tsx
<Chart
  definition={chart}
  aspectRatio={16 / 9}
  initialWidth={640}
  ariaLabel="Weekly downloads"
/>
```

`initialWidth` determines the server-rendered width and proportional height.
The client adopts that SVG and then measures the real container.

## Automatic guide layout

Leave `margin` undefined unless a layout must reserve a specific amount of
space. TanStack Charts resolves ticks and titles, measures their anchored and
rotated bounds, and gives the rest of the surface to the plot. The solve starts
fresh after resize, data, formatting, rotation, or font changes, so margins can
shrink as well as grow.

```ts
const chart = defineChart({
  marks,
  x: {
    scale: xScale,
    label: 'Date',
    tickRotate: narrow ? -30 : undefined,
  },
  y: {
    scale: yScale,
    label: 'Weekly downloads',
    format: formatCompact,
  },
})
```

Omitted margin sides are automatic. `margin: { left: 72 }` locks the left side
while the other three remain automatic; `margin: 0` locks all four sides.
Resolved values are available as `scene.margin` and `scene.chart` for aligned
controls such as a timeline scrubber.

Containment and collision are different policies. Automatic margins keep
labels inside the surface. Use `ticks` and `tickRotate` when dense labels
should be thinned or rotated.

Server and static rendering use a deterministic text estimator. The DOM host
uses the container’s inherited font metrics and coalesces a correction after
web fonts load. `measureText` is the advanced inversion point for another
renderer or measurement system.

## Light and dark mode

The default theme inherits `currentColor`, uses system canvas colors for
tooltip chrome, and exposes the palette as CSS variables:

```css
.analytics {
  --ts-chart-1: #2563eb;
  --ts-chart-2: #f97316;
  --ts-chart-3: #10b981;
  --ts-chart-focus-fill: Canvas;
}

@media (prefers-color-scheme: dark) {
  .analytics {
    color: #fafafa;
    --ts-chart-1: #60a5fa;
    --ts-chart-2: #fb923c;
    --ts-chart-3: #34d399;
  }
}
```

Application-controlled themes can scope the same tokens under a class or data
attribute. A definition may also provide `theme` or `color.range` for a
specific visualization.

## Accessibility

- `ariaLabel` is required by every host adapter.
- Use `ariaDescription` for the comparison, time range, units, or other context
  not apparent from the label.
- The SVG uses `role="img"` and `aria-roledescription="chart"`.
- Keyboard navigation is enabled by default. Arrow keys move through points;
  Home and End jump to the first and last point.
- Pointer and keyboard focus share the same `onFocusChange` value.
- Click, Enter, and Space call `onSelect` with the same original datum.
- Tooltips use a polite status region.
- Set `keyboard={false}` only when an equivalent application-owned interaction
  is present.

For dense plots, provide an adjacent data table or textual summary. A chart
alone should not be the only way to retrieve critical values.
