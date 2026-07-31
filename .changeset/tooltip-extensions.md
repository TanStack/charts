---
'@tanstack/charts': minor
---

Make native tooltips and tooltip portals explicit extensions. Import `tooltip`
from `@tanstack/charts/tooltip`; replace `tooltip: true` with `tooltip`, dynamic
booleans with `enabled ? tooltip : false`, and configured objects with
`{ use: tooltip, ...options }`. Complete definition values use
`ChartTooltipInput`; `ChartTooltipOptions` remains the options-only type.

Import `portal` from `@tanstack/charts/tooltip/portal`; replace `portal: true`
with `portal`, omit `portal: false`, and replace dynamic booleans with
`enabled ? portal : undefined` inside the configured tooltip object.
