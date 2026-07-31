# @tanstack/react-charts

## 0.1.0

### Minor Changes

- Move React tooltip-body composition to `@tanstack/react-charts/tooltip`.
  Consumers using `renderTooltipBody` must migrate root `Chart` to `Chart`,
  `/canvas` `Chart` to `CanvasChart`, and `/core` `Chart` to `RendererChart` from
  that entry. Move wrapper types to the matching `ChartProps`, `CanvasChartProps`,
  or `RendererChartProps` names and their `CommonProps` counterparts.

### Patch Changes

- Updated dependencies [[`5d143d9`](https://github.com/TanStack/charts/commit/5d143d9c9ed7c2613f3e1b50a9d794ea3c9616b9)]:
  - @tanstack/charts@0.1.0

## 0.0.2

### Patch Changes

- Updated dependencies [[`5c36a38`](https://github.com/TanStack/charts/commit/5c36a3866d71ad94cbcc934272e2cd7a868065f3)]:
  - @tanstack/charts@0.0.2
