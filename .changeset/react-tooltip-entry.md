---
'@tanstack/react-charts': minor
---

Move React tooltip-body composition to `@tanstack/react-charts/tooltip`.
Consumers using `renderTooltipBody` must migrate root `Chart` to `Chart`,
`/canvas` `Chart` to `CanvasChart`, and `/core` `Chart` to `RendererChart` from
that entry. Move wrapper types to the matching `ChartProps`, `CanvasChartProps`,
or `RendererChartProps` names and their `CommonProps` counterparts.
