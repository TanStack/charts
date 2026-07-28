# Responsive design, themes, and accessibility

> Archived experiment documentation. Use `packages/charts-core/docs` for the
> current D3-native product.

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
chart: ({ prepared, width }) => ({
  marks: [lineY(prepared)],
  x: { ticks: width < 420 ? 4 : 8 },
  y: { label: width < 480 ? undefined : 'Weekly downloads' },
})
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
